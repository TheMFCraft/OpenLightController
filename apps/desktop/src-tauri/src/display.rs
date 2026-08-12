use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

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
pub async fn open_external_display(
    app: AppHandle,
    monitor_index: Option<usize>,
    fullscreen: Option<bool>,
) -> Result<(), String> {
    if app.get_webview_window("external-display").is_some() {
        return Ok(());
    }

    let mut builder = WebviewWindowBuilder::new(
        &app,
        "external-display",
        WebviewUrl::App("external.html".into()),
    )
    .title("OpenLightController — External Display")
    .inner_size(1280.0, 720.0)
    .resizable(true)
    .decorations(true);

    if let Some(idx) = monitor_index {
        if let Ok(monitors) = app.available_monitors() {
            if let Some(monitor) = monitors.into_iter().nth(idx) {
                let pos = monitor.position();
                let size = monitor.size();
                builder = builder
                    .position(pos.x as f64, pos.y as f64)
                    .inner_size(size.width as f64, size.height as f64);
                if fullscreen.unwrap_or(true) {
                    builder = builder.fullscreen(true);
                }
            }
        }
    } else if fullscreen.unwrap_or(false) {
        builder = builder.fullscreen(true);
    }

    builder.build().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn close_external_display(app: AppHandle) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("external-display") {
        window.close().map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
pub fn is_external_display_open(app: AppHandle) -> bool {
    app.get_webview_window("external-display").is_some()
}
