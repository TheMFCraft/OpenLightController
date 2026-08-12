import { useMemo, useState } from "react";
import { api } from "../api";
import {
  PRESET_BANKS,
  presetAttributePreview,
  presetMatchesBank,
  presetScopeLabel,
  sortPresets,
  STORE_SCOPES,
  storeScopeToArgs,
  type PresetBank,
} from "../presetUtils";
import { useConsoleStore } from "../store";
import type { Preset } from "../types";
import { MenuSelect } from "./MenuSelect";
import { TouchTextInput } from "./TouchTextInput";
import styles from "./PresetPanel.module.css";

export function PresetPanel() {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);
  const [bank, setBank] = useState<PresetBank>("all");
  const [search, setSearch] = useState("");
  const [nameDraft, setNameDraft] = useState("Preset");
  const [storeScope, setStoreScope] = useState<PresetBank>("dimmer");
  const [replaceOnApply, setReplaceOnApply] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const filtered = useMemo(() => {
    if (!state) return [] as Preset[];
    const q = search.trim().toLowerCase();
    return sortPresets(state.presets).filter((preset) => {
      if (!presetMatchesBank(preset, bank)) return false;
      if (!q) return true;
      return (
        preset.name.toLowerCase().includes(q) ||
        presetScopeLabel(preset).toLowerCase().includes(q) ||
        Object.keys(preset.values).some((attr) => attr.toLowerCase().includes(q))
      );
    });
  }, [state, bank, search]);

  if (!state) return null;

  const storePreset = () => {
    const name = nameDraft.trim() || "Preset";
    const { featureGroup, coversAll } = storeScopeToArgs(storeScope);
    void run(() => api.storePreset(name, featureGroup, coversAll));
  };

  const beginRename = (preset: Preset) => {
    setEditingId(preset.id);
    setRenameDraft(preset.name);
  };

  const commitRename = (id: string) => {
    const name = renameDraft.trim();
    if (!name) {
      setEditingId(null);
      return;
    }
    void run(async () => {
      await api.updatePreset(id, name, false);
      setEditingId(null);
    });
  };

  return (
    <section className={`panel ${styles.panel}`}>
      <h2>Presets</h2>
      <div className={styles.body}>
        <div className={styles.bankTabs}>
          {PRESET_BANKS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={bank === tab.id ? styles.bankActive : undefined}
              onClick={() => setBank(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.toolbar}>
          <input
            type="search"
            placeholder="Search presets…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={replaceOnApply}
              onChange={(e) => setReplaceOnApply(e.target.checked)}
            />
            Replace on apply
          </label>
        </div>

        <div className={styles.storeRow}>
          <TouchTextInput
            aria-label="Preset name"
            value={nameDraft}
            onChange={setNameDraft}
            placeholder="Preset name"
          />
          <MenuSelect
            value={storeScope}
            ariaLabel="Store scope"
            options={STORE_SCOPES.map((s) => ({ value: s.id, label: s.label }))}
            onChange={(value) => setStoreScope(value as PresetBank)}
          />
          <button type="button" className="primary" onClick={storePreset}>
            Store
          </button>
        </div>
        <div className="muted" style={{ fontSize: "0.75rem" }}>
          {STORE_SCOPES.find((s) => s.id === storeScope)?.description}
        </div>

        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className="muted">No presets in this bank.</div>
          ) : (
            filtered.map((preset) => (
              <article key={preset.id} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.number}>{preset.number ? `#${preset.number}` : "—"}</span>
                  <span className={styles.scope}>{presetScopeLabel(preset)}</span>
                  <span className={styles.count}>{Object.keys(preset.values).length} attrs</span>
                </div>
                {editingId === preset.id ? (
                  <TouchTextInput
                    aria-label="Rename preset"
                    value={renameDraft}
                    onChange={setRenameDraft}
                    onBlur={() => commitRename(preset.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.currentTarget.blur();
                      } else if (e.key === "Escape") {
                        setEditingId(null);
                      }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    className={styles.nameBtn}
                    onClick={() => beginRename(preset)}
                    title="Click to rename"
                  >
                    {preset.name}
                  </button>
                )}
                <div className={styles.preview} title={Object.keys(preset.values).join(", ")}>
                  {presetAttributePreview(preset)}
                </div>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => run(() => api.applyPreset(preset.id, replaceOnApply))}
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    onClick={() => run(() => api.updatePreset(preset.id, null, true))}
                  >
                    Update
                  </button>
                  <button type="button" onClick={() => run(() => api.duplicatePreset(preset.id))}>
                    Copy
                  </button>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => run(() => api.deletePreset(preset.id))}
                  >
                    Del
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
