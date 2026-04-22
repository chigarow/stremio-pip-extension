# Stremio PiP Extension

> Chrome Extension (Manifest V3) that enables Document Picture-in-Picture
> for [Stremio Web](https://web.stremio.com) with subtitle overlay and custom controls.

## Features

- Document Picture-in-Picture for Stremio Web
- HTML subtitle overlays visible in PiP window
- Custom PiP controls overlay (play/pause, skip, seek, volume, fit-to-ratio)
- Auto-hide controls after 3 seconds of inactivity
- Fit-to-Ratio — resizes PiP window to match video aspect ratio
- Hides native Stremio control bar in PiP window
- Full CSS syncing (styles preserved in PiP)
- Toggle PiP via toolbar button
- Seamless video restoration on PiP close
- User-friendly error notifications

## Requirements

- Chromium-based browser with Document PiP API support:
  - Google Chrome 116+
  - Vivaldi 6.2+
  - Microsoft Edge 116+
  - Brave 1.58+
- Stremio Web account (https://web.stremio.com)

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open your browser and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the **`dist/`** folder (not the root directory)
6. The Stremio PiP icon should appear in your toolbar

> **Important:** You must load the `dist/` folder specifically. Loading the root directory will fail because browsers reject folders starting with `_` (like `__tests__/`).

### Building dist from source

```bash
npm install
npm test
# dist/ folder is ready to load
```

## Usage

1. Navigate to [web.stremio.com](https://web.stremio.com)
2. Start playing any video with subtitles enabled
3. Click the Stremio PiP toolbar icon
4. A floating PiP window opens with video, subtitles, and custom controls
5. Click the toolbar icon again (or close the window) to exit PiP

### PiP Controls

When the PiP window is open, hover over it to reveal the control bar:

| Control | Icon | Action |
|---------|------|--------|
| Play / Pause | ▶ / ⏸ | Toggle video playback |
| Skip Back | ⏪ | Jump back 15 seconds |
| Skip Forward | ⏩ | Jump forward 15 seconds |
| Progress Bar | — | Click anywhere to seek |
| Timer | 0:00 / 0:00 | Shows current time / duration |
| Volume | 🔊 / 🔇 | Click to mute/unmute, drag slider to adjust |
| Fit to Ratio | ◱ | Resize PiP window to match video aspect ratio |

Controls auto-hide after 3 seconds of inactivity and reappear on mouse movement.

## Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
npm install
```

### Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch
```

### Test Coverage

This project maintains 80%+ test coverage across all modules (currently 97%+ statements, 85%+ branches):

- `src/dom-detector.js` — DOM element detection
- `src/css-sync.js` — CSS stylesheet copying
- `src/pip-manager.js` — Document PiP lifecycle
- `src/pip-controls.js` — Custom PiP controls
- `src/notification.js` — User notifications

## Project Structure

```
stremio-pip-extension/
├── manifest.json          # Chrome Extension manifest (MV3)
├── background.js          # Service worker (icon click handler)
├── src/
│   ├── content.js         # Content script orchestrator
│   ├── dom-detector.js    # DOM element detection (dual strategy)
│   ├── css-sync.js        # CSS stylesheet copying
│   ├── pip-manager.js     # Document PiP lifecycle management
│   ├── pip-controls.js    # Custom PiP controls (play, skip, seek, volume, fit-ratio)
│   └── notification.js    # User error notifications
├── dist/                  # Production build (load this in browser)
├── __tests__/
│   ├── dom-detector.test.js
│   ├── css-sync.test.js
│   ├── pip-manager.test.js
│   ├── pip-controls.test.js
│   ├── notification.test.js
│   ├── integration.test.js
│   └── e2e.test.js
├── icons/
│   ├── logo.svg
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── jest.config.js
├── package.json
└── .gitignore
```

## Architecture

1. **background.js** — Listens for icon clicks, sends toggle message to content script
2. **content.js** — Orchestrates all modules on the Stremio Web page
3. **dom-detector.js** — Dual-strategy DOM detection (class pattern + structural fallback)
4. **pip-manager.js** — Document PiP lifecycle (open, close, restore with pagehide)
5. **pip-controls.js** — Hides native Stremio controls, injects custom control bar with play/pause, skip, seek, volume, and fit-to-ratio
6. **css-sync.js** — Comprehensive CSS syncing (inline styles + external links)
7. **notification.js** — Chrome notifications with console.warn fallback

### Document PiP Flow

1. User clicks toolbar icon — background.js sends `togglePiP` message
2. Content script calls `findVideoContainer()` to locate video + subtitle container
3. `openPiP()` moves the container to a new PiP window (preserving video state)
4. `copyStylesheets()` syncs all CSS to the PiP window
5. `hideNativeControls()` hides Stremio's built-in control bar
6. `injectPipControls()` adds the custom control overlay with all buttons and event listeners
7. On close (pagehide event), all controls are cleaned up and the container is restored

## Known Limitations

- Only works on Chromium-based browsers with Document PiP API (Chrome 116+, Vivaldi, Edge, Brave)
- Only supports Stremio Web (web.stremio.com)
- Subtitle overlays must be HTML-based (not burned into video)
- CSS Module class names may change on Stremio updates (structural fallback mitigates this)
- PiP window cannot go fullscreen (API restriction)
- Requires user gesture (click) to activate PiP
- Fit-to-Ratio requires user gesture (click the button) due to browser security restrictions on window resizing

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension fails to load | Load the `dist/` folder, not the root directory |
| PiP button doesn't respond | Ensure you're on web.stremio.com with a video playing |
| No subtitles in PiP window | Enable subtitles in Stremio player first |
| Extension icon grayed out | Navigate to web.stremio.com and refresh |
| PiP window empty | Start playing a video before clicking PiP |
| "API not supported" error | Update your browser (Chrome 116+, Vivaldi 6.2+, Edge 116+) |
| Controls not showing | Hover over the PiP window to reveal controls |
| Fit to Ratio not working | Click the button directly (requires user gesture) |

## License

MIT
