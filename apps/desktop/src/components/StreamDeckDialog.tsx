import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import type { DeckKeyMapping, StreamDeckDeviceInfo, StreamDeckStatus } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

const CUE_COLORS: [number, number, number][] = [
  [50, 120, 200],
  [40, 160, 120],
  [180, 100, 40],
  [140, 60, 180],
  [200, 60, 80],
  [60, 140, 180],
];

export function StreamDeckDialog({ open, onClose }: Props) {
  const show = useConsoleStore((s) => s.state);
  const [status, setStatus] = useState<StreamDeckStatus | null>(null);
  const [devices, setDevices] = useState<StreamDeckDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  const cues = useMemo(() => {
    if (!show) return [];
    return show.cueLists.flatMap((list) =>
      list.cues.map((cue) => ({
        listId: list.id,
        listName: list.name,
        cueId: cue.id,
        cueNumber: cue.number,
        cueName: cue.name,
        label: `${list.name} ${cue.number} ${cue.name}`,
      })),
    );
  }, [show]);

  const refresh = async () => {
    try {
      const [st, list] = await Promise.all([
        api.getStreamDeckStatus(),
        api.listStreamDecks().catch(() => [] as StreamDeckDeviceInfo[]),
      ]);
      setStatus(st);
      setDevices(list);
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  };

  useEffect(() => {
    if (open) void refresh();
  }, [open]);

  const cols = Math.max(1, status?.columns || 5);
  const mappingFor = (key: number) => status?.mappings.find((m) => m.key === key);

  const assignCue = async (listId: string, cueId: string, label: string) => {
    if (selectedKey == null) return;
    setBusy(true);
    try {
      const color = CUE_COLORS[selectedKey % CUE_COLORS.length];
      const mapping: DeckKeyMapping = {
        key: selectedKey,
        label: label.slice(0, 12),
        action: { type: "fireCue", cueListId: listId, cueId },
        color,
      };
      const st = await api.assignStreamDeckKey(mapping);
      setStatus(st);
      setError(null);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  const clearKey = async () => {
    if (selectedKey == null) return;
    setBusy(true);
    try {
      const st = await api.assignStreamDeckKey({
        key: selectedKey,
        label: "—",
        action: { type: "empty" },
        color: [28, 28, 28],
      });
      setStatus(st);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const keys = status?.keyCount
    ? Array.from({ length: status.keyCount }, (_, i) => i)
    : [];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgb(0 0 0 / 55%)",
        display: "grid",
        placeItems: "center",
        zIndex: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "min(720px, 96vw)",
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0 }}>Stream Deck</h3>
        <p className="muted" style={{ margin: 0 }}>
          Größe wird automatisch erkannt. Button wählen → Cue zuweisen. Elgato-Software vorher
          beenden.
        </p>

        {error && <div className="errorBar">{error}</div>}

        <div className="row">
          <span>
            Status:{" "}
            <strong>{status?.connected ? "Connected" : "Disconnected"}</strong>
            {status?.kind ? ` · ${status.kind}` : ""}
            {status && status.keyCount > 0
              ? ` · ${status.columns}×${status.rows} (${status.keyCount} keys)`
              : ""}
          </span>
        </div>

        <div>
          <div className="muted" style={{ marginBottom: 6 }}>
            Geräte
          </div>
          {devices.length === 0 ? (
            <p className="muted">Kein Stream Deck gefunden.</p>
          ) : (
            devices.map((d) => (
              <div
                key={d.serial}
                className="row"
                style={{ justifyContent: "space-between", marginBottom: 4 }}
              >
                <span className="mono">
                  {d.kind} · {d.columns}×{d.rows} · {d.keyCount} keys · {d.serial}
                </span>
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const st = await api.connectStreamDeck(d.serial);
                      setStatus(st);
                      setSelectedKey(null);
                      setError(null);
                    } catch (e) {
                      setError(String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Connect
                </button>
              </div>
            ))
          )}
        </div>

        <div className="row">
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const st = await api.connectStreamDeck();
                setStatus(st);
                setSelectedKey(null);
                setError(null);
              } catch (e) {
                setError(String(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Connect first
          </button>
          <button
            type="button"
            disabled={busy || !status?.connected}
            onClick={async () => {
              setBusy(true);
              try {
                setStatus(await api.disconnectStreamDeck());
              } finally {
                setBusy(false);
              }
            }}
          >
            Disconnect
          </button>
          <button type="button" onClick={() => void refresh()}>
            Refresh
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        {keys.length > 0 && (
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>
              Buttons {selectedKey != null ? `· Key ${selectedKey} ausgewählt` : "· Key antippen"}
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                gap: 6,
              }}
            >
              {keys.map((key) => {
                const m = mappingFor(key);
                const selected = selectedKey === key;
                const bg = m ? `rgb(${m.color.join(",")})` : "#1c1c1c";
                const light =
                  m && m.color[0] + m.color[1] + m.color[2] > 400;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedKey(key)}
                    style={{
                      aspectRatio: "1",
                      padding: "0.35rem",
                      borderRadius: 6,
                      border: selected
                        ? "2px solid var(--accent-2)"
                        : "1px solid var(--line)",
                      background: bg,
                      color: light ? "#111" : "#eee",
                      fontSize: "0.7rem",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: 2,
                    }}
                  >
                    <span className="mono">K{key}</span>
                    <span style={{ textAlign: "center", lineHeight: 1.2 }}>
                      {m?.label ?? "—"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedKey != null && (
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>
              Cue auf Key {selectedKey} legen
            </div>
            {cues.length === 0 ? (
              <p className="muted">
                Noch keine Cues. In der Cue List speichern, dann hier zuweisen.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 180, overflow: "auto" }}>
                {cues.map((c) => (
                  <button
                    key={c.cueId}
                    type="button"
                    disabled={busy}
                    onClick={() => void assignCue(c.listId, c.cueId, `${c.cueNumber} ${c.cueName}`)}
                    style={{ textAlign: "left" }}
                  >
                    <span className="mono">{c.listName}</span> · {c.cueNumber} {c.cueName}
                  </button>
                ))}
              </div>
            )}
            <div className="row" style={{ marginTop: 8 }}>
              <button type="button" disabled={busy} onClick={() => void clearKey()}>
                Key leeren
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
