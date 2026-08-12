import { useEffect, useState } from "react";
import { api } from "../api";
import { SCREEN_PANELS } from "../screenPanels";
import { screenWindowLabel, useScreenStore, type ScreenDefinition } from "../screenStore";
import type { MonitorInfo, ScreenPanel } from "../types";
import styles from "./ScreenManager.module.css";

function emptyDraft(monitors: MonitorInfo[]): Omit<ScreenDefinition, "id"> {
  const secondary = monitors.find((m) => !m.primary);
  return {
    name: "New Screen",
    panel: "dmx_output",
    monitorIndex: secondary?.index ?? monitors[0]?.index ?? null,
    fullscreen: true,
  };
}

export function ScreenManager() {
  const screens = useScreenStore((s) => s.screens);
  const addScreen = useScreenStore((s) => s.addScreen);
  const updateScreen = useScreenStore((s) => s.updateScreen);
  const removeScreen = useScreenStore((s) => s.removeScreen);

  const [monitors, setMonitors] = useState<MonitorInfo[]>([]);
  const [openLabels, setOpenLabels] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [draft, setDraft] = useState<Omit<ScreenDefinition, "id"> | null>(null);

  const refreshOpen = async () => {
    const labels = await api.listOpenScreenWindows();
    setOpenLabels(labels);
  };

  useEffect(() => {
    void (async () => {
      try {
        const mons = await api.listMonitors();
        setMonitors(mons);
        setDraft((current) => current ?? emptyDraft(mons));
        await refreshOpen();
      } catch (e) {
        setMessage(String(e));
      }
    })();
    const id = window.setInterval(() => void refreshOpen(), 2000);
    return () => window.clearInterval(id);
  }, []);

  const isOpen = (id: string) => openLabels.includes(screenWindowLabel(id));

  const openScreen = async (screen: ScreenDefinition) => {
    setBusy(true);
    setMessage(null);
    try {
      await api.openScreenWindow({
        windowLabel: screenWindowLabel(screen.id),
        title: screen.name,
        panel: screen.panel,
        monitorIndex: screen.monitorIndex,
        fullscreen: screen.fullscreen,
      });
      await refreshOpen();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const closeScreen = async (id: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await api.closeScreenWindow(screenWindowLabel(id));
      await refreshOpen();
    } catch (e) {
      setMessage(String(e));
    } finally {
      setBusy(false);
    }
  };

  const createScreen = async () => {
    if (!draft) return;
    const name = draft.name.trim() || "Screen";
    const created = addScreen({ ...draft, name });
    setDraft(emptyDraft(monitors));
    await openScreen(created);
  };

  return (
    <section className={styles.root}>
      <p className="muted">
        Create unlimited external windows — each with its own panel (Playbacks, Cues, DMX Output,
        Status). Assign them to any monitor.
      </p>

      {draft ? (
        <div className={styles.createCard}>
          <h4>New screen</h4>
          <div className={styles.formGrid}>
            <label className={styles.field}>
              Name
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </label>
            <label className={styles.field}>
              Panel
              <select
                value={draft.panel}
                onChange={(e) =>
                  setDraft({ ...draft, panel: e.target.value as ScreenPanel })
                }
              >
                {SCREEN_PANELS.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              Monitor
              <select
                value={draft.monitorIndex ?? ""}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    monitorIndex: e.target.value === "" ? null : Number(e.target.value),
                  })
                }
              >
                <option value="">Default position</option>
                {monitors.map((m) => (
                  <option key={m.index} value={m.index}>
                    {m.name} — {m.width}×{m.height}
                    {m.primary ? " (primary)" : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={draft.fullscreen}
                onChange={(e) => setDraft({ ...draft, fullscreen: e.target.checked })}
              />
              Fullscreen on monitor
            </label>
          </div>
          <p className={styles.panelHint}>
            {SCREEN_PANELS.find((p) => p.id === draft.panel)?.description}
          </p>
          <button type="button" className="primary" disabled={busy} onClick={() => void createScreen()}>
            Create &amp; Open
          </button>
        </div>
      ) : null}

      <div className={styles.list}>
        {screens.length === 0 ? (
          <div className="muted">No screens configured yet.</div>
        ) : (
          screens.map((screen) => (
            <ScreenRow
              key={screen.id}
              screen={screen}
              monitors={monitors}
              open={isOpen(screen.id)}
              busy={busy}
              onChange={(patch) => updateScreen(screen.id, patch)}
              onOpen={() => void openScreen(screen)}
              onClose={() => void closeScreen(screen.id)}
              onRemove={async () => {
                if (isOpen(screen.id)) await closeScreen(screen.id);
                removeScreen(screen.id);
              }}
            />
          ))
        )}
      </div>

      {message ? <div className={styles.error}>{message}</div> : null}
    </section>
  );
}

function ScreenRow({
  screen,
  monitors,
  open,
  busy,
  onChange,
  onOpen,
  onClose,
  onRemove,
}: {
  screen: ScreenDefinition;
  monitors: MonitorInfo[];
  open: boolean;
  busy: boolean;
  onChange: (patch: Partial<Omit<ScreenDefinition, "id">>) => void;
  onOpen: () => void;
  onClose: () => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <input
          className={styles.nameInput}
          value={screen.name}
          disabled={open}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <select
          value={screen.panel}
          disabled={open}
          onChange={(e) => onChange({ panel: e.target.value as ScreenPanel })}
        >
          {SCREEN_PANELS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={screen.monitorIndex ?? ""}
          disabled={open}
          onChange={(e) =>
            onChange({
              monitorIndex: e.target.value === "" ? null : Number(e.target.value),
            })
          }
        >
          <option value="">Default</option>
          {monitors.map((m) => (
            <option key={m.index} value={m.index}>
              {m.name}
            </option>
          ))}
        </select>
        <label className={styles.checkRow}>
          <input
            type="checkbox"
            checked={screen.fullscreen}
            disabled={open}
            onChange={(e) => onChange({ fullscreen: e.target.checked })}
          />
          FS
        </label>
        {open ? <span className={styles.openBadge}>Open</span> : null}
      </div>
      <div className={styles.rowActions}>
        {open ? (
          <button type="button" disabled={busy} onClick={onClose}>
            Close
          </button>
        ) : (
          <button type="button" className="primary" disabled={busy} onClick={onOpen}>
            Open
          </button>
        )}
        <button type="button" disabled={busy} onClick={onRemove}>
          Delete
        </button>
      </div>
    </div>
  );
}
