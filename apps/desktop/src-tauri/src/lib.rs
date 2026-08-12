//! OpenLightController core engine and protocols.

pub mod commands;
pub mod engine;
pub mod protocol;
pub mod showfile;
pub mod streamdeck;
pub mod streamdeck_icons;
pub mod webremote;
pub mod display;

use std::sync::Arc;
use std::time::Duration;

use parking_lot::RwLock;
use tauri::Manager;

use crate::engine::ShowEngine;
use crate::protocol::OutputRunner;
use crate::streamdeck::StreamDeckController;
use crate::webremote::WebRemoteServer;

pub type SharedEngine = Arc<RwLock<ShowEngine>>;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            let engine = Arc::new(RwLock::new(ShowEngine::new_with_builtin_library()));
            let output = OutputRunner::spawn(engine.clone(), Duration::from_millis(25));
            let deck = Arc::new(StreamDeckController::new());
            deck.start_auto_connect_watcher(app.handle().clone(), engine.clone());
            let webremote = Arc::new(WebRemoteServer::new(8080));
            app.manage(engine);
            app.manage(output);
            app.manage(deck);
            app.manage(webremote);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_show_state,
            commands::list_fixture_definitions,
            commands::patch_fixture,
            commands::unpatch_fixture,
            commands::select_fixtures,
            commands::select_group,
            commands::set_attribute,
            commands::set_attributes,
            commands::set_blackout,
            commands::clear_programmer,
            commands::clear_programmer_all,
            commands::store_group,
            commands::delete_group,
            commands::store_preset,
            commands::apply_preset,
            commands::delete_preset,
            commands::store_cue,
            commands::delete_cue,
            commands::create_cue_list,
            commands::assign_playback,
            commands::set_playback_fader,
            commands::playback_go,
            commands::playback_back,
            commands::set_output_config,
            commands::set_output_enabled,
            commands::set_show_name,
            commands::new_show,
            commands::save_show,
            commands::load_show,
            commands::get_universe_snapshot,
            commands::list_streamdecks,
            commands::get_streamdeck_status,
            commands::connect_streamdeck,
            commands::disconnect_streamdeck,
            commands::set_streamdeck_mappings,
            commands::assign_streamdeck_key,
            commands::fire_cue,
            commands::get_webremote_status,
            commands::start_webremote,
            commands::stop_webremote,
            display::list_monitors,
            display::open_external_display,
            display::close_external_display,
            display::is_external_display_open,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
