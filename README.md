# Stremio PiP - Picture-in-Picture with Subtitles

> Chrome Extension (Manifest V3) that enables Document Picture-in-Picture
> for [Stremio Web](https://web.stremio.com) with full subtitle overlay support.

## Features

- Document Picture-in-Picture for Stremio Web
- HTML subtitle overlays visible in PiP window
- Toggle PiP via toolbar button
- Full CSS syncing (styles preserved in PiP)
- Seamless video restoration on PiP close
- User-friendly error notifications

## Requirements

- Google Chrome 116+ (Document PiP API required)
- Stremio Web account (https://web.stremio.com)

## Installation

### From Source (Developer Mode)

1. Clone or download this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (top-right toggle)
4. Click "Load unpacked"
5. Select the `stremio-pip-extension/` directory
6. The Stremio PiP icon should appear in your toolbar

## Usage

1. Navigate to [web.stremio.com](https://web.stremio.com)
2. Start playing any video with subtitles enabled
3. Click the Stremio PiP toolbar icon
4. A floating PiP window opens with video + subtitles
5. Click the toolbar icon again (or close the window) to exit PiP

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

This project maintains 80%+ test coverage across all modules:

- `src/dom-detector.js` - DOM element detection
- `src/css-sync.js` - CSS stylesheet copying
- `src/pip-manager.js` - Document PiP lifecycle
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
│   └── notification.js    # User error notifications
├── __tests__/
│   ├── dom-detector.test.js
│   ├── css-sync.test.js
│   ├── pip-manager.test.js
│   ├── notification.test.js
│   ├── integration.test.js
│   └── e2e.test.js
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
├── jest.config.js
├── package.json
└── .gitignore
```

## Architecture

1. **background.js** — Listens for icon clicks, sends toggle message to content script
2. **content.js** — Orchestrates all modules on the Stremio Web page
3. **dom-detector.js** — Dual-strategy DOM detection (class pattern + structural fallback)
4. **pip-manager.js** — Document PiP lifecycle (open, close, restore with pagehide)
5. **css-sync.js** — Comprehensive CSS syncing (inline styles + external links)
6. **notification.js** — Chrome notifications with console.warn fallback

### Document PiP Flow

1. User clicks toolbar icon → background.js sends `togglePiP` message
2. Content script calls `findVideoContainer()` to locate video + subtitle container
3. `openPiP()` moves the container to a new PiP window (preserving video state)
4. `copyStylesheets()` syncs all CSS to the PiP window
5. On close (pagehide event), container is restored to original position

## Known Limitations

- Only works on Google Chrome 116+ (Document PiP API)
- Only supports Stremio Web (web.stremio.com)
- Subtitle overlays must be HTML-based (not burned into video)
- CSS Module class names may change on Stremio updates (fallback mitigates)
- PiP window cannot go fullscreen (API restriction)
- Requires user gesture (click) to activate PiP

## Troubleshooting

| Issue | Solution |
|-------|----------|
| PiP button doesn't respond | Ensure you're on web.stremio.com with a video playing |
| No subtitles in PiP window | Enable subtitles in Stremio player first |
| Extension icon grayed out | Navigate to web.stremio.com and refresh |
| PiP window empty | Start playing a video before clicking PiP |
| "API not supported" error | Update Chrome to version 116+ |

## License

MIT
