import { useMemo } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import type { AttributeDef } from "../types";
import { ColorWheel } from "./ColorWheel";

export function AttributePanel() {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);

  const attributes = useMemo(() => {
    if (!state || state.programmer.selection.length === 0) return [] as AttributeDef[];
    const map = new Map<string, AttributeDef>();
    for (const id of state.programmer.selection) {
      const fx = state.fixtures.find((f) => f.id === id);
      if (!fx) continue;
      const def = state.definitions.find((d) => d.id === fx.definitionId);
      if (!def) continue;
      for (const attr of def.attributes) {
        if (!map.has(attr.name)) map.set(attr.name, attr);
      }
    }
    return [...map.values()];
  }, [state]);

  const hasRgb = attributes.some((a) => a.name === "red" || a.name === "green" || a.name === "blue");
  const hasWhite = attributes.some((a) => a.name === "white");
  const hasWheel = attributes.some((a) => a.name === "color_wheel");

  const sliderAttrs = attributes.filter((a) => {
    if (hasRgb && ["red", "green", "blue"].includes(a.name)) return false;
    if (hasWheel && a.name === "color_wheel") return false;
    return true;
  });

  if (!state) return null;

  return (
    <section className="panel">
      <h2>Programmer</h2>
      <div className="panel-body">
        {state.programmer.selection.length === 0 ? (
          <p className="muted">Select fixtures to edit attributes.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <p className="muted">
              {state.programmer.selection.length} selected · values live while in programmer
            </p>

            {(hasRgb || hasWheel) && (
              <ColorWheel hasRgb={hasRgb} hasWheel={hasWheel} hasWhite={hasWhite} />
            )}

            {sliderAttrs.map((attr) => {
              const value = state.programmer.values[attr.name] ?? attr.default / 255;
              return (
                <div key={attr.name}>
                  <label
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "0.8rem",
                      marginBottom: "0.2rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: "var(--muted)",
                    }}
                  >
                    <span>
                      {attr.name}{" "}
                      <span style={{ opacity: 0.6 }}>({attr.featureGroup})</span>
                    </span>
                    <span className="mono">{Math.round(value * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={Math.round(value * 1000)}
                    onChange={(e) =>
                      run(() => api.setAttribute(attr.name, Number(e.target.value) / 1000))
                    }
                    style={{ width: "100%", accentColor: "var(--accent-2)" }}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
