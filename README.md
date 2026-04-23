# Stremio PiP - Picture-in-Picture with Subtitles

> Chromium extension (Manifest V3) that enables Document Picture-in-Picture
> for [Stremio Web](https://web.stremio.com) with full subtitle overlay support.

## Features

- Document Picture-in-Picture for Stremio Web
- HTML subtitle overlays visible in the PiP window
- Custom PiP controls overlay with play/pause, 15s skip back/forward, progress seek, timer, volume, and fit-to-ratio controls
- Auto-hide controls after 3 seconds of inactivity, with controls shown again on mouse move
- Fit-to-Ratio button that resizes the PiP window to match the video aspect ratio
- Native Stremio control bar hidden inside PiP for a cleaner playback view
- Toggle PiP via toolbar button
- Full CSS syncing so styles are preserved in PiP
- Seamless video restoration on PiP close
- User-friendly error notifications

## Requirements

- Chromium-based browser with Document PiP API support (Chrome 116+, Vivaldi, Edge, Brave, and similar browsers)
- Stremio Web account (https://web.stremio.com)

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open a Chromium-based browser and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the `dist/` folder
6. The Stremio PiP icon should appear in your toolbar

> Important: load `dist/`, not the repository root. The root contains folders such as `__tests__/`, and browsers like Chrome and Vivaldi reject extension folders that include directories starting with `_`.

## Usage

1. Navigate to [web.stremio.com](https://web.stremio.com)
2. Start playing any video with subtitles enabled
3. Click the Stremio PiP toolbar icon
4. A floating PiP window opens with video + subtitles
5. Click the toolbar icon again (or close the window) to exit PiP

### Controls

- Play/Pause: toggles playback in the PiP window
- Skip back 15s: jumps backward by 15 seconds
- Skip forward 15s: jumps forward by 15 seconds
- Progress bar: click or drag to seek within the video
- Timer: shows the current time and total duration
- Volume toggle + slider: mutes/unmutes and adjusts volume
- Fit to Ratio: resizes the PiP window to match the video aspect ratio

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

This project maintains 97%+ test coverage across 122 tests in 7 suites:

- `src/dom-detector.js` - DOM element detection
- `src/css-sync.js` - CSS stylesheet copying
- `src/pip-manager.js` - Document PiP lifecycle
- `src/pip-controls.js` - Custom PiP controls overlay
- `src/notification.js` - User notifications

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
├── __tests__/
│   ├── dom-detector.test.js
│   ├── css-sync.test.js
│   ├── pip-manager.test.js
│   ├── pip-controls.test.js
│   ├── notification.test.js
│   ├── integration.test.js
│   └── e2e.test.js
├── dist/                  # Production build loaded into the browser
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   ├── icon128.png
│   └── logo.svg           # SVG source logo
├── jest.config.js
├── package.json
└── .gitignore
```

## Architecture

The extension uses a modular architecture:

1. **background.js** — Service worker that listens for extension icon clicks and sends toggle messages to the content script
2. **content.js** — Orchestrator that coordinates all modules on the Stremio Web page
3. **dom-detector.js** — Dual-strategy DOM detection (class pattern → structural fallback)
4. **pip-manager.js** — Document PiP lifecycle management (open, close, restore)
5. **pip-controls.js** — Injects the custom PiP controls overlay, hides the native Stremio control bar, and manages PiP UI interactions
6. **css-sync.js** — Comprehensive CSS syncing to PiP window
7. **notification.js** — User-friendly error and success notifications

### Document PiP Flow

1. User clicks toolbar icon → background.js sends `togglePiP` message
2. Content script calls `findVideoContainer()` to locate video + subtitle container
3. `openPiP()` moves the container to a new PiP window (preserving video state)
4. `copyStylesheets()` syncs all CSS to the PiP window for proper rendering
5. `injectPipControls()` adds the custom controls overlay and `hideNativeControls()` removes the native Stremio control bar in PiP
6. On close (`pagehide` event), container is restored to original position

## Known Limitations

- Requires a Chromium-based browser with Document PiP API support
- Only supports Stremio Web (web.stremio.com)
- Subtitle overlays must be HTML-based (not burned into video)
- CSS Module class names may change on Stremio updates (fallback heuristics mitigate this)
- PiP window cannot go fullscreen (API restriction)
- Requires user gesture (click) to activate PiP

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension fails to load | Load the `dist/` folder, not the root directory |
| PiP button doesn't respond | Ensure you're on web.stremio.com with a video playing |
| No subtitles in PiP window | Enable subtitles in Stremio player first |
| Extension icon grayed out | Navigate to web.stremio.com and refresh |
| PiP window empty | Start playing a video before clicking PiP |
| "API not supported" error | Use a Chromium-based browser with Document PiP support (Chrome 116+, Vivaldi, Edge, Brave, etc.) |

## License

MIT
