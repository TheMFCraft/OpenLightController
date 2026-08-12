import type { MonitorInfo } from "./types";
import type { ScreenDefinition } from "./screenStore";

export function monitorByIndex(
  monitors: MonitorInfo[],
  index: number | null,
): MonitorInfo | undefined {
  if (index == null) return undefined;
  return monitors.find((m) => m.index === index);
}

export function isPrimaryMonitor(monitors: MonitorInfo[], index: number | null): boolean {
  return monitorByIndex(monitors, index)?.primary ?? false;
}

export function selectableMonitors(monitors: MonitorInfo[]): MonitorInfo[] {
  return monitors.filter((m) => !m.primary);
}

export function hasSecondaryMonitor(monitors: MonitorInfo[]): boolean {
  return selectableMonitors(monitors).length > 0;
}

export function canAssignExternalScreenToMonitor(
  monitors: MonitorInfo[],
  index: number | null,
): boolean {
  if (index == null) return true;
  return !isPrimaryMonitor(monitors, index);
}

export function canUseFullscreenOnMonitor(
  monitors: MonitorInfo[],
  index: number | null,
): boolean {
  if (index == null) return false;
  return !isPrimaryMonitor(monitors, index);
}

export function normalizeScreenMonitor<T extends Pick<ScreenDefinition, "monitorIndex" | "fullscreen">>(
  monitors: MonitorInfo[],
  screen: T,
): T {
  if (isPrimaryMonitor(monitors, screen.monitorIndex)) {
    return { ...screen, monitorIndex: null, fullscreen: false };
  }
  if (screen.monitorIndex == null && screen.fullscreen) {
    return { ...screen, fullscreen: false };
  }
  return screen;
}

export function primaryMonitorWarning(monitors: MonitorInfo[], index: number | null): string | null {
  if (!isPrimaryMonitor(monitors, index)) return null;
  return "The primary monitor is reserved for the main console. Choose a secondary monitor or the default windowed layout.";
}

export function singleMonitorHint(monitors: MonitorInfo[]): string | null {
  if (hasSecondaryMonitor(monitors)) return null;
  return "Only one display detected. External screens open as smaller windows and never cover the main console.";
}
