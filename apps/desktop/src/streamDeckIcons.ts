/** Shared Stream Deck icon catalog (must match Rust streamdeck_icons::ICON_IDS). */
export const STREAM_DECK_ICONS = [
  "none",
  "blackout",
  "clear",
  "output",
  "go",
  "back",
  "dimmer",
  "zero",
  "shutter",
  "cue",
  "color",
  "fixture",
  "flash",
  "bolt",
  "fire",
  "star",
  "heart",
  "check",
  "cross",
  "warning",
  "play",
  "pause",
  "stop",
  "music",
  "laser",
  "fog",
  "snow",
  "fan",
  "circle",
  "square",
  "triangle",
  "arrow_up",
  "arrow_down",
  "arrow_left",
  "arrow_right",
] as const;

export type StreamDeckIconId = (typeof STREAM_DECK_ICONS)[number];

export const COLOR_PRESETS: { name: string; color: [number, number, number] }[] = [
  { name: "Red", color: [180, 30, 30] },
  { name: "Orange", color: [200, 100, 30] },
  { name: "Amber", color: [220, 170, 40] },
  { name: "Yellow", color: [210, 200, 40] },
  { name: "Green", color: [40, 150, 80] },
  { name: "Teal", color: [30, 140, 140] },
  { name: "Blue", color: [40, 100, 200] },
  { name: "Purple", color: [120, 50, 180] },
  { name: "Pink", color: [190, 50, 120] },
  { name: "Gray", color: [70, 70, 70] },
  { name: "White", color: [210, 210, 210] },
  { name: "Black", color: [28, 28, 28] },
];

export function iconGlyph(id: string): string {
  const map: Record<string, string> = {
    none: "·",
    blackout: "◼",
    clear: "✕",
    output: "◉",
    go: "▶",
    back: "◀",
    dimmer: "☀",
    zero: "⌀",
    shutter: "▣",
    cue: "!",
    color: "◐",
    fixture: "⌂",
    flash: "↯",
    bolt: "⚡",
    fire: "▲",
    star: "★",
    heart: "♥",
    check: "✓",
    cross: "✗",
    warning: "⚠",
    play: "▶",
    pause: "❚❚",
    stop: "■",
    music: "♪",
    laser: "⟋",
    fog: "≋",
    snow: "❄",
    fan: "✱",
    circle: "○",
    square: "□",
    triangle: "△",
    arrow_up: "↑",
    arrow_down: "↓",
    arrow_left: "←",
    arrow_right: "→",
  };
  return map[id] ?? "·";
}

export function defaultIconForActionType(type: string): StreamDeckIconId {
  switch (type) {
    case "blackoutToggle":
      return "blackout";
    case "clearProgrammer":
      return "clear";
    case "outputToggle":
      return "output";
    case "playbackGo":
      return "go";
    case "playbackBack":
      return "back";
    case "dimmerFull":
      return "dimmer";
    case "dimmerZero":
      return "zero";
    case "shutterOpen":
    case "shutterClosed":
      return "shutter";
    case "selectFid":
      return "fixture";
    case "fireCue":
      return "cue";
    case "colorRed":
    case "colorGreen":
    case "colorBlue":
    case "colorWhite":
    case "colorCyan":
    case "colorMagenta":
    case "colorYellow":
    case "colorAmber":
      return "color";
    default:
      return "none";
  }
}

const STORAGE_KEY = "olc.streamdeck.mappings";

export function loadSavedMappings(): unknown[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function saveMappings(mappings: unknown[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(mappings));
}
