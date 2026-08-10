import { useMemo, useState } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";
import type { FixtureDefinition } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
}

interface ProductGroup {
  name: string;
  category: string;
  modes: FixtureDefinition[];
}

export function PatchDialog({ open, onClose }: Props) {
  const state = useConsoleStore((s) => s.state);
  const run = useConsoleStore((s) => s.run);
  const [definitionId, setDefinitionId] = useState("generic.led_wash");
  const [name, setName] = useState("");
  const [universe, setUniverse] = useState(1);
  const [address, setAddress] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [offset, setOffset] = useState<number | "">("");
  const [filter, setFilter] = useState("");
  const [manufacturer, setManufacturer] = useState<string>("All");

  const selectedDef = state?.definitions.find((d) => d.id === definitionId);
  const effectiveOffset =
    offset === "" ? (selectedDef?.channelCount ?? 1) : Number(offset);

  const manufacturers = useMemo(() => {
    if (!state) return [] as string[];
    const set = new Set(state.definitions.map((d) => d.manufacturer));
    return ["All", ...[...set].sort((a, b) => a.localeCompare(b))];
  }, [state]);

  const grouped = useMemo(() => {
    if (!state) return [] as { manufacturer: string; products: ProductGroup[] }[];
    const q = filter.trim().toLowerCase();
    const filtered = state.definitions.filter((d) => {
      if (manufacturer !== "All" && d.manufacturer !== manufacturer) return false;
      if (!q) return true;
      return (
        d.name.toLowerCase().includes(q) ||
        d.manufacturer.toLowerCase().includes(q) ||
        d.mode.toLowerCase().includes(q) ||
        d.category.toLowerCase().includes(q) ||
        d.id.toLowerCase().includes(q)
      );
    });

    const byMfr = new Map<string, Map<string, ProductGroup>>();
    for (const d of filtered) {
      if (!byMfr.has(d.manufacturer)) byMfr.set(d.manufacturer, new Map());
      const products = byMfr.get(d.manufacturer)!;
      const key = d.name;
      if (!products.has(key)) {
        products.set(key, { name: d.name, category: d.category, modes: [] });
      }
      products.get(key)!.modes.push(d);
    }

    return [...byMfr.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([mfr, products]) => ({
        manufacturer: mfr,
        products: [...products.values()]
          .map((p) => ({
            ...p,
            modes: p.modes.sort((a, b) => a.channelCount - b.channelCount),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }));
  }, [state, filter, manufacturer]);

  const siblingModes = useMemo(() => {
    if (!state || !selectedDef) return [] as FixtureDefinition[];
    return state.definitions
      .filter(
        (d) =>
          d.manufacturer === selectedDef.manufacturer && d.name === selectedDef.name,
      )
      .sort((a, b) => a.channelCount - b.channelCount);
  }, [state, selectedDef]);

  const previewEnd =
    address + Math.max(0, quantity - 1) * effectiveOffset + (selectedDef?.channelCount ?? 1) - 1;

  if (!open || !state) return null;

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
          width: "min(920px, 96vw)",
          background: "var(--bg-1)",
          border: "1px solid var(--line)",
          borderRadius: 8,
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          maxHeight: "92vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: 0 }}>Patch</h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1.35fr 1fr",
            gap: "0.85rem",
            minHeight: 320,
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 6, minHeight: 0 }}>
            <div className="muted">Fixture Library · nach Hersteller</div>
            <div className="row">
              <select
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                style={{ minWidth: 160 }}
              >
                {manufacturers.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Suche Name, Mode, Kategorie…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <div
              style={{
                flex: 1,
                overflow: "auto",
                border: "1px solid var(--line)",
                borderRadius: 4,
                background: "var(--bg-0)",
                maxHeight: 380,
              }}
            >
              {grouped.map((group) => (
                <div key={group.manufacturer}>
                  <div
                    style={{
                      position: "sticky",
                      top: 0,
                      background: "var(--bg-2)",
                      padding: "0.35rem 0.55rem",
                      fontSize: "0.72rem",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--accent-2)",
                      borderBottom: "1px solid var(--line)",
                      zIndex: 1,
                    }}
                  >
                    {group.manufacturer}
                  </div>
                  {group.products.map((product) => {
                    const activeProduct = selectedDef?.name === product.name
                      && selectedDef?.manufacturer === group.manufacturer;
                    return (
                      <div key={`${group.manufacturer}:${product.name}`}>
                        <button
                          type="button"
                          onClick={() => {
                            const prefer =
                              product.modes.find((m) => m.id === definitionId)
                              ?? product.modes[0];
                            if (prefer) {
                              setDefinitionId(prefer.id);
                              setOffset("");
                            }
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            borderRadius: 0,
                            border: "none",
                            borderBottom: "1px solid var(--line)",
                            background: activeProduct ? "var(--selected)" : "transparent",
                            padding: "0.4rem 0.55rem",
                          }}
                        >
                          <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                            {product.name}
                          </div>
                          <div className="mono muted" style={{ fontSize: "0.7rem" }}>
                            {product.category} · {product.modes.length} mode
                            {product.modes.length === 1 ? "" : "s"} ·{" "}
                            {product.modes.map((m) => m.mode).join(" / ")}
                          </div>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
              {grouped.length === 0 && (
                <p className="muted" style={{ padding: "0.6rem" }}>
                  Keine Fixtures gefunden.
                </p>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
            <div className="muted">Patch settings</div>
            {selectedDef && (
              <div
                className="mono"
                style={{
                  fontSize: "0.78rem",
                  padding: "0.45rem",
                  background: "var(--bg-2)",
                  borderRadius: 4,
                  border: "1px solid var(--line)",
                }}
              >
                {selectedDef.manufacturer} · {selectedDef.category}
                <br />
                <strong>{selectedDef.name}</strong>
                <br />
                Mode: {selectedDef.mode} · {selectedDef.channelCount}ch
                <br />
                <span className="muted">
                  {selectedDef.attributes.map((a) => a.name).join(", ") || "—"}
                </span>
              </div>
            )}

            {siblingModes.length > 1 && (
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--muted)" }}>
                Channel Mode
                <select
                  value={definitionId}
                  onChange={(e) => {
                    setDefinitionId(e.target.value);
                    setOffset("");
                  }}
                >
                  {siblingModes.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.mode} ({m.channelCount}ch)
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--muted)" }}>
              Name prefix (optional)
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--muted)" }}>
                Universe
                <input
                  type="number"
                  min={1}
                  max={4}
                  value={universe}
                  onChange={(e) => setUniverse(Number(e.target.value))}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--muted)" }}>
                Address
                <input
                  type="number"
                  min={1}
                  max={512}
                  value={address}
                  onChange={(e) => setAddress(Number(e.target.value))}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--muted)" }}>
                Quantity
                <input
                  type="number"
                  min={1}
                  max={512}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: "0.8rem", color: "var(--muted)" }}>
                Offset
                <input
                  type="number"
                  min={selectedDef?.channelCount ?? 1}
                  max={512}
                  placeholder={String(selectedDef?.channelCount ?? 1)}
                  value={offset}
                  onChange={(e) =>
                    setOffset(e.target.value === "" ? "" : Number(e.target.value))
                  }
                />
              </label>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: "0.78rem" }}>
              Offset = Adress-Schritt (Standard = Channel Count).
              <br />
              Patch: U{universe}:{address}
              {quantity > 1 ? ` … +${quantity - 1}×${effectiveOffset}` : ""} → end ch{" "}
              {previewEnd}
            </p>
          </div>
        </div>

        <div className="row">
          <button
            type="button"
            className="primary"
            onClick={async () => {
              const result = await run(() =>
                api.patchFixture({
                  definitionId,
                  name: name || undefined,
                  universe,
                  address,
                  quantity,
                  offset: offset === "" ? undefined : Number(offset),
                }),
              );
              if (result) {
                setAddress(address + quantity * effectiveOffset);
              }
            }}
          >
            Patch {quantity > 1 ? `${quantity}×` : ""}
          </button>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>

        <div>
          <div className="muted" style={{ marginBottom: 6 }}>
            Patched fixtures ({state.fixtures.length})
          </div>
          <div style={{ maxHeight: 140, overflow: "auto" }}>
            {state.fixtures.map((fx) => {
              const def = state.definitions.find((d) => d.id === fx.definitionId);
              return (
                <div
                  key={fx.id}
                  className="row"
                  style={{ justifyContent: "space-between", marginBottom: 4 }}
                >
                  <span className="mono" style={{ fontSize: "0.8rem" }}>
                    FID {fx.fid} · {fx.name} · U{fx.universe}:{fx.address}
                    {def ? ` · ${def.manufacturer} ${def.mode}` : ""}
                  </span>
                  <button
                    type="button"
                    className="danger"
                    onClick={() => run(() => api.unpatchFixture(fx.id))}
                  >
                    Unpatch
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
