import { api } from "../api";
import { useConsoleStore } from "../store";

export function FixtureGrid() {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);

  if (!state) return null;
  const selected = new Set(state.programmer.selection);

  return (
    <section className="panel">
      <h2>Fixtures</h2>
      <div className="panel-body">
        {state.fixtures.length === 0 ? (
          <p className="muted">No fixtures patched. Open Patch to add fixtures.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
              gap: "0.4rem",
            }}
          >
            {state.fixtures.map((fx) => {
              const isSelected = selected.has(fx.id);
              return (
                <button
                  key={fx.id}
                  type="button"
                  onClick={(e) =>
                    run(() => api.selectFixtures([fx.id], e.shiftKey || e.metaKey))
                  }
                  style={{
                    textAlign: "left",
                    padding: "0.5rem",
                    minHeight: 74,
                    borderColor: isSelected ? "var(--accent)" : undefined,
                    background: isSelected ? "var(--selected)" : undefined,
                  }}
                >
                  <div
                    className="mono"
                    style={{ fontSize: "0.75rem", color: "var(--accent-2)" }}
                  >
                    FID {fx.fid}
                  </div>
                  <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{fx.name}</div>
                  <div className="mono muted" style={{ fontSize: "0.7rem" }}>
                    U{fx.universe}:{fx.address}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        <div className="row" style={{ marginTop: "0.75rem" }}>
          <button type="button" onClick={() => run(() => api.clearProgrammer())}>
            Clear
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => run(() => api.clearProgrammerAll())}
          >
            Clear All
          </button>
        </div>
      </div>
    </section>
  );
}
