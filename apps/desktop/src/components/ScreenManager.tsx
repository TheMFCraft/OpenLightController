import { useEffect, useState } from "react";
import { api } from "../api";
import {
  canUseFullscreenOnMonitor,
  normalizeScreenMonitor,
  primaryMonitorWarning,
  selectableMonitors,
  singleMonitorHint,
} from "../screenMonitorUtils";
import { MenuSelect } from "./MenuSelect";
import { SCREEN_PANELS } from "../screenPanels";
import { screenWindowLabel, useScreenStore, type ScreenDefinition } from "../screenStore";
import type { MonitorInfo, ScreenPanel } from "../types";
import styles from "./ScreenManager.module.css";

const PANEL_OPTIONS = SCREEN_PANELS.map((p) => ({ value: p.id, label: p.label }));

function monitorOptions(monitors: MonitorInfo[]) {
  const secondary = selectableMonitors(monitors);
  if (secondary.length === 0) {
    return [{ value: "", label: "Windowed on this display" }];
  }
  return [
    { value: "", label: "Default position" },
    ...secondary.map((m) => ({
      value: String(m.index),
      label: `${m.name} — ${m.width}×${m.height}`,
    })),
  ];
}

function monitorOptionsShort(monitors: MonitorInfo[]) {
  const secondary = selectableMonitors(monitors);
  if (secondary.length === 0) {
    return [{ value: "", label: "Windowed" }];
  }
  return [
    { value: "", label: "Default" },
    ...secondary.map((m) => ({
      value: String(m.index),
      label: m.name || `Monitor ${m.index + 1}`,
    })),
  ];
}

function emptyDraft(monitors: MonitorInfo[]): Omit<ScreenDefinition, "id"> {
  const secondary = monitors.find((m) => !m.primary);
  const monitorIndex = secondary?.index ?? null;
  return normalizeScreenMonitor(monitors, {
    name: "New Screen",
    panel: "dmx_output",
    monitorIndex,
    fullscreen: monitorIndex != null && canUseFullscreenOnMonitor(monitors, monitorIndex),
  });
}

function applyMonitorSelection(
  monitors: MonitorInfo[],
  current: Omit<ScreenDefinition, "id"> | ScreenDefinition,
  monitorIndex: number | null,
) {
  const next = { ...current, monitorIndex };
  if (!canUseFullscreenOnMonitor(monitors, monitorIndex)) {
    next.fullscreen = false;
  }
  return next;
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
        for (const screen of useScreenStore.getState().screens) {
          const safe = normalizeScreenMonitor(mons, screen);
          if (
            safe.monitorIndex !== screen.monitorIndex ||
            safe.fullscreen !== screen.fullscreen
          ) {
            updateScreen(screen.id, {
              monitorIndex: safe.monitorIndex,
              fullscreen: safe.fullscreen,
            });
          }
        }
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
    const safe = normalizeScreenMonitor(monitors, screen);
    if (safe.monitorIndex !== screen.monitorIndex || safe.fullscreen !== screen.fullscreen) {
      updateScreen(screen.id, {
        monitorIndex: safe.monitorIndex,
        fullscreen: safe.fullscreen,
      });
    }
    try {
      await api.openScreenWindow({
        windowLabel: screenWindowLabel(safe.id),
        title: safe.name,
        panel: safe.panel,
        monitorIndex: safe.monitorIndex,
        fullscreen: safe.fullscreen,
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
    const safe = normalizeScreenMonitor(monitors, { ...draft, name });
    const created = addScreen(safe);
    setDraft(emptyDraft(monitors));
    await openScreen(created);
  };

  return (
    <section className={styles.root}>
      <p className="muted">
        Create unlimited external windows — each with its own panel (Playbacks, Cues, DMX Output,
        Status). The main console always stays on the primary display.
      </p>
      {singleMonitorHint(monitors) ? (
        <p className={styles.warning}>{singleMonitorHint(monitors)}</p>
      ) : null}

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
              <MenuSelect
                value={draft.panel}
                ariaLabel="Panel"
                options={PANEL_OPTIONS}
                onChange={(panel) => setDraft({ ...draft, panel: panel as ScreenPanel })}
              />
            </label>
            <label className={styles.field}>
              Monitor
              <MenuSelect
                value={draft.monitorIndex == null ? "" : String(draft.monitorIndex)}
                ariaLabel="Monitor"
                options={monitorOptions(monitors)}
                onChange={(value) =>
                  setDraft(applyMonitorSelection(
                    monitors,
                    draft,
                    value === "" ? null : Number(value),
                  ))
                }
              />
            </label>
            <label className={styles.checkRow}>
              <input
                type="checkbox"
                checked={draft.fullscreen}
                disabled={!canUseFullscreenOnMonitor(monitors, draft.monitorIndex)}
                onChange={(e) => setDraft({ ...draft, fullscreen: e.target.checked })}
              />
              Fullscreen on monitor
            </label>
          </div>
          {primaryMonitorWarning(monitors, draft.monitorIndex) ? (
            <p className={styles.warning}>{primaryMonitorWarning(monitors, draft.monitorIndex)}</p>
          ) : null}
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
  const fsAllowed = canUseFullscreenOnMonitor(monitors, screen.monitorIndex);
  const warning = primaryMonitorWarning(monitors, screen.monitorIndex);

  return (
    <div className={styles.row}>
      <div className={styles.rowMain}>
        <input
          className={styles.nameInput}
          value={screen.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
        <div className={styles.selectCell}>
          <MenuSelect
            value={screen.panel}
            ariaLabel="Panel"
            options={PANEL_OPTIONS}
            onChange={(panel) => onChange({ panel: panel as ScreenPanel })}
          />
        </div>
        <div className={styles.selectCell}>
          <MenuSelect
            value={screen.monitorIndex == null ? "" : String(screen.monitorIndex)}
            ariaLabel="Monitor"
            options={monitorOptionsShort(monitors)}
            onChange={(value) =>
              onChange(
                applyMonitorSelection(
                  monitors,
                  screen,
                  value === "" ? null : Number(value),
                ),
              )
            }
          />
        </div>
        <label className={styles.checkRow} title={fsAllowed ? undefined : warning ?? undefined}>
          <input
            type="checkbox"
            checked={screen.fullscreen}
            disabled={!fsAllowed}
            onChange={(e) => onChange({ fullscreen: e.target.checked })}
          />
          FS
        </label>
        {open ? <span className={styles.openBadge}>Open · reopen to apply layout</span> : null}
      </div>
      {warning ? <p className={styles.warning}>{warning}</p> : null}
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
