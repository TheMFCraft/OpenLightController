import type { ScreenPanel } from "./types";

export const SCREEN_PANELS: {
  id: ScreenPanel;
  label: string;
  description: string;
}[] = [
  {
    id: "playbacks",
    label: "Playbacks",
    description: "8 playback faders with GO / Back",
  },
  {
    id: "cues",
    label: "Cues",
    description: "Fire cues from all cue lists",
  },
  {
    id: "dmx_output",
    label: "DMX Output",
    description: "Live view of all 512 channels per universe",
  },
  {
    id: "status",
    label: "Status & Master",
    description: "Clock, blackout and output controls",
  },
];

export function screenPanelLabel(panel: ScreenPanel): string {
  return SCREEN_PANELS.find((p) => p.id === panel)?.label ?? panel;
}

export function parseScreenPanel(value: string | null): ScreenPanel {
  if (value === "cues" || value === "dmx_output" || value === "status" || value === "playbacks") {
    return value;
  }
  return "playbacks";
}
