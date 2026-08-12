import { useEffect, useState } from "react";
import { api } from "../api";
import { usePreferencesStore } from "../preferencesStore";
import { ScreenManager } from "./ScreenManager";
import type { WebRemoteStatus } from "../types";
import styles from "./SettingsDialog.module.css";

interface Props {
  open: boolean;
  onClose: () => void;
}

function webRemoteUrl(status: WebRemoteStatus | null): string | null {
  if (!status?.localIp) return null;
  return `http://${status.localIp}:${status.port}`;
}

export function SettingsDialog({ open, onClose }: Props) {
  const touchMode = usePreferencesStore((s) => s.touchMode);
  const onScreenKeyboard = usePreferencesStore((s) => s.onScreenKeyboard);
  const webRemotePort = usePreferencesStore((s) => s.webRemotePort);
  const setTouchMode = usePreferencesStore((s) => s.setTouchMode);
  const setOnScreenKeyboard = usePreferencesStore((s) => s.setOnScreenKeyboard);
  const setWebRemotePort = usePreferencesStore((s) => s.setWebRemotePort);

  const [portDraft, setPortDraft] = useState(String(webRemotePort));
  const [remoteStatus, setRemoteStatus] = useState<WebRemoteStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPortDraft(String(webRemotePort));
    setMessage(null);
    void (async () => {
      try {
        const remote = await api.getWebRemoteStatus();
        setRemoteStatus(remote);
      } catch (e) {
        setMessage(String(e));
      }
    })();
  }, [open, webRemotePort]);

  if (!open) return null;

  const refreshRemote = async () => {
    const st = await api.getWebRemoteStatus();
    setRemoteStatus(st);
    return st;
  };

  const toggleRemote = async () => {
    setBusy(true);
    setMessage(null);
    try {
      if (remoteStatus?.running) {
        const st = await api.stopWebRemote();
        setRemoteStatus(st);
      } else {
        const port = Number(portDraft);
        if (!Number.isInteger(port) || port < 1024 || port > 65535) {
          setMessage("Port must be between 1024 and 65535.");
          return;
        }
        setWebRemotePort(port);
        const st = await api.startWebRemote(port);
        setRemoteStatus(st);
      }
    } catch (e) {
      setMessage(String(e));
      await refreshRemote();
    } finally {
      setBusy(false);
    }
  };

  const url = webRemoteUrl(remoteStatus);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <header className={styles.header}>
          <h2>Settings</h2>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <section className={styles.section}>
          <h3>Touch &amp; Keyboard</h3>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={touchMode}
              onChange={(e) => setTouchMode(e.target.checked)}
            />
            Touch mode (larger controls, touch-friendly targets)
          </label>
          <label className={styles.checkRow}>
            <input
              type="checkbox"
              checked={onScreenKeyboard}
              disabled={!touchMode}
              onChange={(e) => setOnScreenKeyboard(e.target.checked)}
            />
            On-screen keyboard for text fields
          </label>
        </section>

        <section className={styles.section}>
          <h3>Screen Layouts</h3>
          <ScreenManager />
        </section>

        <section className={styles.section}>
          <h3>WebRemote</h3>
          <p className="muted">
            Control playbacks, blackout, output and fire cues from any phone or tablet browser on
            your LAN — similar to grandMA / dot2 WebRemote.
          </p>
          <label className={styles.field}>
            Port
            <input
              type="number"
              min={1024}
              max={65535}
              value={portDraft}
              disabled={remoteStatus?.running}
              onChange={(e) => setPortDraft(e.target.value)}
            />
          </label>
          {url ? (
            <div className={styles.urlBox}>
              <span className="mono">{url}</span>
            </div>
          ) : null}
          {remoteStatus?.lastError ? (
            <div className={styles.error}>{remoteStatus.lastError}</div>
          ) : null}
          <div className={styles.row}>
            <button type="button" disabled={busy} onClick={() => void toggleRemote()}>
              {remoteStatus?.running ? "Stop WebRemote" : "Start WebRemote"}
            </button>
          </div>
        </section>

        {message ? <div className={styles.error}>{message}</div> : null}
      </div>
    </div>
  );
}
