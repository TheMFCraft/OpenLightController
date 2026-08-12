import { invoke } from "@tauri-apps/api/core";
import type {
  DeckKeyMapping,
  FeatureGroup,
  MonitorInfo,
  OpenScreenWindowOptions,
  OutputConfig,
  ShowState,
  StreamDeckDeviceInfo,
  StreamDeckStatus,
  WebRemoteStatus,
} from "./types";

export const api = {
  getShowState: () => invoke<ShowState>("get_show_state"),
  patchFixture: (args: {
    definitionId: string;
    name?: string;
    universe: number;
    address: number;
    quantity?: number;
    offset?: number;
  }) =>
    invoke<ShowState>("patch_fixture", {
      definitionId: args.definitionId,
      name: args.name ?? null,
      universe: args.universe,
      address: args.address,
      quantity: args.quantity ?? 1,
      offset: args.offset ?? null,
    }),
  unpatchFixture: (id: string) => invoke<ShowState>("unpatch_fixture", { id }),
  selectFixtures: (ids: string[], additive: boolean) =>
    invoke<ShowState>("select_fixtures", { ids, additive }),
  selectGroup: (groupId: string, additive: boolean) =>
    invoke<ShowState>("select_group", { groupId, additive }),
  setAttribute: (name: string, value: number) =>
    invoke<ShowState>("set_attribute", { name, value }),
  setAttributes: (values: Record<string, number>) =>
    invoke<ShowState>("set_attributes", { values }),
  setBlackout: (enabled: boolean) =>
    invoke<ShowState>("set_blackout", { enabled }),
  clearProgrammer: () => invoke<ShowState>("clear_programmer"),
  clearProgrammerAll: () => invoke<ShowState>("clear_programmer_all"),
  storeGroup: (name: string) => invoke<ShowState>("store_group", { name }),
  deleteGroup: (id: string) => invoke<ShowState>("delete_group", { id }),
  storePreset: (name: string, featureGroup: FeatureGroup) =>
    invoke<ShowState>("store_preset", { name, featureGroup }),
  applyPreset: (id: string) => invoke<ShowState>("apply_preset", { id }),
  deletePreset: (id: string) => invoke<ShowState>("delete_preset", { id }),
  createCueList: (name: string) => invoke<ShowState>("create_cue_list", { name }),
  storeCue: (cueListId: string, name: string, fadeMs: number) =>
    invoke<ShowState>("store_cue", { cueListId, name, fadeMs }),
  deleteCue: (cueListId: string, cueId: string) =>
    invoke<ShowState>("delete_cue", { cueListId, cueId }),
  assignPlayback: (index: number, cueListId: string | null, label?: string) =>
    invoke<ShowState>("assign_playback", {
      index,
      cueListId,
      label: label ?? null,
    }),
  setPlaybackFader: (index: number, value: number) =>
    invoke<ShowState>("set_playback_fader", { index, value }),
  playbackGo: (index: number) => invoke<ShowState>("playback_go", { index }),
  playbackBack: (index: number) => invoke<ShowState>("playback_back", { index }),
  setOutputConfig: (config: OutputConfig) =>
    invoke<ShowState>("set_output_config", { config }),
  setOutputEnabled: (enabled: boolean) =>
    invoke<ShowState>("set_output_enabled", { enabled }),
  newShow: () => invoke<ShowState>("new_show"),
  setShowName: (name: string) => invoke<ShowState>("set_show_name", { name }),
  saveShow: (path: string) => invoke<ShowState>("save_show", { path }),
  loadShow: (path: string) => invoke<ShowState>("load_show", { path }),
  getUniverseSnapshot: (universe: number) =>
    invoke<number[]>("get_universe_snapshot", { universe }),
  listStreamDecks: () => invoke<StreamDeckDeviceInfo[]>("list_streamdecks"),
  getStreamDeckStatus: () => invoke<StreamDeckStatus>("get_streamdeck_status"),
  connectStreamDeck: (serial?: string) =>
    invoke<StreamDeckStatus>("connect_streamdeck", { serial: serial ?? null }),
  disconnectStreamDeck: () => invoke<StreamDeckStatus>("disconnect_streamdeck"),
  setStreamDeckMappings: (mappings: DeckKeyMapping[]) =>
    invoke<StreamDeckStatus>("set_streamdeck_mappings", { mappings }),
  assignStreamDeckKey: (mapping: DeckKeyMapping) =>
    invoke<StreamDeckStatus>("assign_streamdeck_key", { mapping }),
  fireCue: (cueListId: string, cueId: string) =>
    invoke<ShowState>("fire_cue", { cueListId, cueId }),
  getWebRemoteStatus: () => invoke<WebRemoteStatus>("get_webremote_status"),
  startWebRemote: (port: number) => invoke<WebRemoteStatus>("start_webremote", { port }),
  stopWebRemote: () => invoke<WebRemoteStatus>("stop_webremote"),
  listMonitors: () => invoke<MonitorInfo[]>("list_monitors"),
  openScreenWindow: (options: OpenScreenWindowOptions) =>
    invoke<void>("open_screen_window", { options }),
  closeScreenWindow: (windowLabel: string) =>
    invoke<void>("close_screen_window", { windowLabel }),
  listOpenScreenWindows: () => invoke<string[]>("list_open_screen_windows"),
  isScreenWindowOpen: (windowLabel: string) =>
    invoke<boolean>("is_screen_window_open", { windowLabel }),
};
