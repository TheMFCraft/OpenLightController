use std::fs;
use std::path::Path;

use crate::engine::model::ShowFile;

pub fn save(path: &Path, show: &ShowFile) -> Result<(), String> {
    let json = serde_json::to_string_pretty(show).map_err(|e| e.to_string())?;
    fs::write(path, json).map_err(|e| e.to_string())
}

pub fn load(path: &Path) -> Result<ShowFile, String> {
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn roundtrip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("show.json");
        let show = ShowFile::default();
        save(&path, &show).unwrap();
        let loaded = load(&path).unwrap();
        assert_eq!(loaded.name, show.name);
        assert_eq!(loaded.playbacks.len(), show.playbacks.len());
    }
}
