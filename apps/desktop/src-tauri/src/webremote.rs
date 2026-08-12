use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::Duration;

use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{Html, IntoResponse},
    routing::{get, post},
    Json, Router,
};
use parking_lot::Mutex;
use serde::Deserialize;
use tauri::{AppHandle, Emitter};
use tower_http::cors::CorsLayer;
use uuid::Uuid;

use crate::SharedEngine;

const WEBREMOTE_HTML: &str = include_str!("../assets/webremote.html");

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WebRemoteStatus {
    pub running: bool,
    pub port: u16,
    pub local_ip: Option<String>,
    pub last_error: Option<String>,
}

pub struct WebRemoteServer {
    stop: Arc<AtomicBool>,
    handle: Mutex<Option<JoinHandle<()>>>,
    status: Mutex<WebRemoteStatus>,
}

impl WebRemoteServer {
    pub fn new(default_port: u16) -> Self {
        Self {
            stop: Arc::new(AtomicBool::new(false)),
            handle: Mutex::new(None),
            status: Mutex::new(WebRemoteStatus {
                running: false,
                port: default_port,
                local_ip: local_ip(),
                last_error: None,
            }),
        }
    }

    pub fn status(&self) -> WebRemoteStatus {
        self.status.lock().clone()
    }

    pub fn stop(&self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(handle) = self.handle.lock().take() {
            let _ = handle.join();
        }
        let mut status = self.status.lock();
        status.running = false;
    }

    pub fn start(
        &self,
        app: AppHandle,
        engine: SharedEngine,
        port: u16,
    ) -> Result<WebRemoteStatus, String> {
        self.stop();
        self.stop.store(false, Ordering::SeqCst);

        let stop = self.stop.clone();
        let status_for_thread = Arc::new(Mutex::new(self.status.lock().clone()));
        let status_ref = status_for_thread.clone();

        let (ready_tx, ready_rx) = std::sync::mpsc::channel();

        let handle = thread::spawn(move || {
            let rt = match tokio::runtime::Runtime::new() {
                Ok(rt) => rt,
                Err(e) => {
                    let _ = ready_tx.send(Err(format!("Tokio init failed: {e}")));
                    return;
                }
            };

            rt.block_on(async move {
                let listener = match tokio::net::TcpListener::bind(format!("0.0.0.0:{port}")).await
                {
                    Ok(listener) => listener,
                    Err(e) => {
                        let _ = ready_tx.send(Err(format!("Port {port} unavailable: {e}")));
                        return;
                    }
                };

                let _ = ready_tx.send(Ok(()));

                let state = RemoteState { engine, app };

                let router = Router::new()
                    .route("/", get(index))
                    .route("/api/state", get(get_state))
                    .route("/api/playback/{index}/fader", post(set_fader))
                    .route("/api/playback/{index}/go", post(playback_go))
                    .route("/api/playback/{index}/back", post(playback_back))
                    .route("/api/blackout", post(set_blackout))
                    .route("/api/output", post(set_output))
                    .route("/api/clear-programmer", post(clear_programmer))
                    .route("/api/fire-cue", post(fire_cue))
                    .layer(CorsLayer::permissive())
                    .with_state(state);

                let graceful = async move {
                    while !stop.load(Ordering::Relaxed) {
                        tokio::time::sleep(Duration::from_millis(150)).await;
                    }
                };

                if axum::serve(listener, router)
                    .with_graceful_shutdown(graceful)
                    .await
                    .is_err()
                {
                    status_ref.lock().last_error = Some("WebRemote server stopped".into());
                }
                status_ref.lock().running = false;
            });
        });

        match ready_rx.recv_timeout(Duration::from_secs(3)) {
            Ok(Ok(())) => {
                *self.handle.lock() = Some(handle);
                let mut status = self.status.lock();
                status.running = true;
                status.port = port;
                status.local_ip = local_ip();
                status.last_error = None;
                Ok(self.status())
            }
            Ok(Err(err)) => {
                let _ = handle.join();
                let mut status = self.status.lock();
                status.running = false;
                status.last_error = Some(err.clone());
                Err(err)
            }
            Err(_) => {
                let _ = handle.join();
                let err = "WebRemote server start timed out".to_string();
                let mut status = self.status.lock();
                status.running = false;
                status.last_error = Some(err.clone());
                Err(err)
            }
        }
    }
}

pub type SharedWebRemote = Arc<WebRemoteServer>;

#[derive(Clone)]
struct RemoteState {
    engine: SharedEngine,
    app: AppHandle,
}

fn emit_changed(app: &AppHandle) {
    let _ = app.emit("show-state-changed", ());
}

async fn index() -> Html<&'static str> {
    Html(WEBREMOTE_HTML)
}

async fn get_state(State(state): State<RemoteState>) -> Json<crate::engine::model::ShowStateDto> {
    Json(state.engine.read().state_dto())
}

#[derive(Deserialize)]
struct FaderBody {
    value: f32,
}

async fn set_fader(
    State(state): State<RemoteState>,
    Path(index): Path<usize>,
    Json(body): Json<FaderBody>,
) -> impl IntoResponse {
    let result = {
        let mut eng = state.engine.write();
        eng.set_playback_fader(index, body.value.clamp(0.0, 1.0))
    };
    match result {
        Ok(()) => {
            emit_changed(&state.app);
            (StatusCode::NO_CONTENT, ()).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

async fn playback_go(
    State(state): State<RemoteState>,
    Path(index): Path<usize>,
) -> impl IntoResponse {
    let result = {
        let mut eng = state.engine.write();
        eng.playback_go(index)
    };
    match result {
        Ok(()) => {
            emit_changed(&state.app);
            (StatusCode::NO_CONTENT, ()).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

async fn playback_back(
    State(state): State<RemoteState>,
    Path(index): Path<usize>,
) -> impl IntoResponse {
    let result = {
        let mut eng = state.engine.write();
        eng.playback_back(index)
    };
    match result {
        Ok(()) => {
            emit_changed(&state.app);
            (StatusCode::NO_CONTENT, ()).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

#[derive(Deserialize)]
struct EnabledBody {
    enabled: bool,
}

async fn set_blackout(
    State(state): State<RemoteState>,
    Json(body): Json<EnabledBody>,
) -> impl IntoResponse {
    {
        let mut eng = state.engine.write();
        eng.set_blackout(body.enabled);
    }
    emit_changed(&state.app);
    StatusCode::NO_CONTENT
}

async fn set_output(
    State(state): State<RemoteState>,
    Json(body): Json<EnabledBody>,
) -> impl IntoResponse {
    {
        let mut eng = state.engine.write();
        eng.output_enabled = body.enabled;
    }
    emit_changed(&state.app);
    StatusCode::NO_CONTENT
}

async fn clear_programmer(State(state): State<RemoteState>) -> impl IntoResponse {
    {
        let mut eng = state.engine.write();
        eng.programmer.clear();
    }
    emit_changed(&state.app);
    StatusCode::NO_CONTENT
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct FireCueBody {
    cue_list_id: Uuid,
    cue_id: Uuid,
}

async fn fire_cue(
    State(state): State<RemoteState>,
    Json(body): Json<FireCueBody>,
) -> impl IntoResponse {
    let result = {
        let mut eng = state.engine.write();
        eng.fire_cue(body.cue_list_id, body.cue_id)
    };
    match result {
        Ok(()) => {
            emit_changed(&state.app);
            (StatusCode::NO_CONTENT, ()).into_response()
        }
        Err(e) => (StatusCode::BAD_REQUEST, e).into_response(),
    }
}

pub fn local_ip() -> Option<String> {
    std::net::UdpSocket::bind("0.0.0.0:0")
        .ok()
        .and_then(|socket| socket.connect("8.8.8.8:80").ok().map(|_| socket))
        .and_then(|socket| socket.local_addr().ok())
        .map(|addr| addr.ip().to_string())
}

pub fn webremote_url(status: &WebRemoteStatus) -> Option<String> {
    let ip = status.local_ip.clone().or_else(local_ip)?;
    Some(format!("http://{ip}:{}", status.port))
}
