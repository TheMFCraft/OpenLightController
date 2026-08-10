import { api } from "../api";
import { useConsoleStore } from "../store";

export function PlaybackBar() {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);

  if (!state) return null;

  return (
    <footer
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 1fr)",
        gap: "0.4rem",
        padding: "0.55rem",
        background: "var(--bg-1)",
        border: "1px solid var(--line)",
        borderRadius: 6,
      }}
    >
      {state.playbacks.map((pb) => (
        <div
          key={pb.index}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "0.35rem",
            padding: "0.4rem",
            background: "var(--bg-2)",
            borderRadius: 4,
            border: "1px solid var(--line)",
            minHeight: 180,
          }}
        >
          <div
            className="muted"
            style={{
              fontSize: "0.72rem",
              textAlign: "center",
              width: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
            title={pb.label}
          >
            {pb.label}
            {pb.fading ? " ~" : ""}
            {pb.currentCueIndex != null ? ` #${pb.currentCueIndex + 1}` : ""}
          </div>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(pb.fader * 1000)}
            onChange={(e) =>
              run(() => api.setPlaybackFader(pb.index, Number(e.target.value) / 1000))
            }
            style={{
              writingMode: "vertical-lr",
              direction: "rtl",
              height: 100,
              width: "1.4rem",
              accentColor: "var(--accent)",
            }}
          />
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button type="button" onClick={() => run(() => api.playbackBack(pb.index))}>
              ◀
            </button>
            <button
              type="button"
              className="primary"
              onClick={() => run(() => api.playbackGo(pb.index))}
            >
              GO
            </button>
          </div>
        </div>
      ))}
    </footer>
  );
}
