# I made a Chrome extension that adds Picture-in-Picture with subtitles to Stremio Web

Hey r/Stremio!

I've been using Stremio Web and got frustrated that the built-in PiP mode doesn't show subtitles. So I built a Chrome extension that fixes this — and added some extra features along the way.

## What it does

- **Picture-in-Picture with subtitles** — The main thing. HTML subtitle overlays stay visible in the PiP window.
- **Custom controls** — Play/pause, ±15s skip, progress bar, volume slider, and a timer. All inside the PiP window. No need to switch back to the main tab.
- **Fit to Ratio** — One-click button to resize the PiP window to match the video's actual aspect ratio. No more black bars.
- **Auto-hide controls** — Controls fade out after 3 seconds, reappear when you move your mouse.
- **Clean PiP view** — Hides Stremio's native purple control bar inside PiP so you only see the video + subtitles + custom controls.

## How it works

It uses the [Document Picture-in-Picture API](https://developer.chrome.com/docs/web-platform/document-picture-in-picture/) (Chrome 116+) instead of the regular PiP API. This lets it move the entire video container — including the subtitle overlay — into the PiP window, and inject custom HTML controls on top.

## Install

It's not on the Chrome Web Store yet, but you can install it manually in about 30 seconds:

1. Download/clone from GitHub: [chigarow/stremio-pip-extension](https://github.com/chigarow/stremio-pip-extension)
2. Go to `chrome://extensions/`
3. Enable Developer Mode
4. Click "Load unpacked" and select the `dist/` folder
5. Done. Go to web.stremio.com, play something, click the extension icon.

Works on Chrome, Vivaldi, Edge, Brave — any Chromium browser that supports Document PiP.

## Browser support

- Chrome 116+
- Vivaldi 6.2+
- Edge 116+
- Brave 1.58+

Firefox doesn't support Document PiP API yet, so no Firefox for now.

## Source

Fully open source (MIT): https://github.com/chigarow/stremio-pip-extension

If you run into any issues or have feature requests, feel free to open an issue on GitHub.

---

Would love to hear your feedback. Especially interested in knowing if the subtitle detection works well across different content — I've tested it with a few shows but more testing is always better.
