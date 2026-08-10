import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEffect, useState } from "react";
import { AttributePanel } from "./components/AttributePanel";
import { CueListPanel } from "./components/CueListPanel";
import { FixtureGrid } from "./components/FixtureGrid";
import { GroupPresetPanel } from "./components/GroupPresetPanel";
import { NetworkDialog } from "./components/NetworkDialog";
import { PatchDialog } from "./components/PatchDialog";
import { PlaybackBar } from "./components/PlaybackBar";
import { StreamDeckDialog } from "./components/StreamDeckDialog";
import { TopBar } from "./components/TopBar";
import { api } from "./api";
import { useConsoleStore } from "./store";
import styles from "./App.module.css";

const AUTOSAVE_MS = 12_000;

export default function App() {
  const refresh = useConsoleStore((s) => s.refresh);
  const state = useConsoleStore((s) => s.state);
  const dirty = useConsoleStore((s) => s.dirty);
  const autosaveStatus = useConsoleStore((s) => s.autosaveStatus);
  const autosaveIfNeeded = useConsoleStore((s) => s.autosaveIfNeeded);
  const saveShow = useConsoleStore((s) => s.saveShow);
  const openShow = useConsoleStore((s) => s.openShow);
  const newShow = useConsoleStore((s) => s.newShow);
  const markClean = useConsoleStore((s) => s.markClean);
  const apply = useConsoleStore((s) => s.apply);
  const [patchOpen, setPatchOpen] = useState(false);
  const [networkOpen, setNetworkOpen] = useState(false);
  const [deckOpen, setDeckOpen] = useState(false);

  useEffect(() => {
    void (async () => {
      const path = useConsoleStore.getState().showPath;
      if (path) {
        try {
          const loaded = await api.loadShow(path);
          apply(loaded);
          markClean(path);
          return;
        } catch {
          markClean(null);
        }
      }
      await refresh();
    })();

    const id = window.setInterval(() => {
      void refresh();
    }, 500);
    return () => window.clearInterval(id);
  }, [refresh, apply, markClean]);

  useEffect(() => {
    let unlisten: (() => void) | undefined;
    void listen("show-state-changed", () => {
      void refresh();
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void autosaveIfNeeded();
    }, AUTOSAVE_MS);
    return () => window.clearInterval(id);
  }, [autosaveIfNeeded]);

  useEffect(() => {
    if (!autosaveStatus || autosaveStatus === "Autosaving…") return;
    const t = window.setTimeout(() => {
      useConsoleStore.setState({ autosaveStatus: null });
    }, 3500);
    return () => window.clearTimeout(t);
  }, [autosaveStatus]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        if (e.shiftKey) void useConsoleStore.getState().saveShowAs();
        else void saveShow();
      } else if (key === "o") {
        e.preventDefault();
        void openShow();
      } else if (key === "n") {
        e.preventDefault();
        void newShow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveShow, openShow, newShow]);

  useEffect(() => {
    const title = dirty
      ? `OpenLightController — ${state?.name ?? "Show"} *`
      : `OpenLightController — ${state?.name ?? "Show"}`;
    void getCurrentWindow().setTitle(title).catch(() => {
      document.title = title;
    });
  }, [dirty, state?.name]);

  return (
    <div className={styles.layout}>
      <TopBar
        onOpenPatch={() => setPatchOpen(true)}
        onOpenNetwork={() => setNetworkOpen(true)}
        onOpenStreamDeck={() => setDeckOpen(true)}
      />
      {!state ? (
        <div className="muted" style={{ padding: "1rem" }}>
          Loading console…
        </div>
      ) : (
        <>
          <main className={styles.main}>
            <div style={{ display: "grid", gridTemplateRows: "1fr 1fr", gap: "0.55rem", minHeight: 0 }}>
              <FixtureGrid />
              <GroupPresetPanel />
            </div>
            <AttributePanel />
            <CueListPanel />
          </main>
          <PlaybackBar />
        </>
      )}
      <PatchDialog open={patchOpen} onClose={() => setPatchOpen(false)} />
      <NetworkDialog open={networkOpen} onClose={() => setNetworkOpen(false)} />
      <StreamDeckDialog open={deckOpen} onClose={() => setDeckOpen(false)} />
    </div>
  );
}
