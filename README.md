<p align="center">
  <img src="assets/yui.jpg" alt="Pinterest Filename Fix" width="400">
</p>

# Pinterest Filename Fix

A Firefox extension that fixes Pinterest image downloads by giving them proper filenames (e.g., `Pin Title.jpg`) instead of just `jpg`.

## Problem

When downloading images from Pinterest, Firefox saves them with broken filenames like `jpg` instead of meaningful names like `My Pin Title.jpg`. This extension intercepts the download button click and saves images with proper filenames.

## Features

- ✅ Intercepts Pinterest's "Download image" button
- ✅ Downloads images with proper filenames based on pin title
- ✅ Works with all Pinterest domains (pinterest.com, pinterest.pt, etc.)
- ✅ Fallback to pin ID if title is not available
- ✅ Prevents duplicate downloads
- ✅ Lightweight and fast

## Installation

### Development

1. Clone this repository:
```bash
git clone https://github.com/yunzwu/pinterest-filename-fix.git
cd pinterest-filename-fix
```

2. Install web-ext globally:
```bash
npm i -g web-ext
```

3. Run the extension:
```bash
npm run dev
```

This will launch Firefox/Zen Browser with the extension loaded.

### Production Build

```bash
npm run build
```

This creates a `.zip` file in `web-ext-artifacts/` that you can install in Firefox.

## Usage

1. Navigate to any pin on Pinterest
2. Click the "Download image" button (or "Baixar imagem" in Portuguese)
3. The image will be saved to `Downloads/Pinterest/<Pin Title>.jpg` with a proper filename

## Project Structure

```
pinterest-filename-fix/
├── src/
│   ├── background.js    # Handles downloads with proper filenames
│   └── content.js       # Intercepts download button clicks
├── icons/
│   └── icon-48.svg      # Extension icon
├── assets/
│   └── yui.jpg          # README image
├── manifest.json        # Extension manifest (MV2)
├── package.json         # npm scripts
└── README.md
```

## Technical Details

- **Manifest V2** for Firefox compatibility
- Uses `browser.downloads.download()` API (Firefox doesn't support `downloads.onDeterminingFilename`)
- Content script intercepts download button clicks
- Background script handles the actual download with proper filename

## Development

```bash
npm run dev    # Run extension in development mode
npm run lint   # Lint the extension
npm run build  # Build for production
```

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
