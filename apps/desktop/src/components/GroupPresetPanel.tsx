import { useState } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import type { FeatureGroup } from "../types";

export function GroupPresetPanel() {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);
  const [groupName, setGroupName] = useState("Group");
  const [presetName, setPresetName] = useState("Preset");
  const [featureGroup, setFeatureGroup] = useState<FeatureGroup>("dimmer");

  if (!state) return null;

  return (
    <section className="panel">
      <h2>Groups & Presets</h2>
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
        <div>
          <div className="muted" style={{ marginBottom: "0.35rem" }}>
            Groups
          </div>
          <div className="row">
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              style={{ flex: 1 }}
            />
            <button type="button" onClick={() => run(() => api.storeGroup(groupName))}>
              Store
            </button>
          </div>
          {state.groups.map((g) => (
            <div
              key={g.id}
              className="row"
              style={{ justifyContent: "space-between", marginTop: "0.35rem" }}
            >
              <button
                type="button"
                onClick={(e) =>
                  run(() => api.selectGroup(g.id, e.shiftKey || e.metaKey))
                }
              >
                {g.name} ({g.fixtureIds.length})
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => run(() => api.deleteGroup(g.id))}
              >
                Del
              </button>
            </div>
          ))}
        </div>

        <div>
          <div className="muted" style={{ marginBottom: "0.35rem" }}>
            Presets
          </div>
          <div className="row">
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              style={{ flex: 1 }}
            />
            <select
              value={featureGroup}
              onChange={(e) => setFeatureGroup(e.target.value as FeatureGroup)}
            >
              <option value="dimmer">Dimmer</option>
              <option value="color">Color</option>
              <option value="position">Position</option>
              <option value="beam">Beam / Shutter</option>
              <option value="color_wheel">Color Wheel</option>
            </select>
            <button
              type="button"
              onClick={() => run(() => api.storePreset(presetName, featureGroup))}
            >
              Store
            </button>
          </div>
          {state.presets.map((p) => (
            <div
              key={p.id}
              className="row"
              style={{ justifyContent: "space-between", marginTop: "0.35rem" }}
            >
              <button type="button" onClick={() => run(() => api.applyPreset(p.id))}>
                {p.name} · {p.featureGroup}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => run(() => api.deletePreset(p.id))}
              >
                Del
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
