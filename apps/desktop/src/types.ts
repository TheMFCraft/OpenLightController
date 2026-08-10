export type FeatureGroup =
  | "dimmer"
  | "color"
  | "position"
  | "beam"
  | "gobo"
  | "color_wheel"
  | "other";

export interface AttributeDef {
  name: string;
  featureGroup: FeatureGroup;
  offset: number;
  fineOffset: number | null;
  default: number;
  highlight: number;
}

export interface FixtureDefinition {
  id: string;
  manufacturer: string;
  name: string;
  mode: string;
  category: string;
  channelCount: number;
  attributes: AttributeDef[];
}

export interface PatchedFixture {
  id: string;
  fid: number;
  name: string;
  definitionId: string;
  universe: number;
  address: number;
}

export interface Group {
  id: string;
  name: string;
  fixtureIds: string[];
}

export interface Preset {
  id: string;
  name: string;
  featureGroup: FeatureGroup;
  values: Record<string, number>;
}

export interface Cue {
  id: string;
  number: number;
  name: string;
  fadeMs: number;
  values: Record<string, number>;
}

export interface CueList {
  id: string;
  name: string;
  cues: Cue[];
}

export interface PlaybackSlot {
  index: number;
  label: string;
  cueListId: string | null;
  fader: number;
  currentCueIndex: number | null;
  fading: boolean;
}

export interface UniverseMapEntry {
  internalUniverse: number;
  artnetNet: number;
  artnetSubnet: number;
  artnetUniverse: number;
  sacnUniverse: number;
  artnetEnabled: boolean;
  sacnEnabled: boolean;
}

export interface OutputConfig {
  artnetEnabled: boolean;
  sacnEnabled: boolean;
  artnetTarget: string;
  artnetBroadcast: boolean;
  sacnPriority: number;
  universes: UniverseMapEntry[];
}

export interface ProgrammerState {
  selection: string[];
  values: Record<string, number>;
}

export interface ShowState {
  name: string;
  fixtures: PatchedFixture[];
  groups: Group[];
  presets: Preset[];
  cueLists: CueList[];
  playbacks: PlaybackSlot[];
  output: OutputConfig;
  outputEnabled: boolean;
  blackout: boolean;
  programmer: ProgrammerState;
  definitions: FixtureDefinition[];
}

export type DeckAction =
  | { type: "empty" }
  | { type: "blackoutToggle" }
  | { type: "clearProgrammer" }
  | { type: "outputToggle" }
  | { type: "playbackGo"; index: number }
  | { type: "playbackBack"; index: number }
  | { type: "dimmerFull" }
  | { type: "dimmerZero" }
  | { type: "shutterOpen" }
  | { type: "shutterClosed" }
  | { type: "selectFid"; fid: number }
  | { type: "colorRed" }
  | { type: "colorGreen" }
  | { type: "colorBlue" }
  | { type: "colorWhite" }
  | { type: "colorCyan" }
  | { type: "colorMagenta" }
  | { type: "colorYellow" }
  | { type: "colorAmber" }
  | { type: "fireCue"; cueListId: string; cueId: string };

export interface DeckKeyMapping {
  key: number;
  label: string;
  action: DeckAction;
  color: [number, number, number];
}

export interface StreamDeckDeviceInfo {
  kind: string;
  serial: string;
  keyCount: number;
  rows: number;
  columns: number;
}

export interface StreamDeckStatus {
  connected: boolean;
  kind: string | null;
  serial: string | null;
  keyCount: number;
  rows: number;
  columns: number;
  mappings: DeckKeyMapping[];
  lastError: string | null;
}
