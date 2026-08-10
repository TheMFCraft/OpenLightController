<p align="center">
  <img src="docs/brand/logo.png" alt="OpenLightController logo" width="160" height="160" />
</p>

<h1 align="center">OpenLightController</h1>

<p align="center">
  <strong>Cross-platform lighting console</strong> for live shows — fixtures, cues, playbacks,<br />
  Art-Net / sACN output, and Stream Deck control.
</p>

<p align="center">
  <a href="#features">Features</a> ·
  <a href="#quick-start">Quick start</a> ·
  <a href="#patch--fixture-library">Patch</a> ·
  <a href="#stream-deck">Stream Deck</a> ·
  <a href="#build">Build</a>
</p>

---

OpenLightController is a free, open lighting controller inspired by compact onPC-style workflows.  
It runs natively on **Windows**, **macOS**, and **Linux** via [Tauri 2](https://v2.tauri.app/) (Rust engine + React UI).

> Repository: [github.com/TheMFCraft/OpenLightController](https://github.com/TheMFCraft/OpenLightController)

## Features

| Area | What you get |
|------|----------------|
| **Patch** | Fixture library by manufacturer, channel modes, Quantity & Offset |
| **Programmer** | Live attributes, HSV color wheel, groups & presets |
| **Cues** | Tracking cue lists with fade times |
| **Playbacks** | 8 faders, HTP dimmer / LTP other, programmer priority |
| **Network** | Art-Net + sACN (E1.31), 4 universes |
| **Stream Deck** | Connect Elgato Stream Deck, assign cues to keys |
| **Showfile** | Save / load JSON shows |

### Fixture library (excerpt)

- **Laserworld** — EL / CS / DS / PL / tarm / Clubmax / CUBE (DJ + Professional modes)
- **Fun Generation** — Laser Derby, Mini Laser, LED Pot, UV, Strobe
- **Stairville** — DJLase, LED PAR, MH movers, fog, LED bars
- **Generic** — Dimmer, RGB(W), LED Wash (7ch), moving lights, atmos
- Also: Chauvet, Martin-style profiles

## Quick start

### Requirements

- [Node.js](https://nodejs.org/) 20+
- [Rust](https://rustup.rs/) (stable)
- Platform deps for Tauri: [prerequisites](https://v2.tauri.app/start/prerequisites/)

### Develop

```bash
git clone https://github.com/TheMFCraft/OpenLightController.git
cd OpenLightController/apps/desktop
npm install
npm run tauri dev
```

From the repo root you can also use:

```bash
npm run dev
```

## Patch

1. Open **Patch**
2. Filter by **manufacturer**
3. Select a fixture → choose **channel mode**
4. Set **Universe**, **Address**, **Quantity**, **Offset** (address step; default = channel count)
5. Patch

Example **LED Wash** footprint (7ch): Dimmer · Shutter · R · G · B · W · *(ch7 unbound)*

## Stream Deck

1. Quit the official Elgato Stream Deck software (it locks HID access)
2. Open **Stream Deck** → Connect — layout size is detected automatically (Mini, Mk2, XL, …)
3. Tap a key in the grid → assign a **cue**
4. Hardware key press fires that cue (with fade)

On Linux you may need HID udev rules (see the [`elgato-streamdeck`](https://crates.io/crates/elgato-streamdeck) docs).

## Network / DMX

- Enable **Art-Net** and/or **sACN** under **Network**
- Map internal universes → Art-Net / sACN universes
- Toggle **Output On**

Verify with [QLC+](https://www.qlcplus.org/), an Art-Net monitor, or sACN View.

## Build

```bash
cd apps/desktop
npm run tauri build
```

Installers / bundles appear under `apps/desktop/src-tauri/target/release/bundle/`.

Root shortcut:

```bash
npm run build
```

## Releases (CI)

Creating a **GitHub Release** (e.g. tag `v0.2.0`) triggers [`.github/workflows/release.yml`](.github/workflows/release.yml), which builds and uploads:

| Platform | Artifact |
|----------|----------|
| Windows | `.exe` (NSIS installer) |
| Linux | `.deb` |
| macOS | `.pkg` (universal Intel + Apple Silicon) |

1. Push your changes to `main`
2. On GitHub: **Releases → Draft a new release**
3. Create a tag like `v0.2.0` and publish
4. Wait for the workflow; installers appear under that release’s assets

> macOS `.pkg` is currently unsigned. First open may require **Right-click → Open** (or allow in System Settings → Privacy & Security).

## Tests

```bash
cd apps/desktop/src-tauri
cargo test
```

Or from the repo root:

```bash
npm test
```

## Project layout

```
OpenLightController/
├── apps/desktop/          # Tauri 2 + React / TypeScript UI
│   └── src-tauri/         # Rust engine, Art-Net / sACN, Stream Deck
├── fixtures/library/      # JSON fixture definitions (reference)
├── docs/brand/            # Brand assets (app / taskbar icon)
│   └── logo.png
├── packages/shared/       # Shared notes / future DTOs
└── README.md
```

## Tech stack

- **App shell:** Tauri 2  
- **UI:** React 19, TypeScript, Vite, Zustand  
- **Engine:** Rust (patch, programmer, tracking, merge, protocols)  
- **HID:** [`elgato-streamdeck`](https://crates.io/crates/elgato-streamdeck)

## Roadmap (not in MVP)

Effects engine · GDTF import · MIDI / OSC · RDM · 3D visualizer · multi-user session

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/TheMFCraft/OpenLightController).

## License

MIT
