import { useMemo } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import type { AttributeChoice, AttributeDef } from "../types";
import { ColorWheel } from "./ColorWheel";
import styles from "./AttributePanel.module.css";

function dmxFromNorm(value: number): number {
  return Math.round(Math.min(1, Math.max(0, value)) * 255);
}

function choiceForValue(choices: AttributeChoice[], value: number): AttributeChoice | undefined {
  const dmx = Math.round(Math.min(1, Math.max(0, value)) * 255);
  return (
    choices.find((c) => dmx >= c.dmxMin && dmx <= c.dmxMax) ??
    choices.reduce<AttributeChoice | undefined>((best, c) => {
      const mid = (c.dmxMin + c.dmxMax) / 2;
      const bestMid = best ? (best.dmxMin + best.dmxMax) / 2 : Number.POSITIVE_INFINITY;
      return Math.abs(mid - dmx) < Math.abs(bestMid - dmx) ? c : best;
    }, undefined)
  );
}

function setChoiceValue(choice: AttributeChoice): number {
  return (choice.dmxMin + choice.dmxMax) / 2 / 255;
}

function AttrLabel({
  attr,
  trailing,
}: {
  attr: AttributeDef;
  trailing: string;
}) {
  return (
    <label className={styles.label}>
      <span>
        {attr.name} <span className={styles.group}>({attr.featureGroup})</span>
      </span>
      <span className="mono">{trailing}</span>
    </label>
  );
}

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

  const editorAttrs = attributes.filter((a) => {
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
          <div className={styles.stack}>
            <p className="muted">
              {state.programmer.selection.length} selected · values live while in programmer
            </p>

            {(hasRgb || hasWheel) && (
              <ColorWheel hasRgb={hasRgb} hasWheel={hasWheel} hasWhite={hasWhite} />
            )}

            {editorAttrs.map((attr) => {
              const value = state.programmer.values[attr.name] ?? attr.default / 255;
              const choices = attr.choices ?? [];

              if (choices.length > 0) {
                const selected = choiceForValue(choices, value);
                return (
                  <div key={attr.name}>
                    <AttrLabel
                      attr={attr}
                      trailing={selected ? selected.label : `DMX ${dmxFromNorm(value)}`}
                    />
                    <select
                      className={styles.select}
                      value={selected?.label ?? ""}
                      onChange={(e) => {
                        const next = choices.find((c) => c.label === e.target.value);
                        if (!next) return;
                        void run(() => api.setAttribute(attr.name, setChoiceValue(next)));
                      }}
                    >
                      {choices.map((c) => (
                        <option key={c.label} value={c.label}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              return (
                <div key={attr.name}>
                  <AttrLabel attr={attr} trailing={`${Math.round(value * 100)}%`} />
                  <input
                    type="range"
                    min={0}
                    max={1000}
                    value={Math.round(value * 1000)}
                    onChange={(e) =>
                      void run(() => api.setAttribute(attr.name, Number(e.target.value) / 1000))
                    }
                    className={styles.slider}
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
