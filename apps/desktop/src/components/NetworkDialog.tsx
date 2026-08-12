import { useEffect, useState } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import type { OutputConfig } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function NetworkDialog({ open, onClose }: Props) {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);
  const [config, setConfig] = useState<OutputConfig | null>(null);

  useEffect(() => {
    if (!open) return;
    const output = useConsoleStore.getState().state?.output;
    if (output) setConfig(structuredClone(output));
  }, [open]);

  if (!open || !state || !config) return null;

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
          width: "min(720px, 94vw)",
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxHeight: "85vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0 }}>Network / DMX Output</h3>
        <div className="row">
          <label className="row">
            <input
              type="checkbox"
              checked={config.artnetEnabled}
              onChange={(e) =>
                setConfig({ ...config, artnetEnabled: e.target.checked })
              }
            />
            Art-Net
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={config.sacnEnabled}
              onChange={(e) =>
                setConfig({ ...config, sacnEnabled: e.target.checked })
              }
            />
            sACN
          </label>
          <label className="row">
            <input
              type="checkbox"
              checked={config.artnetBroadcast}
              onChange={(e) =>
                setConfig({ ...config, artnetBroadcast: e.target.checked })
              }
            />
            Art-Net Broadcast
          </label>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "0.6rem",
          }}
        >
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--muted)" }}>
            Art-Net Target IP
            <input
              type="text"
              spellCheck={false}
              placeholder="192.168.1.100"
              value={config.artnetTarget}
              onChange={(e) =>
                setConfig({ ...config, artnetTarget: e.target.value })
              }
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--muted)" }}>
            sACN Priority
            <input
              type="number"
              min={0}
              max={200}
              value={config.sacnPriority}
              onChange={(e) =>
                setConfig({ ...config, sacnPriority: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr className="muted">
              <th align="left">Univ</th>
              <th>Art-Net</th>
              <th>Net</th>
              <th>Sub</th>
              <th>Uni</th>
              <th>sACN</th>
              <th>sACN Uni</th>
            </tr>
          </thead>
          <tbody>
            {config.universes.map((u, i) => (
              <tr key={u.internalUniverse}>
                <td>U{u.internalUniverse}</td>
                <td align="center">
                  <input
                    type="checkbox"
                    checked={u.artnetEnabled}
                    onChange={(e) => {
                      const universes = [...config.universes];
                      universes[i] = { ...u, artnetEnabled: e.target.checked };
                      setConfig({ ...config, universes });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={127}
                    value={u.artnetNet}
                    style={{ width: 56 }}
                    onChange={(e) => {
                      const universes = [...config.universes];
                      universes[i] = { ...u, artnetNet: Number(e.target.value) };
                      setConfig({ ...config, universes });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={u.artnetSubnet}
                    style={{ width: 56 }}
                    onChange={(e) => {
                      const universes = [...config.universes];
                      universes[i] = {
                        ...u,
                        artnetSubnet: Number(e.target.value),
                      };
                      setConfig({ ...config, universes });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={0}
                    max={15}
                    value={u.artnetUniverse}
                    style={{ width: 56 }}
                    onChange={(e) => {
                      const universes = [...config.universes];
                      universes[i] = {
                        ...u,
                        artnetUniverse: Number(e.target.value),
                      };
                      setConfig({ ...config, universes });
                    }}
                  />
                </td>
                <td align="center">
                  <input
                    type="checkbox"
                    checked={u.sacnEnabled}
                    onChange={(e) => {
                      const universes = [...config.universes];
                      universes[i] = { ...u, sacnEnabled: e.target.checked };
                      setConfig({ ...config, universes });
                    }}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min={1}
                    max={63999}
                    value={u.sacnUniverse}
                    style={{ width: 72 }}
                    onChange={(e) => {
                      const universes = [...config.universes];
                      universes[i] = {
                        ...u,
                        sacnUniverse: Number(e.target.value),
                      };
                      setConfig({ ...config, universes });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="row">
          <button
            type="button"
            className="primary"
            onClick={() => run(() => api.setOutputConfig(config))}
          >
            Apply
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
