import { useState } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";

export function CueListPanel() {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);
  const activeCueListId = useConsoleStore((s) => s.activeCueListId);
  const setActiveCueListId = useConsoleStore((s) => s.setActiveCueListId);
  const [listName, setListName] = useState("Main");
  const [cueName, setCueName] = useState("Cue");
  const [fadeMs, setFadeMs] = useState(1000);

  if (!state) return null;
  const list = state.cueLists.find((c) => c.id === activeCueListId) ?? state.cueLists[0];

  return (
    <section className="panel">
      <h2>Cue Lists</h2>
      <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        <div className="row">
          <input
            type="text"
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            onClick={async () => {
              const next = await run(() => api.createCueList(listName));
              if (next && typeof next === "object" && "cueLists" in next) {
                const created = next.cueLists[next.cueLists.length - 1];
                if (created) setActiveCueListId(created.id);
              }
            }}
          >
            New List
          </button>
        </div>

        {state.cueLists.length > 0 && (
          <select
            value={list?.id ?? ""}
            onChange={(e) => setActiveCueListId(e.target.value)}
          >
            {state.cueLists.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.cues.length})
              </option>
            ))}
          </select>
        )}

        {list && (
          <>
            <div className="row">
              <input
                type="text"
                value={cueName}
                onChange={(e) => setCueName(e.target.value)}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                min={0}
                step={100}
                value={fadeMs}
                onChange={(e) => setFadeMs(Number(e.target.value))}
                title="Fade ms"
                style={{ width: 90 }}
              />
              <button
                type="button"
                className="primary"
                onClick={() => run(() => api.storeCue(list.id, cueName, fadeMs))}
              >
                Store Cue
              </button>
            </div>
            <div>
              {list.cues.length === 0 ? (
                <p className="muted">No cues yet. Set programmer values and store.</p>
              ) : (
                list.cues.map((cue) => (
                  <div
                    key={cue.id}
                    className="row"
                    style={{ justifyContent: "space-between", marginTop: "0.25rem" }}
                  >
                    <span className="mono">
                      {cue.number.toFixed(1)} {cue.name}{" "}
                      <span className="muted">{cue.fadeMs}ms</span>
                    </span>
                    <button
                      type="button"
                      className="danger"
                      onClick={() => run(() => api.deleteCue(list.id, cue.id))}
                    >
                      Del
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className="row">
              <span className="muted">Assign to playback:</span>
              <select
                defaultValue=""
                onChange={(e) => {
                  const idx = Number(e.target.value);
                  if (!Number.isNaN(idx)) {
                    run(() => api.assignPlayback(idx, list.id));
                  }
                }}
              >
                <option value="" disabled>
                  PB…
                </option>
                {state.playbacks.map((pb) => (
                  <option key={pb.index} value={pb.index}>
                    PB{pb.index + 1}
                  </option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
