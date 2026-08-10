import { useCallback, useEffect, useRef } from "react";
import { api } from "../api";
import { useConsoleStore } from "../store";

const PRESETS: { name: string; r: number; g: number; b: number; w: number; wheel: number }[] = [
  { name: "Open", r: 1, g: 1, b: 1, w: 0, wheel: 0 },
  { name: "Red", r: 1, g: 0, b: 0, w: 0, wheel: 0.12 },
  { name: "Green", r: 0, g: 1, b: 0, w: 0, wheel: 0.25 },
  { name: "Blue", r: 0, g: 0, b: 1, w: 0, wheel: 0.37 },
  { name: "Cyan", r: 0, g: 1, b: 1, w: 0, wheel: 0.5 },
  { name: "Magenta", r: 1, g: 0, b: 1, w: 0, wheel: 0.62 },
  { name: "Yellow", r: 1, g: 1, b: 0, w: 0, wheel: 0.75 },
  { name: "Amber", r: 1, g: 0.55, b: 0, w: 0.15, wheel: 0.85 },
  { name: "White", r: 0, g: 0, b: 0, w: 1, wheel: 1 },
];

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const i = Math.floor(h * 6);
  const f = h * 6 - i;
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      return [v, t, p];
    case 1:
      return [q, v, p];
    case 2:
      return [p, v, t];
    case 3:
      return [p, q, v];
    case 4:
      return [t, p, v];
    default:
      return [v, p, q];
  }
}

interface Props {
  hasRgb: boolean;
  hasWheel: boolean;
  hasWhite: boolean;
}

export function ColorWheel({ hasRgb, hasWheel, hasWhite }: Props) {
  const run = useConsoleStore((s) => s.run);
  const state = useConsoleStore((s) => s.state);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const size = 168;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const cx = size / 2;
    const cy = size / 2;
    const radius = size / 2 - 2;
    const img = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const idx = (y * size + x) * 4;
        if (dist > radius) {
          img.data[idx + 3] = 0;
          continue;
        }
        const hue = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
        const sat = dist / radius;
        const [r, g, b] = hsvToRgb(hue, sat, 1);
        img.data[idx] = Math.round(r * 255);
        img.data[idx + 1] = Math.round(g * 255);
        img.data[idx + 2] = Math.round(b * 255);
        img.data[idx + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
  }, []);

  const applyRgb = useCallback(
    async (r: number, g: number, b: number, w = 0, wheel?: number) => {
      const values: Record<string, number> = {};
      if (hasRgb) {
        values.red = r;
        values.green = g;
        values.blue = b;
      }
      if (hasWhite) values.white = w;
      if (hasWheel && wheel != null) values.color_wheel = wheel;
      await run(() => api.setAttributes(values));
    },
    [hasRgb, hasWhite, hasWheel, run],
  );

  const onPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !hasRgb) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const cx = size / 2;
    const cy = size / 2;
    const dx = x - cx;
    const dy = y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const radius = size / 2 - 2;
    if (dist > radius) return;
    const hue = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
    const sat = dist / radius;
    const [r, g, b] = hsvToRgb(hue, sat, 1);
    void applyRgb(r, g, b, 0, hue);
  };

  if (!state) return null;
  const wheelValue = state.programmer.values.color_wheel ?? 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
      <div className="muted" style={{ fontSize: "0.75rem", letterSpacing: "0.06em", textTransform: "uppercase" }}>
        Color Wheel
      </div>
      {hasRgb && (
        <canvas
          ref={canvasRef}
          width={size}
          height={size}
          onPointerDown={onPointer}
          onPointerMove={(e) => {
            if (e.buttons === 1) onPointer(e);
          }}
          style={{
            width: size,
            height: size,
            borderRadius: "50%",
            cursor: "crosshair",
            alignSelf: "center",
            touchAction: "none",
            boxShadow: "0 0 0 1px var(--line)",
          }}
        />
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            title={p.name}
            onClick={() => void applyRgb(p.r, p.g, p.b, p.w, p.wheel)}
            style={{
              width: 28,
              height: 28,
              borderRadius: "50%",
              padding: 0,
              border: "1px solid var(--line)",
              background:
                p.name === "White"
                  ? "#eee"
                  : `rgb(${Math.round(p.r * 255)}, ${Math.round(p.g * 255)}, ${Math.round(p.b * 255)})`,
            }}
          />
        ))}
      </div>
      {hasWheel && (
        <div>
          <label
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.8rem",
              color: "var(--muted)",
              marginBottom: 4,
            }}
          >
            <span>COLOR WHEEL (DMX)</span>
            <span className="mono">{Math.round(wheelValue * 100)}%</span>
          </label>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(wheelValue * 1000)}
            onChange={(e) =>
              run(() => api.setAttribute("color_wheel", Number(e.target.value) / 1000))
            }
            style={{ width: "100%", accentColor: "var(--accent-2)" }}
          />
        </div>
      )}
    </div>
  );
}
