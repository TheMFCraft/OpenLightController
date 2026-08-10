use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap, HashSet};
use uuid::Uuid;

pub const UNIVERSE_COUNT: usize = 4;
pub const CHANNELS_PER_UNIVERSE: usize = 512;
pub const PLAYBACK_COUNT: usize = 8;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "snake_case")]
pub enum FeatureGroup {
    Dimmer,
    Color,
    Position,
    Beam,
    Gobo,
    ColorWheel,
    Other,
}

/// Discrete DMX range shown as a labeled selector in the programmer.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributeChoice {
    pub label: String,
    pub dmx_min: u8,
    pub dmx_max: u8,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributeDef {
    pub name: String,
    pub feature_group: FeatureGroup,
    pub offset: u16,
    pub fine_offset: Option<u16>,
    pub default: u8,
    pub highlight: u8,
    /// If non-empty, the UI prefers a select over a continuous fader.
    #[serde(default)]
    pub choices: Vec<AttributeChoice>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FixtureDefinition {
    pub id: String,
    pub manufacturer: String,
    pub name: String,
    pub mode: String,
    /// e.g. Laser, LED, Moving Light, Effect, Dimmer
    #[serde(default = "default_category")]
    pub category: String,
    pub channel_count: u16,
    pub attributes: Vec<AttributeDef>,
}

fn default_category() -> String {
    "Other".into()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchedFixture {
    pub id: Uuid,
    pub fid: u32,
    pub name: String,
    pub definition_id: String,
    /// 1-based universe index
    pub universe: u8,
    /// 1-based DMX address
    pub address: u16,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Group {
    pub id: Uuid,
    pub name: String,
    pub fixture_ids: Vec<Uuid>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Preset {
    pub id: Uuid,
    pub name: String,
    pub feature_group: FeatureGroup,
    /// attribute name -> 0.0..=1.0
    pub values: BTreeMap<String, f32>,
}

/// Absolute programmer/cue values keyed by fixture id + attribute name.
pub type AttrKey = (Uuid, String);

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct Programmer {
    pub selection: HashSet<Uuid>,
    /// Values currently in the programmer (absolute 0..1)
    pub values: BTreeMap<String, f32>,
}

impl Programmer {
    pub fn clear(&mut self) {
        self.values.clear();
    }

    pub fn clear_all(&mut self) {
        self.values.clear();
        self.selection.clear();
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cue {
    pub id: Uuid,
    pub number: f32,
    pub name: String,
    pub fade_ms: u64,
    /// Tracking deltas: only attributes that change in this cue
    /// key format: "{fixture_id}|{attribute}"
    pub values: BTreeMap<String, f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CueList {
    pub id: Uuid,
    pub name: String,
    pub cues: Vec<Cue>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackSlot {
    pub index: usize,
    pub label: String,
    pub cue_list_id: Option<Uuid>,
    /// 0.0..=1.0
    pub fader: f32,
    pub current_cue_index: Option<usize>,
    #[serde(skip)]
    pub fade: Option<FadeState>,
}

#[derive(Debug, Clone)]
pub struct FadeState {
    pub from: BTreeMap<String, f32>,
    pub to: BTreeMap<String, f32>,
    pub started_ms: u64,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UniverseMapEntry {
    pub internal_universe: u8,
    pub artnet_net: u8,
    pub artnet_subnet: u8,
    pub artnet_universe: u8,
    pub sacn_universe: u16,
    pub artnet_enabled: bool,
    pub sacn_enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OutputConfig {
    pub artnet_enabled: bool,
    pub sacn_enabled: bool,
    pub artnet_target: String,
    pub artnet_broadcast: bool,
    pub sacn_priority: u8,
    pub universes: Vec<UniverseMapEntry>,
}

impl Default for OutputConfig {
    fn default() -> Self {
        let universes = (1..=UNIVERSE_COUNT as u8)
            .map(|u| UniverseMapEntry {
                internal_universe: u,
                artnet_net: 0,
                artnet_subnet: 0,
                artnet_universe: u - 1,
                sacn_universe: u as u16,
                artnet_enabled: true,
                sacn_enabled: true,
            })
            .collect();
        Self {
            artnet_enabled: true,
            sacn_enabled: false,
            artnet_target: "255.255.255.255".into(),
            artnet_broadcast: true,
            sacn_priority: 100,
            universes,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShowFile {
    pub name: String,
    pub fixtures: Vec<PatchedFixture>,
    pub groups: Vec<Group>,
    pub presets: Vec<Preset>,
    pub cue_lists: Vec<CueList>,
    pub playbacks: Vec<PlaybackSlot>,
    pub output: OutputConfig,
    pub next_fid: u32,
}

impl Default for ShowFile {
    fn default() -> Self {
        let playbacks = (0..PLAYBACK_COUNT)
            .map(|i| PlaybackSlot {
                index: i,
                label: format!("PB{}", i + 1),
                cue_list_id: None,
                fader: if i == 0 { 1.0 } else { 0.0 },
                current_cue_index: None,
                fade: None,
            })
            .collect();
        Self {
            name: "Untitled Show".into(),
            fixtures: vec![],
            groups: vec![],
            presets: vec![],
            cue_lists: vec![],
            playbacks,
            output: OutputConfig::default(),
            next_fid: 1,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShowStateDto {
    pub name: String,
    pub fixtures: Vec<PatchedFixture>,
    pub groups: Vec<Group>,
    pub presets: Vec<Preset>,
    pub cue_lists: Vec<CueList>,
    pub playbacks: Vec<PlaybackSlotDto>,
    pub output: OutputConfig,
    pub output_enabled: bool,
    pub blackout: bool,
    pub programmer: ProgrammerDto,
    pub definitions: Vec<FixtureDefinition>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaybackSlotDto {
    pub index: usize,
    pub label: String,
    pub cue_list_id: Option<Uuid>,
    pub fader: f32,
    pub current_cue_index: Option<usize>,
    pub fading: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProgrammerDto {
    pub selection: Vec<Uuid>,
    pub values: BTreeMap<String, f32>,
}

pub fn attr_key(fixture_id: Uuid, attr: &str) -> String {
    format!("{fixture_id}|{attr}")
}

pub fn parse_attr_key(key: &str) -> Option<(Uuid, String)> {
    let (id, attr) = key.split_once('|')?;
    Some((Uuid::parse_str(id).ok()?, attr.to_string()))
}

pub type TrackedState = BTreeMap<String, f32>;

pub fn rebuild_tracked(cues: &[Cue], up_to_index: usize) -> TrackedState {
    let mut state = BTreeMap::new();
    for cue in cues.iter().take(up_to_index + 1) {
        for (k, v) in &cue.values {
            state.insert(k.clone(), *v);
        }
    }
    state
}

#[derive(Debug, Clone)]
pub struct ResolvedChannel {
    pub universe: u8,
    pub channel: u16, // 1-based
    pub value: u8,
    pub is_dimmer: bool,
}

/// Build coarse(+fine) DMX values from 0..1 attribute value
pub fn value_to_dmx(v: f32, has_fine: bool) -> (u8, Option<u8>) {
    let clamped = v.clamp(0.0, 1.0);
    if has_fine {
        let full = (clamped * 65535.0).round() as u16;
        (((full >> 8) as u8), Some((full & 0xFF) as u8))
    } else {
        (((clamped * 255.0).round() as u8), None)
    }
}

pub fn definitions_by_id(defs: &[FixtureDefinition]) -> HashMap<String, FixtureDefinition> {
    defs.iter().map(|d| (d.id.clone(), d.clone())).collect()
}
