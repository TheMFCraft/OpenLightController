use std::collections::BTreeMap;
use std::time::{SystemTime, UNIX_EPOCH};

use super::model::*;

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub fn playback_current_state(show: &ShowFile, pb: &PlaybackSlot) -> TrackedState {
    let Some(list_id) = pb.cue_list_id else {
        return BTreeMap::new();
    };
    let Some(list) = show.cue_lists.iter().find(|c| c.id == list_id) else {
        return BTreeMap::new();
    };
    let Some(idx) = pb.current_cue_index else {
        return BTreeMap::new();
    };
    if idx >= list.cues.len() {
        return BTreeMap::new();
    }

    if let Some(fade) = &pb.fade {
        let t = if fade.duration_ms == 0 {
            1.0
        } else {
            ((now_ms().saturating_sub(fade.started_ms)) as f32 / fade.duration_ms as f32)
                .clamp(0.0, 1.0)
        };
        let mut out = BTreeMap::new();
        let keys: std::collections::BTreeSet<_> =
            fade.from.keys().chain(fade.to.keys()).cloned().collect();
        for k in keys {
            let a = fade.from.get(&k).copied().unwrap_or(0.0);
            let b = fade.to.get(&k).copied().unwrap_or(a);
            out.insert(k, a + (b - a) * t);
        }
        out
    } else {
        rebuild_tracked(&list.cues, idx)
    }
}

pub fn advance_fades(show: &mut ShowFile) {
    let now = now_ms();
    for pb in &mut show.playbacks {
        if let Some(fade) = &pb.fade {
            if now.saturating_sub(fade.started_ms) >= fade.duration_ms {
                pb.fade = None;
            }
        }
    }
}

/// Merge programmer + playbacks into per-attribute absolute values, then to DMX buffers.
pub fn render_universes(
    show: &ShowFile,
    defs: &[FixtureDefinition],
    programmer: &Programmer,
    blackout: bool,
) -> [[u8; CHANNELS_PER_UNIVERSE]; UNIVERSE_COUNT] {
    let def_map = definitions_by_id(defs);
    let mut buffers = [[0u8; CHANNELS_PER_UNIVERSE]; UNIVERSE_COUNT];

    // Apply fixture defaults first
    for fx in &show.fixtures {
        let Some(def) = def_map.get(&fx.definition_id) else {
            continue;
        };
        for attr in &def.attributes {
            let (coarse, fine) = value_to_dmx(attr.default as f32 / 255.0, attr.fine_offset.is_some());
            write_channel(
                &mut buffers,
                fx.universe,
                fx.address,
                attr.offset,
                coarse,
            );
            if let (Some(fine_off), Some(fine_v)) = (attr.fine_offset, fine) {
                write_channel(&mut buffers, fx.universe, fx.address, fine_off, fine_v);
            }
        }
    }

    // Collect attribute contributions
    // dimmer: HTP across playbacks (scaled by fader), then programmer overrides
    // others: LTP — later playback index wins among active, programmer overrides

    let mut dimmer_htp: BTreeMap<String, f32> = BTreeMap::new();
    let mut ltp: BTreeMap<String, f32> = BTreeMap::new();

    for pb in &show.playbacks {
        if pb.fader <= 0.001 || pb.cue_list_id.is_none() || pb.current_cue_index.is_none() {
            continue;
        }
        let state = playback_current_state(show, pb);
        for (key, value) in state {
            let Some((fx_id, attr_name)) = parse_attr_key(&key) else {
                continue;
            };
            let Some(fx) = show.fixtures.iter().find(|f| f.id == fx_id) else {
                continue;
            };
            let Some(def) = def_map.get(&fx.definition_id) else {
                continue;
            };
            let Some(attr) = def.attributes.iter().find(|a| a.name == attr_name) else {
                continue;
            };
            match attr.feature_group {
                FeatureGroup::Dimmer => {
                    let scaled = value * pb.fader;
                    let entry = dimmer_htp.entry(key).or_insert(0.0);
                    if scaled > *entry {
                        *entry = scaled;
                    }
                }
                _ => {
                    ltp.insert(key, value);
                }
            }
        }
    }

    // Programmer overrides for selected fixtures
    if !programmer.selection.is_empty() && !programmer.values.is_empty() {
        for fx_id in &programmer.selection {
            for (attr_name, value) in &programmer.values {
                let key = attr_key(*fx_id, attr_name);
                let Some(fx) = show.fixtures.iter().find(|f| f.id == *fx_id) else {
                    continue;
                };
                let Some(def) = def_map.get(&fx.definition_id) else {
                    continue;
                };
                let Some(attr) = def.attributes.iter().find(|a| a.name == *attr_name) else {
                    continue;
                };
                match attr.feature_group {
                    FeatureGroup::Dimmer => {
                        dimmer_htp.insert(key, *value);
                    }
                    _ => {
                        ltp.insert(key, *value);
                    }
                }
            }
        }
    }

    let apply = |buffers: &mut [[u8; CHANNELS_PER_UNIVERSE]; UNIVERSE_COUNT],
                 map: &BTreeMap<String, f32>| {
        for (key, value) in map {
            let Some((fx_id, attr_name)) = parse_attr_key(key) else {
                continue;
            };
            let Some(fx) = show.fixtures.iter().find(|f| f.id == fx_id) else {
                continue;
            };
            let Some(def) = def_map.get(&fx.definition_id) else {
                continue;
            };
            let Some(attr) = def.attributes.iter().find(|a| a.name == attr_name) else {
                continue;
            };
            let (coarse, fine) = value_to_dmx(*value, attr.fine_offset.is_some());
            write_channel(buffers, fx.universe, fx.address, attr.offset, coarse);
            if let (Some(fine_off), Some(fine_v)) = (attr.fine_offset, fine) {
                write_channel(buffers, fx.universe, fx.address, fine_off, fine_v);
            }
        }
    };

    apply(&mut buffers, &ltp);
    apply(&mut buffers, &dimmer_htp);

    if blackout {
        for buffer in buffers.iter_mut() {
            buffer.fill(0);
        }
    }

    buffers
}

fn write_channel(
    buffers: &mut [[u8; CHANNELS_PER_UNIVERSE]; UNIVERSE_COUNT],
    universe_1based: u8,
    address_1based: u16,
    offset: u16,
    value: u8,
) {
    let u = universe_1based as usize;
    if u == 0 || u > UNIVERSE_COUNT {
        return;
    }
    let ch = address_1based as i32 + offset as i32 - 1;
    if ch < 0 || ch >= CHANNELS_PER_UNIVERSE as i32 {
        return;
    }
    buffers[u - 1][ch as usize] = value;
}

#[cfg(test)]
mod tests {
    use super::*;
    use uuid::Uuid;

    fn sample_def() -> FixtureDefinition {
        FixtureDefinition {
            id: "generic.dimmer".into(),
            manufacturer: "Generic".into(),
            name: "Dimmer".into(),
            mode: "1ch".into(),
            category: "Dimmer".into(),
            channel_count: 1,
            attributes: vec![AttributeDef {
                name: "dimmer".into(),
                feature_group: FeatureGroup::Dimmer,
                offset: 0,
                fine_offset: None,
                default: 0,
                highlight: 255,
                choices: vec![],
            }],
        }
    }

    #[test]
    fn tracking_rebuilds() {
        let fx = Uuid::new_v4();
        let cues = vec![
            Cue {
                id: Uuid::new_v4(),
                number: 1.0,
                name: "A".into(),
                fade_ms: 0,
                values: BTreeMap::from([(attr_key(fx, "dimmer"), 0.5)]),
            },
            Cue {
                id: Uuid::new_v4(),
                number: 2.0,
                name: "B".into(),
                fade_ms: 0,
                values: BTreeMap::from([(attr_key(fx, "dimmer"), 1.0)]),
            },
        ];
        let s0 = rebuild_tracked(&cues, 0);
        assert!((s0[&attr_key(fx, "dimmer")] - 0.5).abs() < 0.001);
        let s1 = rebuild_tracked(&cues, 1);
        assert!((s1[&attr_key(fx, "dimmer")] - 1.0).abs() < 0.001);
    }

    #[test]
    fn htp_dimmer_merge() {
        let def = sample_def();
        let fx_id = Uuid::new_v4();
        let list_id = Uuid::new_v4();
        let mut show = ShowFile::default();
        show.fixtures.push(PatchedFixture {
            id: fx_id,
            fid: 1,
            name: "D1".into(),
            definition_id: def.id.clone(),
            universe: 1,
            address: 1,
        });
        show.cue_lists.push(CueList {
            id: list_id,
            name: "Main".into(),
            cues: vec![Cue {
                id: Uuid::new_v4(),
                number: 1.0,
                name: "Full".into(),
                fade_ms: 0,
                values: BTreeMap::from([(attr_key(fx_id, "dimmer"), 1.0)]),
            }],
        });
        show.playbacks[0].cue_list_id = Some(list_id);
        show.playbacks[0].current_cue_index = Some(0);
        show.playbacks[0].fader = 0.4;
        show.playbacks[1].cue_list_id = Some(list_id);
        show.playbacks[1].current_cue_index = Some(0);
        show.playbacks[1].fader = 0.7;

        let buffers = render_universes(&show, &[def], &Programmer::default(), false);
        // HTP of 0.4 and 0.7 => 0.7 * 255 ~= 178
        assert_eq!(buffers[0][0], 179);
    }

    #[test]
    fn master_blackout_zeros_all_channels() {
        let def = FixtureDefinition {
            id: "generic.rgb".into(),
            manufacturer: "Generic".into(),
            name: "RGB".into(),
            mode: "3ch".into(),
            category: "LED".into(),
            channel_count: 3,
            attributes: vec![
                AttributeDef {
                    name: "red".into(),
                    feature_group: FeatureGroup::Color,
                    offset: 0,
                    fine_offset: None,
                    default: 0,
                    highlight: 255,
                    choices: vec![],
                },
                AttributeDef {
                    name: "green".into(),
                    feature_group: FeatureGroup::Color,
                    offset: 1,
                    fine_offset: None,
                    default: 0,
                    highlight: 255,
                    choices: vec![],
                },
                AttributeDef {
                    name: "blue".into(),
                    feature_group: FeatureGroup::Color,
                    offset: 2,
                    fine_offset: None,
                    default: 0,
                    highlight: 255,
                    choices: vec![],
                },
            ],
        };
        let fx_id = Uuid::new_v4();
        let list_id = Uuid::new_v4();
        let mut show = ShowFile::default();
        show.fixtures.push(PatchedFixture {
            id: fx_id,
            fid: 1,
            name: "RGB1".into(),
            definition_id: def.id.clone(),
            universe: 1,
            address: 1,
        });
        show.cue_lists.push(CueList {
            id: list_id,
            name: "Main".into(),
            cues: vec![Cue {
                id: Uuid::new_v4(),
                number: 1.0,
                name: "Full".into(),
                fade_ms: 0,
                values: BTreeMap::from([
                    (attr_key(fx_id, "red"), 1.0),
                    (attr_key(fx_id, "green"), 0.5),
                    (attr_key(fx_id, "blue"), 0.25),
                ]),
            }],
        });
        show.playbacks[0].cue_list_id = Some(list_id);
        show.playbacks[0].current_cue_index = Some(0);
        show.playbacks[0].fader = 1.0;

        let live = render_universes(&show, &[def.clone()], &Programmer::default(), false);
        assert_eq!(live[0][0], 255);
        assert_eq!(live[0][1], 128);
        assert_eq!(live[0][2], 64);

        let blacked = render_universes(&show, &[def], &Programmer::default(), true);
        assert_eq!(blacked[0][0..3], [0, 0, 0]);
    }
}
