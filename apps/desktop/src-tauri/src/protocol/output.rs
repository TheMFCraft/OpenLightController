use std::sync::Arc;
use std::thread::{self, JoinHandle};
use std::time::Duration;

use parking_lot::{Mutex, RwLock};

use crate::engine::ShowEngine;
use crate::protocol::artnet::ArtNetSender;
use crate::protocol::sacn::SacnSender;

pub struct OutputRunner {
    stop: Arc<Mutex<bool>>,
    handle: Option<JoinHandle<()>>,
}

impl OutputRunner {
    pub fn spawn(engine: Arc<RwLock<ShowEngine>>, interval: Duration) -> Self {
        let stop = Arc::new(Mutex::new(false));
        let stop_flag = stop.clone();
        let handle = thread::spawn(move || {
            let mut artnet = ArtNetSender::new().ok();
            let mut sacn = SacnSender::new("OpenLightController").ok();

            while !*stop_flag.lock() {
                let (enabled, output_cfg, buffers) = {
                    let mut eng = engine.write();
                    let buffers = eng.render();
                    (eng.output_enabled, eng.show.output.clone(), buffers)
                };

                if enabled {
                    for entry in &output_cfg.universes {
                        let idx = (entry.internal_universe as usize).saturating_sub(1);
                        if idx >= buffers.len() {
                            continue;
                        }
                        let data = &buffers[idx];

                        if output_cfg.artnet_enabled && entry.artnet_enabled {
                            if let Some(sender) = artnet.as_mut() {
                                let _ = sender.send(
                                    &output_cfg.artnet_target,
                                    output_cfg.artnet_broadcast,
                                    entry.artnet_net,
                                    entry.artnet_subnet,
                                    entry.artnet_universe,
                                    data,
                                );
                            }
                        }

                        if output_cfg.sacn_enabled && entry.sacn_enabled {
                            if let Some(sender) = sacn.as_mut() {
                                let _ = sender.send(
                                    entry.sacn_universe,
                                    output_cfg.sacn_priority,
                                    data,
                                );
                            }
                        }
                    }
                }

                thread::sleep(interval);
            }
        });

        Self {
            stop,
            handle: Some(handle),
        }
    }
}

impl Drop for OutputRunner {
    fn drop(&mut self) {
        *self.stop.lock() = true;
        if let Some(handle) = self.handle.take() {
            let _ = handle.join();
        }
    }
}
