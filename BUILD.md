# Build Instructions

## Development Setup

```bash
git clone <repository-url>
cd stremio-pip-extension
npm install
npm test
```

## Packaging for Distribution

```bash
cd stremio-pip-extension
zip -r ../stremio-pip-extension.zip . -x 'node_modules/*' '__tests__/*' 'coverage/*' '.sisyphus/*' '*.log' 'BUILD.md'
```

## Verify Package

```bash
unzip -l ../stremio-pip-extension.zip
```

The package should contain only:
- manifest.json
- background.js
- src/*.js
- icons/*.png

## Version Bumping

1. Update `version` in `manifest.json`
2. Update `version` in `package.json`
3. Commit and tag: `git tag v1.x.x`

## Chrome Web Store Submission

1. Package as .zip (see above)
2. Go to https://chrome.google.com/webstore/devconsole
3. Click "New Item" and upload the .zip
4. Fill in listing details
5. Submit for review
