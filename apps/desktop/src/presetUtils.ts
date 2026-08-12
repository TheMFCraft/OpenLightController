import type { FeatureGroup, Preset } from "./types";

export type PresetBank = FeatureGroup | "all";

export const PRESET_BANKS: { id: PresetBank; label: string }[] = [
  { id: "all", label: "All" },
  { id: "dimmer", label: "Dimmer" },
  { id: "color", label: "Color" },
  { id: "position", label: "Position" },
  { id: "beam", label: "Beam" },
  { id: "gobo", label: "Gobo" },
  { id: "color_wheel", label: "Wheel" },
  { id: "other", label: "Other" },
];

export const STORE_SCOPES: { id: PresetBank; label: string; description: string }[] = [
  { id: "all", label: "All attributes", description: "Store everything currently in the programmer" },
  { id: "dimmer", label: "Dimmer", description: "Store dimmer attributes only" },
  { id: "color", label: "Color", description: "Store color attributes only" },
  { id: "position", label: "Position", description: "Store position attributes only" },
  { id: "beam", label: "Beam", description: "Store beam / shutter attributes only" },
  { id: "gobo", label: "Gobo", description: "Store gobo attributes only" },
  { id: "color_wheel", label: "Color wheel", description: "Store color wheel attributes only" },
  { id: "other", label: "Other", description: "Store other attributes only" },
];

export function featureGroupLabel(group: FeatureGroup): string {
  return PRESET_BANKS.find((b) => b.id === group)?.label ?? group;
}

export function presetMatchesBank(preset: Preset, bank: PresetBank): boolean {
  if (bank === "all") return true;
  if (preset.coversAll) return false;
  return preset.featureGroup === bank;
}

export function presetScopeLabel(preset: Preset): string {
  if (preset.coversAll) return "All";
  return featureGroupLabel(preset.featureGroup);
}

export function presetAttributePreview(preset: Preset, limit = 4): string {
  const names = Object.keys(preset.values);
  if (!names.length) return "Empty";
  const head = names.slice(0, limit).join(", ");
  if (names.length <= limit) return head;
  return `${head} +${names.length - limit}`;
}

export function sortPresets(presets: Preset[]): Preset[] {
  return [...presets].sort((a, b) => {
    const numA = a.number && a.number > 0 ? a.number : Number.MAX_VALUE;
    const numB = b.number && b.number > 0 ? b.number : Number.MAX_VALUE;
    if (numA !== numB) return numA - numB;
    return a.name.localeCompare(b.name);
  });
}

export function storeScopeToArgs(scope: PresetBank): {
  featureGroup: FeatureGroup;
  coversAll: boolean;
} {
  if (scope === "all") {
    return { featureGroup: "other", coversAll: true };
  }
  return { featureGroup: scope, coversAll: false };
}
