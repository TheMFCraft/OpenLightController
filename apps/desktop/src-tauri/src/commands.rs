use std::collections::BTreeMap;
use std::path::PathBuf;

use tauri::{AppHandle, State};
use uuid::Uuid;

use crate::engine::model::{FeatureGroup, FixtureDefinition, OutputConfig, ShowStateDto};
use crate::streamdeck::{DeckKeyMapping, SharedStreamDeck, StreamDeckDeviceInfo, StreamDeckStatus};
use crate::webremote::{SharedWebRemote, WebRemoteStatus};
use crate::SharedEngine;

fn map_err(e: String) -> String {
    e
}

#[tauri::command]
pub fn get_show_state(engine: State<'_, SharedEngine>) -> ShowStateDto {
    engine.read().state_dto()
}

#[tauri::command]
pub fn list_fixture_definitions(engine: State<'_, SharedEngine>) -> Vec<FixtureDefinition> {
    engine.read().definitions.clone()
}

#[tauri::command]
pub fn patch_fixture(
    engine: State<'_, SharedEngine>,
    definition_id: String,
    name: Option<String>,
    universe: u8,
    address: u16,
    quantity: Option<u16>,
    offset: Option<u16>,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.patch_fixtures(
        definition_id,
        name,
        universe,
        address,
        quantity.unwrap_or(1),
        offset,
    )
    .map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn unpatch_fixture(engine: State<'_, SharedEngine>, id: Uuid) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.unpatch_fixture(id).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn select_fixtures(
    engine: State<'_, SharedEngine>,
    ids: Vec<Uuid>,
    additive: bool,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.select_fixtures(ids, additive);
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn select_group(
    engine: State<'_, SharedEngine>,
    group_id: Uuid,
    additive: bool,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.select_group(group_id, additive).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn set_attribute(
    engine: State<'_, SharedEngine>,
    name: String,
    value: f32,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.set_attribute(name, value).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn set_attributes(
    engine: State<'_, SharedEngine>,
    values: BTreeMap<String, f32>,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.set_attributes(values).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn set_blackout(
    engine: State<'_, SharedEngine>,
    enabled: bool,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.set_blackout(enabled);
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn clear_programmer(engine: State<'_, SharedEngine>) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.programmer.clear();
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn clear_programmer_all(engine: State<'_, SharedEngine>) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.programmer.clear_all();
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn store_group(
    engine: State<'_, SharedEngine>,
    name: String,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.store_group(name).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn delete_group(engine: State<'_, SharedEngine>, id: Uuid) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.delete_group(id).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn store_preset(
    engine: State<'_, SharedEngine>,
    name: String,
    feature_group: FeatureGroup,
    covers_all: Option<bool>,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.store_preset(name, feature_group, covers_all.unwrap_or(false))
        .map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn update_preset(
    engine: State<'_, SharedEngine>,
    id: Uuid,
    name: Option<String>,
    refresh_from_programmer: Option<bool>,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.update_preset(id, name, refresh_from_programmer.unwrap_or(false))
        .map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn duplicate_preset(
    engine: State<'_, SharedEngine>,
    id: Uuid,
    name: Option<String>,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.duplicate_preset(id, name).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn apply_preset(
    engine: State<'_, SharedEngine>,
    id: Uuid,
    replace: Option<bool>,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.apply_preset(id, replace.unwrap_or(false)).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn delete_preset(engine: State<'_, SharedEngine>, id: Uuid) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.delete_preset(id).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn create_cue_list(
    engine: State<'_, SharedEngine>,
    name: String,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.create_cue_list(name);
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn store_cue(
    engine: State<'_, SharedEngine>,
    cue_list_id: Uuid,
    name: String,
    fade_ms: u64,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.store_cue(cue_list_id, name, fade_ms).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn delete_cue(
    engine: State<'_, SharedEngine>,
    cue_list_id: Uuid,
    cue_id: Uuid,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.delete_cue(cue_list_id, cue_id).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn assign_playback(
    engine: State<'_, SharedEngine>,
    index: usize,
    cue_list_id: Option<Uuid>,
    label: Option<String>,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.assign_playback(index, cue_list_id, label)
        .map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn set_playback_fader(
    engine: State<'_, SharedEngine>,
    index: usize,
    value: f32,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.set_playback_fader(index, value).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn playback_go(engine: State<'_, SharedEngine>, index: usize) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.playback_go(index).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn playback_back(
    engine: State<'_, SharedEngine>,
    index: usize,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.playback_back(index).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn set_output_config(
    engine: State<'_, SharedEngine>,
    config: OutputConfig,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.show.output = config;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn set_output_enabled(
    engine: State<'_, SharedEngine>,
    enabled: bool,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.output_enabled = enabled;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn set_show_name(
    engine: State<'_, SharedEngine>,
    name: String,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.set_show_name(name);
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn new_show(engine: State<'_, SharedEngine>) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.new_show();
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn save_show(
    engine: State<'_, SharedEngine>,
    path: String,
) -> Result<ShowStateDto, String> {
    let eng = engine.read();
    eng.save_to_path(&PathBuf::from(path))?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn load_show(
    engine: State<'_, SharedEngine>,
    path: String,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.load_from_path(&PathBuf::from(path))?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn get_universe_snapshot(
    engine: State<'_, SharedEngine>,
    universe: u8,
) -> Result<Vec<u8>, String> {
    let mut eng = engine.write();
    let buffers = eng.render();
    let idx = (universe as usize).saturating_sub(1);
    if idx >= buffers.len() {
        return Err("Universe out of range".into());
    }
    Ok(buffers[idx].to_vec())
}

#[tauri::command]
pub fn list_streamdecks() -> Result<Vec<StreamDeckDeviceInfo>, String> {
    crate::streamdeck::StreamDeckController::list_devices()
}

#[tauri::command]
pub fn get_streamdeck_status(deck: State<'_, SharedStreamDeck>) -> StreamDeckStatus {
    deck.status()
}

#[tauri::command]
pub fn connect_streamdeck(
    app: AppHandle,
    engine: State<'_, SharedEngine>,
    deck: State<'_, SharedStreamDeck>,
    serial: Option<String>,
) -> Result<StreamDeckStatus, String> {
    deck.connect(app, engine.inner().clone(), serial)
}

#[tauri::command]
pub fn disconnect_streamdeck(deck: State<'_, SharedStreamDeck>) -> Result<StreamDeckStatus, String> {
    deck.disconnect();
    Ok(deck.status())
}

#[tauri::command]
pub fn set_streamdeck_mappings(
    app: AppHandle,
    engine: State<'_, SharedEngine>,
    deck: State<'_, SharedStreamDeck>,
    mappings: Vec<DeckKeyMapping>,
) -> Result<StreamDeckStatus, String> {
    deck.apply_mappings_and_refresh(app, engine.inner().clone(), mappings)
}

#[tauri::command]
pub fn assign_streamdeck_key(
    app: AppHandle,
    engine: State<'_, SharedEngine>,
    deck: State<'_, SharedStreamDeck>,
    mapping: DeckKeyMapping,
) -> Result<StreamDeckStatus, String> {
    deck.assign_key(mapping);
    let maps = deck.status().mappings;
    deck.apply_mappings_and_refresh(app, engine.inner().clone(), maps)
}

#[tauri::command]
pub fn fire_cue(
    engine: State<'_, SharedEngine>,
    cue_list_id: Uuid,
    cue_id: Uuid,
) -> Result<ShowStateDto, String> {
    let mut eng = engine.write();
    eng.fire_cue(cue_list_id, cue_id).map_err(map_err)?;
    Ok(eng.state_dto())
}

#[tauri::command]
pub fn get_webremote_status(webremote: State<'_, SharedWebRemote>) -> WebRemoteStatus {
    webremote.status()
}

#[tauri::command]
pub fn start_webremote(
    app: AppHandle,
    engine: State<'_, SharedEngine>,
    webremote: State<'_, SharedWebRemote>,
    port: u16,
) -> Result<WebRemoteStatus, String> {
    webremote.start(app, engine.inner().clone(), port)
}

#[tauri::command]
pub fn stop_webremote(webremote: State<'_, SharedWebRemote>) -> WebRemoteStatus {
    webremote.stop();
    webremote.status()
}
