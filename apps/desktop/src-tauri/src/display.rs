use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

const SCREEN_PREFIX: &str = "screen-";
const MAIN_WINDOW_LABEL: &str = "main";

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MonitorInfo {
    pub index: usize,
    pub name: String,
    pub width: u32,
    pub height: u32,
    pub x: i32,
    pub y: i32,
    pub primary: bool,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenScreenWindowOptions {
    pub window_label: String,
    pub title: String,
    pub panel: String,
    pub monitor_index: Option<usize>,
    pub fullscreen: Option<bool>,
}

fn validate_screen_label(label: &str) -> Result<(), String> {
    if label == MAIN_WINDOW_LABEL {
        return Err("The main console window cannot be controlled from screen layouts".into());
    }
    if !label.starts_with(SCREEN_PREFIX) {
        return Err("Screen window label must start with 'screen-'".into());
    }
    if label.len() <= SCREEN_PREFIX.len() {
        return Err("Screen window label is too short".into());
    }
    Ok(())
}

fn monitor_is_primary(app: &AppHandle, monitor_index: usize) -> Result<bool, String> {
    let primary_name = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .and_then(|m| m.name().cloned());
    let monitors = app.available_monitors().map_err(|e| e.to_string())?;
    let Some(monitor) = monitors.into_iter().nth(monitor_index) else {
        return Ok(false);
    };
    let name = monitor
        .name()
        .cloned()
        .unwrap_or_else(|| format!("Monitor {}", monitor_index + 1));
    Ok(primary_name.as_ref() == Some(&name))
}

fn encode_query_component(value: &str) -> String {
    value
        .chars()
        .map(|c| match c {
            'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
            ' ' => "%20".into(),
            _ => format!("%{:02X}", c as u32),
        })
        .collect()
}

#[tauri::command]
pub fn list_monitors(app: AppHandle) -> Result<Vec<MonitorInfo>, String> {
    let primary_name = app
        .primary_monitor()
        .map_err(|e| e.to_string())?
        .and_then(|m| m.name().cloned());

    let monitors = app.available_monitors().map_err(|e| e.to_string())?;

    Ok(monitors
        .into_iter()
        .enumerate()
        .map(|(index, monitor)| {
            let size = monitor.size();
            let pos = monitor.position();
            let name = monitor
                .name()
                .cloned()
                .unwrap_or_else(|| format!("Monitor {}", index + 1));
            MonitorInfo {
                index,
                primary: primary_name.as_ref() == Some(&name),
                name,
                width: size.width,
                height: size.height,
                x: pos.x,
                y: pos.y,
            }
        })
        .collect())
}

#[tauri::command]
pub async fn open_screen_window(
    app: AppHandle,
    options: OpenScreenWindowOptions,
) -> Result<(), String> {
    validate_screen_label(&options.window_label)?;
    if app.get_webview_window(&options.window_label).is_some() {
        return Ok(());
    }

    let url = format!(
        "external.html?panel={}&title={}",
        encode_query_component(&options.panel),
        encode_query_component(&options.title)
    );

    let mut builder = WebviewWindowBuilder::new(
        &app,
        &options.window_label,
        WebviewUrl::App(url.into()),
    )
    .title(format!("OpenLightController — {}", options.title))
    .inner_size(1280.0, 720.0)
    .resizable(true)
    .decorations(true);

    if let Some(idx) = options.monitor_index {
        if monitor_is_primary(&app, idx)? {
            return Err(
                "External screens cannot open on the primary monitor — the main console runs there. Choose a secondary monitor or the default windowed layout.".into(),
            );
        }
        let fullscreen = options.fullscreen.unwrap_or(false);
        if let Ok(monitors) = app.available_monitors() {
            if let Some(monitor) = monitors.into_iter().nth(idx) {
                let pos = monitor.position();
                let size = monitor.size();
                builder = builder
                    .position(pos.x as f64, pos.y as f64)
                    .inner_size(size.width as f64, size.height as f64);
                if fullscreen {
                    builder = builder.fullscreen(true);
                }
            }
        }
    } else if options.fullscreen.unwrap_or(false) {
        return Err(
            "Fullscreen requires a secondary monitor. Use the default windowed layout on the primary display.".into(),
        );
    }

    builder.build().map_err(|e| e.to_string())?;
    if let Some(main) = app.get_webview_window(MAIN_WINDOW_LABEL) {
        let _ = main.unminimize();
        let _ = main.show();
        let _ = main.set_focus();
    }
    Ok(())
}

#[tauri::command]
pub async fn close_screen_window(app: AppHandle, window_label: String) -> Result<(), String> {
    validate_screen_label(&window_label)?;
    if let Some(window) = app.get_webview_window(&window_label) {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

pub fn close_all_screen_windows(app: &AppHandle) {
    let labels: Vec<String> = app
        .webview_windows()
        .into_keys()
        .filter(|label| label.starts_with(SCREEN_PREFIX))
        .collect();
    for label in labels {
        if let Some(window) = app.get_webview_window(&label) {
            let _ = window.close();
        }
    }
}

#[tauri::command]
pub fn list_open_screen_windows(app: AppHandle) -> Vec<String> {
    app.webview_windows()
        .into_keys()
        .filter(|label| label.starts_with(SCREEN_PREFIX))
        .collect()
}

#[tauri::command]
pub fn is_screen_window_open(app: AppHandle, window_label: String) -> bool {
    validate_screen_label(&window_label).is_ok()
        && app.get_webview_window(&window_label).is_some()
}
