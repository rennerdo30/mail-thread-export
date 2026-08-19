# Mail Thread Export

A Chrome (Manifest V3) extension that adds an **Export** button next to the subject line of the
Gmail conversation you are reading and renders that conversation to a **PDF** or **PNG** file —
entirely inside your own browser.

> Not affiliated with, endorsed by, or sponsored by Google. "Gmail" is a trademark of Google LLC and
> is used here only to describe the site the extension works on.

## Why

Gmail's own "Print" dialog produces a browser print view with page breaks, headers and footers you
did not ask for, and it re-renders the message in a print stylesheet that often loses the layout of
rich HTML mail. This extension takes the opposite approach: it clones the conversation DOM as it is
displayed, strips the Gmail chrome (toolbars, reply/forward buttons, stars, labels), rasterises the
result at 2x with [html2canvas](https://html2canvas.hertzen.com/), and writes it out as a single
continuous page — no page breaks, no print CSS surprises.

Everything happens locally. The extension makes **no network requests**, has no analytics, no
account, and no server component.

## Features

- **Export menu injected into Gmail** — a pill-shaped `Export` button appears next to the subject
  heading of the open conversation, with `Export as PDF` and `Export as Image` entries.
- **Single continuous PDF** — the whole thread is placed on one page sized to the rendered content,
  so nothing is cut in half by a page break.
- **High-resolution PNG** — the same render, saved as a 2x PNG with a white background.
- **UI cleanup before render** — toolbars, reply/forward/more buttons, stars, labels, alerts and
  tooltip-bearing controls are removed or hidden on the clone; grey Gmail backgrounds are flattened
  to white. English and German Gmail interface labels are both recognised.
- **Export header** — each export gets a small header with the conversation subject and the export
  timestamp, formatted with the browser locale.
- **Fixed 800 px layout width** — the clone is rendered at a stable desktop width, so the output does
  not depend on how wide your browser window happened to be.
- **Local only** — no host permissions beyond `https://mail.google.com/*`, no fetch, no storage.

## Requirements

- A Chromium-based browser with MV3 support: Chrome, Edge, Brave, Vivaldi, Opera.
- Node.js 20 or newer, only if you want to build from source.

## Install

The extension is not published to the Chrome Web Store. Load it unpacked:

```sh
git clone https://github.com/rennerdo30/mail-thread-export.git
cd mail-thread-export
npm install
npm run build          # bundles src/ into dist/
```

Then:

1. Open `chrome://extensions`.
2. Enable **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select the **`dist/`** directory of this repository — not the repository root.
5. Reload any Gmail tab that was already open, so the content script is injected.

`dist/` is gitignored, so a fresh clone must be built once before it can be loaded.

## Usage

1. Open `https://mail.google.com/` and open a conversation.
2. Click the **Export** button that appears to the right of the subject line.
3. Choose **Export as PDF** or **Export as Image**.
4. The menu entry shows a spinner while rendering; the browser then downloads
   `<subject>.pdf` or `<subject>.png`.

Large threads take a few seconds — rasterising a long conversation at 2x is CPU-bound and the render
happens on the page's main thread.

## Configuration

There is no settings UI, and there are no environment variables or stored options. Behaviour is fixed
in source; these are the values worth knowing about if you want to change them, all in
`src/content/exporter.js`:

| Behaviour | Value | Where |
| --- | --- | --- |
| Render width | `800` px | `wrapper.style` plus the `html2canvas` `width` / `windowWidth` options |
| Render scale | `2` | `html2canvas` `scale` option |
| Content padding | `40` px | `paddedContent.style` |
| Settle delay before capture | `500` ms | `await new Promise(r => setTimeout(r, 500))` |
| PDF image codec / quality | JPEG, `0.95` | `canvas.toDataURL('image/jpeg', 0.95)` |
| PDF page size | canvas size ÷ 2, in `px` units | `new jsPDF({ unit: 'px', format: [...] })` |
| Subject length in the header | first `100` characters | `filenameBase.substring(0, 100)` |
| Font stack used for the export | Hiragino Kaku Gothic Pro → Meiryo → Yu Gothic → MS Gothic → Noto Sans JP → sans-serif | `forceJapaneseFont()` |
| Gmail elements stripped | selector list | `cleanArtifacts()` |

The Gmail selectors in `cleanArtifacts()` are the part most likely to need maintenance: Gmail's
obfuscated class names (`.hI`, `.gE`, `.T-I`, …) change without notice.

## Fonts

The export deliberately forces a CJK-capable font stack so Japanese mail does not render as tofu
boxes. **No font files ship with this repository** — the stack resolves against fonts already
installed on the machine (Hiragino on macOS, Meiryo / Yu Gothic / MS Gothic on Windows).

If you need a guaranteed, identical result across machines, obtain
[Noto Sans JP](https://fonts.google.com/noto/specimen/Noto+Sans+JP) yourself. It is licensed under
the [SIL Open Font License 1.1](https://openfontlicense.org/), which permits redistribution but
requires the licence text to travel with the font files — which is exactly why they are not vendored
here. Place the files in `src/assets/fonts/` (gitignored) and the build copies them into
`dist/assets/fonts/`; `webpack.config.cjs` also has a rule that inlines any *imported* `.ttf`/`.otf`
as a base64 data URI. See the
[Fonts guide](https://rennerdo30.github.io/mail-thread-export/guides/fonts/) for details.

## Tech stack

| Piece | Used for |
| --- | --- |
| Chrome Extensions **Manifest V3** | content script on `mail.google.com`, action popup, service worker entry |
| **webpack 5** + `copy-webpack-plugin` | bundles `src/content/scanner.js` into a single `dist/content.js`; copies the manifest, CSS, icons, popup and background files |
| **html2canvas 1.4** | rasterises the cleaned DOM clone |
| **jsPDF 4** | wraps the raster in a single-page PDF |
| **MutationObserver** | detects when Gmail swaps in a conversation view and re-injects the Export button |
| **Astro + Starlight** (`docs/`) | documentation site, deployed to GitHub Pages |

`LimitChunkCountPlugin` keeps the output to one chunk, because MV3 content scripts cannot load
additional chunks at runtime.

## Project layout

```
src/
  manifest.json           MV3 manifest
  content/scanner.js      webpack entry: injects the Export button, observes Gmail's DOM
  content/exporter.js     DOM clone, cleanup, html2canvas render, PDF/PNG output
  content/style.css       styles for the injected button and dropdown
  popup/                  toolbar popup (see "Known limitations")
  background/             service worker entry (currently empty)
  assets/                 extension icons
  lib/                    vendored standalone html2canvas / jsPDF builds, not used by the build
dist/                     build output, gitignored
docs/                     Astro Starlight documentation site
```

## Known limitations

- **The toolbar popup does not work.** `src/popup/script.js` sends `PING` and `EXPORT` messages via
  `chrome.tabs.sendMessage`, but no `chrome.runtime.onMessage` listener exists in the content script,
  so the popup always ends up in its "Please refresh Gmail tab" state. The injected Export button
  next to the subject line is the working entry point. The popup's JPG card is likewise not wired up,
  even though `exporter.js` can emit JPEG.
- **`src/background/service-worker.js` is empty.** It is declared in the manifest and copied to
  `dist/` so the manifest stays valid, but it does nothing.
- **Raster, not text.** The PDF contains an image, so the text in it is not selectable or searchable.
  This was a deliberate trade for visual fidelity against Gmail's DOM.
- **Remote images** must be CORS-readable to appear in the capture. `useCORS` is enabled, but images
  served without permissive CORS headers will be missing.
- **Gmail-specific.** The selectors target Gmail's web UI only; other webmail is not supported.
- **`downloads`, `scripting` and `activeTab` permissions are declared but unused** — the export path
  uses an anchor click and `jsPDF.save()`. They can be dropped from the manifest.

## Documentation

The full documentation site lives in `docs/` and is built with Astro Starlight:

```sh
npm run install:docs
npm run docs:dev        # local preview
npm run docs:build      # static build into docs/dist
```

`.github/workflows/deploy.yml` builds and publishes it to GitHub Pages on every push to `main`.

## Licence

[MIT](LICENSE) © rennerdo30

Bundled third-party code keeps its own licences: html2canvas (MIT), jsPDF (MIT). Noto Sans JP, if you
add it yourself, is under the SIL Open Font License 1.1.
