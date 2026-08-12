use std::collections::BTreeMap;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

use uuid::Uuid;

use super::merge::{advance_fades, playback_current_state, render_universes};
use super::model::*;

fn now_ms() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

pub struct ShowEngine {
    pub show: ShowFile,
    pub definitions: Vec<FixtureDefinition>,
    pub programmer: Programmer,
    pub output_enabled: bool,
    pub blackout: bool,
}

impl ShowEngine {
    pub fn new_with_builtin_library() -> Self {
        Self {
            show: ShowFile::default(),
            definitions: builtin_definitions(),
            programmer: Programmer::default(),
            output_enabled: false,
            blackout: false,
        }
    }

    pub fn state_dto(&self) -> ShowStateDto {
        ShowStateDto {
            name: self.show.name.clone(),
            fixtures: self.show.fixtures.clone(),
            groups: self.show.groups.clone(),
            presets: self.show.presets.clone(),
            cue_lists: self.show.cue_lists.clone(),
            playbacks: self
                .show
                .playbacks
                .iter()
                .map(|p| PlaybackSlotDto {
                    index: p.index,
                    label: p.label.clone(),
                    cue_list_id: p.cue_list_id,
                    fader: p.fader,
                    current_cue_index: p.current_cue_index,
                    fading: p.fade.is_some(),
                })
                .collect(),
            output: self.show.output.clone(),
            output_enabled: self.output_enabled,
            blackout: self.blackout,
            programmer: ProgrammerDto {
                selection: self.programmer.selection.iter().copied().collect(),
                values: self.programmer.values.clone(),
            },
            definitions: self.definitions.clone(),
        }
    }

    pub fn render(&mut self) -> [[u8; CHANNELS_PER_UNIVERSE]; UNIVERSE_COUNT] {
        advance_fades(&mut self.show);
        render_universes(
            &self.show,
            &self.definitions,
            &self.programmer,
            self.blackout,
        )
    }

    pub fn patch_fixture(
        &mut self,
        definition_id: String,
        name: Option<String>,
        universe: u8,
        address: u16,
    ) -> Result<PatchedFixture, String> {
        self.patch_fixtures(definition_id, name, universe, address, 1, None)?
            .into_iter()
            .next()
            .ok_or_else(|| "Patch failed".to_string())
    }

    /// Patch `quantity` fixtures starting at `address`.
    /// `offset` is the address step between fixtures (defaults to channel count).
    pub fn patch_fixtures(
        &mut self,
        definition_id: String,
        name: Option<String>,
        universe: u8,
        address: u16,
        quantity: u16,
        offset: Option<u16>,
    ) -> Result<Vec<PatchedFixture>, String> {
        if quantity == 0 {
            return Err("Quantity must be at least 1".into());
        }
        let def = self
            .definitions
            .iter()
            .find(|d| d.id == definition_id)
            .ok_or_else(|| format!("Unknown definition: {definition_id}"))?
            .clone();
        if universe == 0 || universe as usize > UNIVERSE_COUNT {
            return Err("Universe out of range".into());
        }
        let step = offset.unwrap_or(def.channel_count);
        if step == 0 {
            return Err("Offset must be at least 1".into());
        }
        if step < def.channel_count {
            return Err(format!(
                "Offset ({step}) must be >= channel count ({})",
                def.channel_count
            ));
        }

        // Validate all addresses first
        let mut planned: Vec<u16> = Vec::with_capacity(quantity as usize);
        for i in 0..quantity {
            let addr = address
                .checked_add(i.saturating_mul(step))
                .ok_or("Address overflow")?;
            if addr == 0
                || addr as usize + def.channel_count as usize - 1 > CHANNELS_PER_UNIVERSE
            {
                return Err(format!(
                    "Address out of range for fixture {}/{} at {}",
                    i + 1,
                    quantity,
                    addr
                ));
            }
            let new_end = addr + def.channel_count - 1;
            for fx in &self.show.fixtures {
                if fx.universe != universe {
                    continue;
                }
                let Some(existing) = self.definitions.iter().find(|d| d.id == fx.definition_id)
                else {
                    continue;
                };
                let ex_end = fx.address + existing.channel_count - 1;
                if addr <= ex_end && new_end >= fx.address {
                    return Err(format!(
                        "DMX overlap with {} at U{}:{} (planned U{}:{})",
                        fx.name, fx.universe, fx.address, universe, addr
                    ));
                }
            }
            // also check against other planned fixtures in this batch
            for (j, prev) in planned.iter().enumerate() {
                let prev_end = prev + def.channel_count - 1;
                if addr <= prev_end && new_end >= *prev {
                    return Err(format!(
                        "Overlap within batch between fixture {} and {}",
                        j + 1,
                        i + 1
                    ));
                }
            }
            planned.push(addr);
        }

        let base_name = name.unwrap_or_else(|| def.name.clone());
        let mut created = Vec::with_capacity(quantity as usize);
        for addr in planned {
            let fid = self.show.next_fid;
            let fixture_name = if quantity == 1 {
                format!("{base_name}")
            } else {
                format!("{base_name} {fid}")
            };
            let patched = PatchedFixture {
                id: Uuid::new_v4(),
                fid,
                name: fixture_name,
                definition_id: definition_id.clone(),
                universe,
                address: addr,
            };
            self.show.next_fid += 1;
            self.show.fixtures.push(patched.clone());
            created.push(patched);
        }
        Ok(created)
    }

    pub fn unpatch_fixture(&mut self, id: Uuid) -> Result<(), String> {
        let before = self.show.fixtures.len();
        self.show.fixtures.retain(|f| f.id != id);
        if self.show.fixtures.len() == before {
            return Err("Fixture not found".into());
        }
        self.programmer.selection.remove(&id);
        for g in &mut self.show.groups {
            g.fixture_ids.retain(|fid| *fid != id);
        }
        Ok(())
    }

    pub fn select_fixtures(&mut self, ids: Vec<Uuid>, additive: bool) {
        if !additive {
            self.programmer.selection.clear();
        }
        self.programmer.selection.extend(ids);
    }

    pub fn select_group(&mut self, group_id: Uuid, additive: bool) -> Result<(), String> {
        let group = self
            .show
            .groups
            .iter()
            .find(|g| g.id == group_id)
            .ok_or("Group not found")?;
        let ids = group.fixture_ids.clone();
        self.select_fixtures(ids, additive);
        Ok(())
    }

    pub fn set_attribute(&mut self, name: String, value: f32) -> Result<(), String> {
        if self.programmer.selection.is_empty() {
            return Err("No fixtures selected".into());
        }
        self.programmer
            .values
            .insert(name, value.clamp(0.0, 1.0));
        Ok(())
    }

    pub fn set_attributes(&mut self, values: BTreeMap<String, f32>) -> Result<(), String> {
        if self.programmer.selection.is_empty() {
            return Err("No fixtures selected".into());
        }
        for (name, value) in values {
            self.programmer
                .values
                .insert(name, value.clamp(0.0, 1.0));
        }
        Ok(())
    }

    pub fn set_blackout(&mut self, enabled: bool) {
        self.blackout = enabled;
    }

    pub fn toggle_blackout(&mut self) -> bool {
        self.blackout = !self.blackout;
        self.blackout
    }

    pub fn select_fixture_by_fid(&mut self, fid: u32, additive: bool) -> Result<(), String> {
        let fx = self
            .show
            .fixtures
            .iter()
            .find(|f| f.fid == fid)
            .ok_or_else(|| format!("No fixture with FID {fid}"))?;
        let id = fx.id;
        self.select_fixtures(vec![id], additive);
        Ok(())
    }

    pub fn store_group(&mut self, name: String) -> Result<Group, String> {
        if self.programmer.selection.is_empty() {
            return Err("No fixtures selected".into());
        }
        let group = Group {
            id: Uuid::new_v4(),
            name,
            fixture_ids: self.programmer.selection.iter().copied().collect(),
        };
        self.show.groups.push(group.clone());
        Ok(group)
    }

    pub fn delete_group(&mut self, id: Uuid) -> Result<(), String> {
        let before = self.show.groups.len();
        self.show.groups.retain(|g| g.id != id);
        if self.show.groups.len() == before {
            return Err("Group not found".into());
        }
        Ok(())
    }

    fn next_preset_number(&self) -> f32 {
        self.show
            .presets
            .iter()
            .map(|p| p.number)
            .max_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal))
            .map(|n| n.floor() + 1.0)
            .unwrap_or(1.0)
    }

    fn fixture_has_attribute(&self, fixture_id: Uuid, attr: &str) -> bool {
        self.show
            .fixtures
            .iter()
            .find(|f| f.id == fixture_id)
            .and_then(|f| self.definitions.iter().find(|d| d.id == f.definition_id))
            .map(|d| d.attributes.iter().any(|a| a.name == attr))
            .unwrap_or(false)
    }

    fn attribute_feature_group(&self, fixture_id: Uuid, attr: &str) -> Option<FeatureGroup> {
        self.show
            .fixtures
            .iter()
            .find(|f| f.id == fixture_id)
            .and_then(|f| self.definitions.iter().find(|d| d.id == f.definition_id))
            .and_then(|d| d.attributes.iter().find(|a| a.name == attr))
            .map(|a| a.feature_group.clone())
    }

    fn collect_preset_values(
        &self,
        feature_group: FeatureGroup,
        covers_all: bool,
    ) -> Result<BTreeMap<String, f32>, String> {
        if self.programmer.values.is_empty() {
            return Err("Programmer empty".into());
        }
        if covers_all {
            return Ok(self.programmer.values.clone());
        }
        let mut values = BTreeMap::new();
        for (attr, v) in &self.programmer.values {
            let keep = self.programmer.selection.iter().any(|fx_id| {
                self.attribute_feature_group(*fx_id, attr)
                    .map(|fg| fg == feature_group)
                    .unwrap_or(false)
            });
            if keep {
                values.insert(attr.clone(), *v);
            }
        }
        if values.is_empty() {
            return Err("No attributes for feature group in programmer".into());
        }
        Ok(values)
    }

    pub fn store_preset(
        &mut self,
        name: String,
        feature_group: FeatureGroup,
        covers_all: bool,
    ) -> Result<Preset, String> {
        let values = self.collect_preset_values(feature_group.clone(), covers_all)?;
        let preset = Preset {
            id: Uuid::new_v4(),
            number: self.next_preset_number(),
            name,
            feature_group,
            covers_all,
            values,
        };
        self.show.presets.push(preset.clone());
        Ok(preset)
    }

    pub fn update_preset(
        &mut self,
        id: Uuid,
        name: Option<String>,
        refresh_from_programmer: bool,
    ) -> Result<Preset, String> {
        let idx = self
            .show
            .presets
            .iter()
            .position(|p| p.id == id)
            .ok_or("Preset not found")?;
        if let Some(name) = name {
            self.show.presets[idx].name = name;
        }
        if refresh_from_programmer {
            let feature_group = self.show.presets[idx].feature_group.clone();
            let covers_all = self.show.presets[idx].covers_all;
            let values = self.collect_preset_values(feature_group, covers_all)?;
            self.show.presets[idx].values = values;
        }
        Ok(self.show.presets[idx].clone())
    }

    pub fn duplicate_preset(&mut self, id: Uuid, name: Option<String>) -> Result<Preset, String> {
        let source = self
            .show
            .presets
            .iter()
            .find(|p| p.id == id)
            .ok_or("Preset not found")?
            .clone();
        let preset = Preset {
            id: Uuid::new_v4(),
            number: self.next_preset_number(),
            name: name.unwrap_or_else(|| format!("{} copy", source.name)),
            feature_group: source.feature_group,
            covers_all: source.covers_all,
            values: source.values,
        };
        self.show.presets.push(preset.clone());
        Ok(preset)
    }

    pub fn apply_preset(&mut self, id: Uuid, replace: bool) -> Result<(), String> {
        let preset = self
            .show
            .presets
            .iter()
            .find(|p| p.id == id)
            .ok_or("Preset not found")?
            .clone();
        if self.programmer.selection.is_empty() {
            return Err("No fixtures selected".into());
        }
        if replace && !preset.covers_all {
            let to_remove: Vec<String> = self
                .programmer
                .values
                .keys()
                .filter(|attr| {
                    self.programmer.selection.iter().any(|fx_id| {
                        self.attribute_feature_group(*fx_id, attr)
                            .map(|fg| fg == preset.feature_group)
                            .unwrap_or(false)
                    })
                })
                .cloned()
                .collect();
            for key in to_remove {
                self.programmer.values.remove(&key);
            }
        } else if replace {
            self.programmer.values.clear();
        }
        for (attr, value) in preset.values {
            let relevant = self
                .programmer
                .selection
                .iter()
                .any(|fx_id| self.fixture_has_attribute(*fx_id, &attr));
            if relevant {
                self.programmer.values.insert(attr, value);
            }
        }
        Ok(())
    }

    pub fn delete_preset(&mut self, id: Uuid) -> Result<(), String> {
        let before = self.show.presets.len();
        self.show.presets.retain(|p| p.id != id);
        if self.show.presets.len() == before {
            return Err("Preset not found".into());
        }
        Ok(())
    }

    pub fn create_cue_list(&mut self, name: String) -> CueList {
        let list = CueList {
            id: Uuid::new_v4(),
            name,
            cues: vec![],
        };
        // Auto-assign to first free playback if none assigned
        if self.show.playbacks.iter().all(|p| p.cue_list_id.is_none()) {
            self.show.playbacks[0].cue_list_id = Some(list.id);
            self.show.playbacks[0].label = list.name.clone();
        }
        self.show.cue_lists.push(list.clone());
        list
    }

    pub fn store_cue(
        &mut self,
        cue_list_id: Uuid,
        name: String,
        fade_ms: u64,
    ) -> Result<Cue, String> {
        if self.programmer.selection.is_empty() || self.programmer.values.is_empty() {
            return Err("Nothing to store".into());
        }
        let list = self
            .show
            .cue_lists
            .iter_mut()
            .find(|c| c.id == cue_list_id)
            .ok_or("Cue list not found")?;

        let number = list
            .cues
            .last()
            .map(|c| (c.number.floor() as i32 + 1) as f32)
            .unwrap_or(1.0);

        let mut values = BTreeMap::new();
        for fx_id in &self.programmer.selection {
            for (attr, v) in &self.programmer.values {
                // only store if fixture has attribute
                let has = self
                    .show
                    .fixtures
                    .iter()
                    .find(|f| f.id == *fx_id)
                    .and_then(|f| self.definitions.iter().find(|d| d.id == f.definition_id))
                    .map(|d| d.attributes.iter().any(|a| a.name == *attr))
                    .unwrap_or(false);
                if has {
                    values.insert(attr_key(*fx_id, attr), *v);
                }
            }
        }

        let cue = Cue {
            id: Uuid::new_v4(),
            number,
            name,
            fade_ms,
            values,
        };
        list.cues.push(cue.clone());
        self.programmer.clear();
        Ok(cue)
    }

    pub fn delete_cue(&mut self, cue_list_id: Uuid, cue_id: Uuid) -> Result<(), String> {
        let list = self
            .show
            .cue_lists
            .iter_mut()
            .find(|c| c.id == cue_list_id)
            .ok_or("Cue list not found")?;
        let before = list.cues.len();
        list.cues.retain(|c| c.id != cue_id);
        if list.cues.len() == before {
            return Err("Cue not found".into());
        }
        Ok(())
    }

    pub fn assign_playback(
        &mut self,
        index: usize,
        cue_list_id: Option<Uuid>,
        label: Option<String>,
    ) -> Result<(), String> {
        let pb = self
            .show
            .playbacks
            .get_mut(index)
            .ok_or("Playback index out of range")?;
        if let Some(id) = cue_list_id {
            if !self.show.cue_lists.iter().any(|c| c.id == id) {
                return Err("Cue list not found".into());
            }
        }
        pb.cue_list_id = cue_list_id;
        pb.current_cue_index = None;
        pb.fade = None;
        if let Some(l) = label {
            pb.label = l;
        } else if let Some(id) = cue_list_id {
            if let Some(list) = self.show.cue_lists.iter().find(|c| c.id == id) {
                pb.label = list.name.clone();
            }
        }
        Ok(())
    }

    pub fn set_playback_fader(&mut self, index: usize, value: f32) -> Result<(), String> {
        let pb = self
            .show
            .playbacks
            .get_mut(index)
            .ok_or("Playback index out of range")?;
        pb.fader = value.clamp(0.0, 1.0);
        Ok(())
    }

    pub fn playback_go(&mut self, index: usize) -> Result<(), String> {
        let list_id = self
            .show
            .playbacks
            .get(index)
            .ok_or("Playback index out of range")?
            .cue_list_id
            .ok_or("No cue list assigned")?;

        let cues_len = self
            .show
            .cue_lists
            .iter()
            .find(|c| c.id == list_id)
            .map(|c| c.cues.len())
            .ok_or("Cue list not found")?;
        if cues_len == 0 {
            return Err("Cue list empty".into());
        }

        let pb = &self.show.playbacks[index];
        let next_idx = match pb.current_cue_index {
            None => 0,
            Some(i) if i + 1 < cues_len => i + 1,
            Some(_) => return Err("Already at last cue".into()),
        };

        self.goto_cue_on_playback(index, next_idx)
    }

    /// Jump to a specific cue by list + cue id (used by Stream Deck).
    pub fn fire_cue(&mut self, cue_list_id: Uuid, cue_id: Uuid) -> Result<(), String> {
        let cue_index = self
            .show
            .cue_lists
            .iter()
            .find(|c| c.id == cue_list_id)
            .ok_or("Cue list not found")?
            .cues
            .iter()
            .position(|c| c.id == cue_id)
            .ok_or("Cue not found")?;

        let pb_index = self
            .show
            .playbacks
            .iter()
            .position(|p| p.cue_list_id == Some(cue_list_id))
            .unwrap_or(0);

        if self.show.playbacks[pb_index].cue_list_id != Some(cue_list_id) {
            self.assign_playback(pb_index, Some(cue_list_id), None)?;
        }

        self.goto_cue_on_playback(pb_index, cue_index)
    }

    fn goto_cue_on_playback(&mut self, index: usize, cue_index: usize) -> Result<(), String> {
        let list_id = self
            .show
            .playbacks
            .get(index)
            .ok_or("Playback index out of range")?
            .cue_list_id
            .ok_or("No cue list assigned")?;

        let list = self
            .show
            .cue_lists
            .iter()
            .find(|c| c.id == list_id)
            .ok_or("Cue list not found")?;
        if cue_index >= list.cues.len() {
            return Err("Cue index out of range".into());
        }

        let pb = &self.show.playbacks[index];
        let from = if pb.current_cue_index.is_some() {
            playback_current_state(&self.show, pb)
        } else {
            BTreeMap::new()
        };
        let to = rebuild_tracked(&list.cues, cue_index);
        let fade_ms = list.cues[cue_index].fade_ms;

        let pb = &mut self.show.playbacks[index];
        pb.current_cue_index = Some(cue_index);
        if fade_ms > 0 {
            pb.fade = Some(FadeState {
                from,
                to,
                started_ms: now_ms(),
                duration_ms: fade_ms,
            });
        } else {
            pb.fade = None;
        }
        if pb.fader < 0.01 {
            pb.fader = 1.0;
        }
        Ok(())
    }

    pub fn playback_back(&mut self, index: usize) -> Result<(), String> {
        let list_id = self
            .show
            .playbacks
            .get(index)
            .ok_or("Playback index out of range")?
            .cue_list_id
            .ok_or("No cue list assigned")?;

        let pb = &self.show.playbacks[index];
        let current = pb.current_cue_index.ok_or("No active cue")?;
        if current == 0 {
            let pb = &mut self.show.playbacks[index];
            pb.current_cue_index = None;
            pb.fade = None;
            return Ok(());
        }
        let next_idx = current - 1;
        let from = playback_current_state(&self.show, pb);
        let list = self
            .show
            .cue_lists
            .iter()
            .find(|c| c.id == list_id)
            .ok_or("Cue list not found")?;
        let to = rebuild_tracked(&list.cues, next_idx);
        let fade_ms = list.cues[current].fade_ms;

        let pb = &mut self.show.playbacks[index];
        pb.current_cue_index = Some(next_idx);
        if fade_ms > 0 {
            pb.fade = Some(FadeState {
                from,
                to,
                started_ms: now_ms(),
                duration_ms: fade_ms,
            });
        } else {
            pb.fade = None;
        }
        Ok(())
    }

    pub fn new_show(&mut self) {
        self.show = ShowFile::default();
        self.programmer = Programmer::default();
        self.output_enabled = false;
        self.blackout = false;
    }

    pub fn set_show_name(&mut self, name: String) {
        let trimmed = name.trim();
        self.show.name = if trimmed.is_empty() {
            "Untitled Show".into()
        } else {
            trimmed.to_string()
        };
    }

    pub fn save_to_path(&self, path: &Path) -> Result<(), String> {
        crate::showfile::save(path, &self.show)
    }

    pub fn load_from_path(&mut self, path: &Path) -> Result<(), String> {
        let show = crate::showfile::load(path)?;
        self.show = show;
        self.programmer = Programmer::default();
        Ok(())
    }
}

pub use super::library::builtin_definitions;
