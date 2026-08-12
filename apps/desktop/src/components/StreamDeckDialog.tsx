import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import type { DeckAction, DeckKeyMapping, StreamDeckDeviceInfo, StreamDeckStatus } from "../types";
import {
  COLOR_PRESETS,
  defaultIconForActionType,
  iconGlyph,
  loadSavedMappings,
  saveMappings,
  STREAM_DECK_ICONS,
} from "../streamDeckIcons";
import styles from "./StreamDeckDialog.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

type ActionKind =
  | "empty"
  | "blackoutToggle"
  | "clearProgrammer"
  | "outputToggle"
  | "playbackGo"
  | "playbackBack"
  | "dimmerFull"
  | "dimmerZero"
  | "shutterOpen"
  | "shutterClosed"
  | "selectFid"
  | "colorRed"
  | "colorGreen"
  | "colorBlue"
  | "colorWhite"
  | "colorCyan"
  | "colorMagenta"
  | "colorYellow"
  | "colorAmber"
  | "fireCue";

const ACTION_OPTIONS: { kind: ActionKind; label: string }[] = [
  { kind: "empty", label: "Empty" },
  { kind: "blackoutToggle", label: "Blackout toggle" },
  { kind: "clearProgrammer", label: "Clear programmer" },
  { kind: "outputToggle", label: "Output toggle" },
  { kind: "playbackGo", label: "Playback GO" },
  { kind: "playbackBack", label: "Playback BACK" },
  { kind: "dimmerFull", label: "Dimmer full" },
  { kind: "dimmerZero", label: "Dimmer zero" },
  { kind: "shutterOpen", label: "Shutter open" },
  { kind: "shutterClosed", label: "Shutter closed" },
  { kind: "selectFid", label: "Select FID" },
  { kind: "fireCue", label: "Fire cue" },
  { kind: "colorRed", label: "Color Red" },
  { kind: "colorGreen", label: "Color Green" },
  { kind: "colorBlue", label: "Color Blue" },
  { kind: "colorWhite", label: "Color White" },
  { kind: "colorCyan", label: "Color Cyan" },
  { kind: "colorMagenta", label: "Color Magenta" },
  { kind: "colorYellow", label: "Color Yellow" },
  { kind: "colorAmber", label: "Color Amber" },
];

function actionKind(action: DeckAction): ActionKind {
  return action.type as ActionKind;
}

function buildAction(
  kind: ActionKind,
  opts: { playbackIndex: number; fid: number; cueListId: string; cueId: string },
): DeckAction {
  switch (kind) {
    case "empty":
      return { type: "empty" };
    case "blackoutToggle":
      return { type: "blackoutToggle" };
    case "clearProgrammer":
      return { type: "clearProgrammer" };
    case "outputToggle":
      return { type: "outputToggle" };
    case "playbackGo":
      return { type: "playbackGo", index: opts.playbackIndex };
    case "playbackBack":
      return { type: "playbackBack", index: opts.playbackIndex };
    case "dimmerFull":
      return { type: "dimmerFull" };
    case "dimmerZero":
      return { type: "dimmerZero" };
    case "shutterOpen":
      return { type: "shutterOpen" };
    case "shutterClosed":
      return { type: "shutterClosed" };
    case "selectFid":
      return { type: "selectFid", fid: opts.fid };
    case "fireCue":
      return { type: "fireCue", cueListId: opts.cueListId, cueId: opts.cueId };
    case "colorRed":
      return { type: "colorRed" };
    case "colorGreen":
      return { type: "colorGreen" };
    case "colorBlue":
      return { type: "colorBlue" };
    case "colorWhite":
      return { type: "colorWhite" };
    case "colorCyan":
      return { type: "colorCyan" };
    case "colorMagenta":
      return { type: "colorMagenta" };
    case "colorYellow":
      return { type: "colorYellow" };
    case "colorAmber":
      return { type: "colorAmber" };
  }
}

function defaultLabel(kind: ActionKind): string {
  return ACTION_OPTIONS.find((o) => o.kind === kind)?.label.slice(0, 10) ?? "KEY";
}

export function StreamDeckDialog({ open, onClose }: Props) {
  const show = useConsoleStore((s) => s.state);
  const [status, setStatus] = useState<StreamDeckStatus | null>(null);
  const [devices, setDevices] = useState<StreamDeckDeviceInfo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedKey, setSelectedKey] = useState<number | null>(null);

  const [label, setLabel] = useState("");
  const [icon, setIcon] = useState("none");
  const [color, setColor] = useState<[number, number, number]>([50, 120, 200]);
  const [kind, setKind] = useState<ActionKind>("empty");
  const [playbackIndex, setPlaybackIndex] = useState(0);
  const [fid, setFid] = useState(1);
  const [cueListId, setCueListId] = useState("");
  const [cueId, setCueId] = useState("");

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

  const persist = (st: StreamDeckStatus) => {
    setStatus(st);
    saveMappings(st.mappings);
  };

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
    if (!open) return;
    void (async () => {
      await refresh();
      const saved = loadSavedMappings();
      if (saved && saved.length > 0) {
        try {
          const st = await api.setStreamDeckMappings(saved as DeckKeyMapping[]);
          persist(st);
        } catch {
          /* keep live status */
        }
      }
    })();
  }, [open]);

  useEffect(() => {
    if (selectedKey == null || !status) return;
    const m = status.mappings.find((x) => x.key === selectedKey);
    if (!m) {
      setLabel("");
      setIcon("none");
      setColor([28, 28, 28]);
      setKind("empty");
      return;
    }
    setLabel(m.label === "—" ? "" : m.label);
    setIcon(m.icon || defaultIconForActionType(m.action.type));
    setColor(m.color);
    setKind(actionKind(m.action));
    if (m.action.type === "playbackGo" || m.action.type === "playbackBack") {
      setPlaybackIndex(m.action.index);
    }
    if (m.action.type === "selectFid") setFid(m.action.fid);
    if (m.action.type === "fireCue") {
      setCueListId(m.action.cueListId);
      setCueId(m.action.cueId);
    }
  }, [selectedKey, status]);

  const cols = Math.max(1, status?.columns || 5);
  const mappingFor = (key: number) => status?.mappings.find((m) => m.key === key);

  const applyKey = async () => {
    if (selectedKey == null) return;
    if (kind === "fireCue" && (!cueListId || !cueId)) {
      setError("Pick a cue for Fire cue.");
      return;
    }
    setBusy(true);
    try {
      const action = buildAction(kind, { playbackIndex, fid, cueListId, cueId });
      const mapping: DeckKeyMapping = {
        key: selectedKey,
        label: (label.trim() || defaultLabel(kind)).slice(0, 12),
        action,
        color,
        icon: icon || defaultIconForActionType(kind),
      };
      const st = await api.assignStreamDeckKey(mapping);
      persist(st);
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
        icon: "none",
      });
      persist(st);
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  const keys = status?.keyCount ? Array.from({ length: status.keyCount }, (_, i) => i) : [];
  const light = color[0] + color[1] + color[2] > 400;

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h3>Stream Deck</h3>
            <p className="muted" style={{ margin: "0.25rem 0 0" }}>
              Key wählen → Aktion, Beschriftung, Icon & Farbe setzen. Elgato-App vorher beenden.
            </p>
          </div>
          <span className="mono">
            {status?.connected ? "Connected" : "Disconnected"}
            {status?.kind ? ` · ${status.kind}` : ""}
            {status && status.keyCount > 0 ? ` · ${status.columns}×${status.rows}` : ""}
          </span>
        </div>

        {error && <div className="errorBar">{error}</div>}

        <div className={styles.actions}>
          {devices.map((d) => (
            <button
              key={d.serial}
              type="button"
              className="primary"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const st = await api.connectStreamDeck(d.serial);
                  persist(st);
                  setSelectedKey(null);
                  setError(null);
                } catch (e) {
                  setError(String(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Connect {d.kind} ({d.columns}×{d.rows})
            </button>
          ))}
          <button
            type="button"
            className="primary"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const st = await api.connectStreamDeck();
                persist(st);
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

        <div className={styles.layout}>
          <div>
            <div className="muted" style={{ marginBottom: 6 }}>
              Buttons {selectedKey != null ? `· Key ${selectedKey}` : "· Key antippen"}
            </div>
            {keys.length === 0 ? (
              <p className="muted">Kein Layout — Stream Deck verbinden.</p>
            ) : (
              <div
                className={styles.grid}
                style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
              >
                {keys.map((key) => {
                  const m = mappingFor(key);
                  const bg = m ? `rgb(${m.color.join(",")})` : "#1c1c1c";
                  const isLight = m && m.color[0] + m.color[1] + m.color[2] > 400;
                  const glyph = iconGlyph(m?.icon || defaultIconForActionType(m?.action.type ?? "empty"));
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`${styles.key} ${selectedKey === key ? styles.keySelected : ""}`}
                      style={{ background: bg, color: isLight ? "#111" : "#eee" }}
                      onClick={() => setSelectedKey(key)}
                    >
                      <span className={styles.keyIcon}>{glyph}</span>
                      <span className={styles.keyLabel}>{m?.label ?? "—"}</span>
                      <span className={styles.keyIndex}>K{key}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className={styles.editor}>
            {selectedKey == null ? (
              <p className="muted">Wähle einen Key zum Konfigurieren.</p>
            ) : (
              <>
                <div className={styles.preview}>
                  <div
                    className={styles.previewKey}
                    style={{ background: `rgb(${color.join(",")})`, color: light ? "#111" : "#eee" }}
                  >
                    <div style={{ fontSize: "1.25rem" }}>{iconGlyph(icon)}</div>
                    <div>{label.trim() || defaultLabel(kind)}</div>
                  </div>
                  <div className="muted">Vorschau Key {selectedKey}</div>
                </div>

                <div className={styles.field}>
                  <label htmlFor="sd-label">Beschriftung</label>
                  <input
                    id="sd-label"
                    value={label}
                    maxLength={12}
                    placeholder={defaultLabel(kind)}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>

                <div className={styles.field}>
                  <label htmlFor="sd-action">Aktion</label>
                  <select
                    id="sd-action"
                    value={kind}
                    onChange={(e) => {
                      const next = e.target.value as ActionKind;
                      setKind(next);
                      setIcon(defaultIconForActionType(next));
                      if (!label.trim()) setLabel(defaultLabel(next));
                      if (next === "fireCue" && cues[0]) {
                        setCueListId(cues[0].listId);
                        setCueId(cues[0].cueId);
                      }
                    }}
                  >
                    {ACTION_OPTIONS.map((o) => (
                      <option key={o.kind} value={o.kind}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                {(kind === "playbackGo" || kind === "playbackBack") && (
                  <div className={styles.field}>
                    <label htmlFor="sd-pb">Playback</label>
                    <select
                      id="sd-pb"
                      value={playbackIndex}
                      onChange={(e) => setPlaybackIndex(Number(e.target.value))}
                    >
                      {(show?.playbacks ?? Array.from({ length: 8 }, (_, i) => ({ index: i }))).map(
                        (pb) => (
                          <option key={pb.index} value={pb.index}>
                            PB{pb.index + 1}
                            {"label" in pb && pb.label ? ` · ${pb.label}` : ""}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}

                {kind === "selectFid" && (
                  <div className={styles.field}>
                    <label htmlFor="sd-fid">FID</label>
                    <input
                      id="sd-fid"
                      type="number"
                      min={1}
                      value={fid}
                      onChange={(e) => setFid(Number(e.target.value) || 1)}
                    />
                  </div>
                )}

                {kind === "fireCue" && (
                  <div className={styles.field}>
                    <label htmlFor="sd-cue">Cue</label>
                    {cues.length === 0 ? (
                      <p className="muted">Noch keine Cues in der Show.</p>
                    ) : (
                      <select
                        id="sd-cue"
                        value={`${cueListId}|${cueId}`}
                        onChange={(e) => {
                          const [listId, id] = e.target.value.split("|");
                          setCueListId(listId);
                          setCueId(id);
                        }}
                      >
                        {cues.map((c) => (
                          <option key={c.cueId} value={`${c.listId}|${c.cueId}`}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div className={styles.field}>
                  <label>Icon</label>
                  <div className={styles.icons}>
                    {STREAM_DECK_ICONS.map((id) => (
                      <button
                        key={id}
                        type="button"
                        title={id}
                        className={`${styles.iconBtn} ${icon === id ? styles.iconBtnActive : ""}`}
                        onClick={() => setIcon(id)}
                      >
                        {iconGlyph(id)}
                      </button>
                    ))}
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Farbe</label>
                  <div className={styles.colors}>
                    {COLOR_PRESETS.map((p) => (
                      <button
                        key={p.name}
                        type="button"
                        title={p.name}
                        className={`${styles.swatch} ${
                          color[0] === p.color[0] && color[1] === p.color[1] && color[2] === p.color[2]
                            ? styles.swatchActive
                            : ""
                        }`}
                        style={{ background: `rgb(${p.color.join(",")})` }}
                        onClick={() => setColor(p.color)}
                      />
                    ))}
                  </div>
                </div>

                <div className={styles.actions}>
                  <button type="button" className="primary" disabled={busy} onClick={() => void applyKey()}>
                    Auf Key speichern
                  </button>
                  <button type="button" disabled={busy} onClick={() => void clearKey()}>
                    Key leeren
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
