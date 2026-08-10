use std::collections::BTreeMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::Duration;

use elgato_streamdeck::{list_devices, new_hidapi, StreamDeck, StreamDeckInput};
use image::{DynamicImage, Rgb, RgbImage};
use parking_lot::{Mutex, RwLock};
use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

use crate::engine::ShowEngine;
use crate::SharedEngine;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum DeckAction {
    Empty,
    BlackoutToggle,
    ClearProgrammer,
    OutputToggle,
    PlaybackGo { index: usize },
    PlaybackBack { index: usize },
    DimmerFull,
    DimmerZero,
    ShutterOpen,
    ShutterClosed,
    SelectFid { fid: u32 },
    ColorRed,
    ColorGreen,
    ColorBlue,
    ColorWhite,
    ColorCyan,
    ColorMagenta,
    ColorYellow,
    ColorAmber,
    /// Fire a specific cue (by list + cue id)
    FireCue {
        cue_list_id: Uuid,
        cue_id: Uuid,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeckKeyMapping {
    pub key: u8,
    pub label: String,
    pub action: DeckAction,
    pub color: [u8; 3],
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamDeckDeviceInfo {
    pub kind: String,
    pub serial: String,
    pub key_count: u8,
    pub rows: u8,
    pub columns: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamDeckStatus {
    pub connected: bool,
    pub kind: Option<String>,
    pub serial: Option<String>,
    pub key_count: u8,
    pub rows: u8,
    pub columns: u8,
    pub mappings: Vec<DeckKeyMapping>,
    pub last_error: Option<String>,
}

fn empty_key(key: u8) -> DeckKeyMapping {
    DeckKeyMapping {
        key,
        label: "—".into(),
        action: DeckAction::Empty,
        color: [28, 28, 28],
    }
}

/// Utility / default actions for the first few keys; rest empty.
pub fn default_mappings_for_size(key_count: u8) -> Vec<DeckKeyMapping> {
    let presets = [
        map(0, "BO", DeckAction::BlackoutToggle, [180, 30, 30]),
        map(1, "CLR", DeckAction::ClearProgrammer, [80, 80, 80]),
        map(2, "OUT", DeckAction::OutputToggle, [40, 140, 90]),
        map(3, "GO1", DeckAction::PlaybackGo { index: 0 }, [50, 120, 200]),
        map(4, "BK1", DeckAction::PlaybackBack { index: 0 }, [40, 80, 140]),
        map(5, "FULL", DeckAction::DimmerFull, [220, 200, 40]),
    ];
    (0..key_count)
        .map(|k| {
            presets
                .iter()
                .find(|m| m.key == k)
                .cloned()
                .unwrap_or_else(|| empty_key(k))
        })
        .collect()
}

pub fn resize_mappings(existing: &[DeckKeyMapping], key_count: u8) -> Vec<DeckKeyMapping> {
    (0..key_count)
        .map(|k| {
            existing
                .iter()
                .find(|m| m.key == k)
                .cloned()
                .unwrap_or_else(|| empty_key(k))
        })
        .collect()
}

fn map(key: u8, label: &str, action: DeckAction, color: [u8; 3]) -> DeckKeyMapping {
    DeckKeyMapping {
        key,
        label: label.into(),
        action,
        color,
    }
}

pub struct StreamDeckController {
    stop: Arc<AtomicBool>,
    handle: Mutex<Option<JoinHandle<()>>>,
    status: Arc<Mutex<StreamDeckStatus>>,
    mappings: Arc<Mutex<Vec<DeckKeyMapping>>>,
    /// Serial of last connected device — used to reconnect after remapping
    last_serial: Mutex<Option<String>>,
}

impl StreamDeckController {
    pub fn new() -> Self {
        Self {
            stop: Arc::new(AtomicBool::new(false)),
            handle: Mutex::new(None),
            status: Arc::new(Mutex::new(StreamDeckStatus {
                connected: false,
                kind: None,
                serial: None,
                key_count: 0,
                rows: 0,
                columns: 0,
                mappings: vec![],
                last_error: None,
            })),
            mappings: Arc::new(Mutex::new(vec![])),
            last_serial: Mutex::new(None),
        }
    }

    pub fn status(&self) -> StreamDeckStatus {
        let mut s = self.status.lock().clone();
        s.mappings = self.mappings.lock().clone();
        s
    }

    pub fn set_mappings(&self, mappings: Vec<DeckKeyMapping>) {
        let key_count = self.status.lock().key_count.max(mappings.len() as u8);
        *self.mappings.lock() = resize_mappings(&mappings, key_count.max(1));
    }

    pub fn assign_key(&self, mapping: DeckKeyMapping) -> StreamDeckStatus {
        let mut maps = self.mappings.lock();
        if let Some(slot) = maps.iter_mut().find(|m| m.key == mapping.key) {
            *slot = mapping;
        } else {
            maps.push(mapping);
            maps.sort_by_key(|m| m.key);
        }
        drop(maps);
        self.status()
    }

    pub fn list_devices() -> Result<Vec<StreamDeckDeviceInfo>, String> {
        let hid = new_hidapi().map_err(|e| e.to_string())?;
        let devices = list_devices(&hid);
        Ok(devices
            .into_iter()
            .map(|(kind, serial)| StreamDeckDeviceInfo {
                kind: format!("{kind:?}"),
                serial,
                key_count: kind.key_count(),
                rows: kind.row_count(),
                columns: kind.column_count(),
            })
            .collect())
    }

    pub fn connect(
        &self,
        app: AppHandle,
        engine: SharedEngine,
        serial: Option<String>,
    ) -> Result<StreamDeckStatus, String> {
        self.disconnect();
        self.stop.store(false, Ordering::SeqCst);

        let hid = new_hidapi().map_err(|e| e.to_string())?;
        let devices = list_devices(&hid);
        let (kind, found_serial) = if let Some(serial) = serial {
            devices
                .into_iter()
                .find(|(_, s)| *s == serial)
                .ok_or_else(|| format!("Stream Deck {serial} not found"))?
        } else {
            devices
                .into_iter()
                .next()
                .ok_or_else(|| "No Stream Deck found".to_string())?
        };

        let device = StreamDeck::connect(&hid, kind, &found_serial).map_err(|e| e.to_string())?;
        let _ = device.set_brightness(70);
        let key_count = kind.key_count();
        let rows = kind.row_count();
        let columns = kind.column_count();

        // Auto-fit mapping grid to detected size; seed defaults if empty
        let resized = {
            let existing = self.mappings.lock();
            if existing.is_empty() {
                default_mappings_for_size(key_count)
            } else {
                resize_mappings(&existing, key_count)
            }
        };
        *self.mappings.lock() = resized.clone();
        paint_buttons(&device, &resized, key_count);

        {
            let mut st = self.status.lock();
            st.connected = true;
            st.kind = Some(format!("{kind:?}"));
            st.serial = Some(found_serial.clone());
            st.key_count = key_count;
            st.rows = rows;
            st.columns = columns;
            st.last_error = None;
            st.mappings = resized.clone();
        }
        *self.last_serial.lock() = Some(found_serial.clone());

        let stop = self.stop.clone();
        let status = self.status.clone();
        let mappings = self.mappings.clone();
        let engine = engine.clone();

        let handle = thread::spawn(move || {
            let mut prev = vec![false; key_count as usize];
            while !stop.load(Ordering::SeqCst) {
                match device.read_input(Some(Duration::from_millis(100))) {
                    Ok(StreamDeckInput::ButtonStateChange(buttons)) => {
                        for (i, pressed) in buttons.iter().enumerate() {
                            let was = prev.get(i).copied().unwrap_or(false);
                            if *pressed && !was {
                                let key = i as u8;
                                let action = mappings
                                    .lock()
                                    .iter()
                                    .find(|m| m.key == key)
                                    .map(|m| m.action.clone());
                                if let Some(action) = action {
                                    if action != DeckAction::Empty {
                                        handle_action(&engine, &action);
                                        let _ = app.emit(
                                            "streamdeck-action",
                                            serde_json::json!({
                                                "key": key,
                                                "action": action,
                                            }),
                                        );
                                        let _ = app.emit("show-state-changed", ());
                                    }
                                }
                            }
                        }
                        prev = buttons;
                    }
                    Ok(_) => {}
                    Err(e) => {
                        status.lock().last_error = Some(e.to_string());
                        status.lock().connected = false;
                        break;
                    }
                }
            }
            status.lock().connected = false;
        });

        *self.handle.lock() = Some(handle);
        Ok(self.status())
    }

    /// Apply mappings and reconnect so button colors update on the hardware.
    pub fn apply_mappings_and_refresh(
        &self,
        app: AppHandle,
        engine: SharedEngine,
        mappings: Vec<DeckKeyMapping>,
    ) -> Result<StreamDeckStatus, String> {
        let serial = self.last_serial.lock().clone();
        let key_count = self.status.lock().key_count;
        let sized = if key_count > 0 {
            resize_mappings(&mappings, key_count)
        } else {
            mappings
        };
        *self.mappings.lock() = sized;
        if self.status.lock().connected {
            if let Some(serial) = serial {
                return self.connect(app, engine, Some(serial));
            }
        }
        Ok(self.status())
    }

    pub fn disconnect(&self) {
        self.stop.store(true, Ordering::SeqCst);
        if let Some(handle) = self.handle.lock().take() {
            let _ = handle.join();
        }
        let mut st = self.status.lock();
        st.connected = false;
        // keep kind/size/mappings so UI still shows the grid after disconnect
        st.last_error = None;
    }
}

impl Drop for StreamDeckController {
    fn drop(&mut self) {
        self.disconnect();
    }
}

fn paint_buttons(device: &StreamDeck, mappings: &[DeckKeyMapping], key_count: u8) {
    let size = device.kind().key_image_format().size.0.max(1) as u32;
    for key in 0..key_count {
        let color = mappings
            .iter()
            .find(|m| m.key == key)
            .map(|m| m.color)
            .unwrap_or([20, 20, 20]);
        let mut img = RgbImage::new(size, size);
        for pixel in img.pixels_mut() {
            *pixel = Rgb(color);
        }
        let _ = device.set_button_image(key, DynamicImage::ImageRgb8(img));
    }
    let _ = device.flush();
}

fn handle_action(engine: &SharedEngine, action: &DeckAction) {
    let mut eng = engine.write();
    match action {
        DeckAction::Empty => {}
        DeckAction::BlackoutToggle => {
            eng.toggle_blackout();
        }
        DeckAction::ClearProgrammer => {
            eng.programmer.clear_all();
        }
        DeckAction::OutputToggle => {
            eng.output_enabled = !eng.output_enabled;
        }
        DeckAction::PlaybackGo { index } => {
            let _ = eng.playback_go(*index);
        }
        DeckAction::PlaybackBack { index } => {
            let _ = eng.playback_back(*index);
        }
        DeckAction::DimmerFull => {
            let _ = eng.set_attribute("dimmer".into(), 1.0);
        }
        DeckAction::DimmerZero => {
            let _ = eng.set_attribute("dimmer".into(), 0.0);
        }
        DeckAction::ShutterOpen => {
            let _ = eng.set_attribute("shutter".into(), 1.0);
        }
        DeckAction::ShutterClosed => {
            let _ = eng.set_attribute("shutter".into(), 0.0);
        }
        DeckAction::SelectFid { fid } => {
            let _ = eng.select_fixture_by_fid(*fid, false);
        }
        DeckAction::ColorRed => apply_rgb(&mut eng, 1.0, 0.0, 0.0, 0.0),
        DeckAction::ColorGreen => apply_rgb(&mut eng, 0.0, 1.0, 0.0, 0.0),
        DeckAction::ColorBlue => apply_rgb(&mut eng, 0.0, 0.0, 1.0, 0.0),
        DeckAction::ColorWhite => apply_rgb(&mut eng, 0.0, 0.0, 0.0, 1.0),
        DeckAction::ColorCyan => apply_rgb(&mut eng, 0.0, 1.0, 1.0, 0.0),
        DeckAction::ColorMagenta => apply_rgb(&mut eng, 1.0, 0.0, 1.0, 0.0),
        DeckAction::ColorYellow => apply_rgb(&mut eng, 1.0, 1.0, 0.0, 0.0),
        DeckAction::ColorAmber => apply_rgb(&mut eng, 1.0, 0.55, 0.0, 0.15),
        DeckAction::FireCue {
            cue_list_id,
            cue_id,
        } => {
            let _ = eng.fire_cue(*cue_list_id, *cue_id);
        }
    }
}

fn apply_rgb(eng: &mut ShowEngine, r: f32, g: f32, b: f32, w: f32) {
    let mut values = BTreeMap::new();
    values.insert("red".into(), r);
    values.insert("green".into(), g);
    values.insert("blue".into(), b);
    values.insert("white".into(), w);
    let _ = eng.set_attributes(values);
}

pub type SharedStreamDeck = Arc<StreamDeckController>;

#[allow(dead_code)]
fn _unused(_: &RwLock<ShowEngine>) {}
