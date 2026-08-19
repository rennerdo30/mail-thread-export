# Specification: Mail Thread Export

Design intent and current state. For task-oriented documentation see the
[documentation site](https://rennerdo30.github.io/mail-thread-export/) or `docs/`.

## 1. Overview

A Chrome Manifest V3 extension that integrates into the Gmail web interface and exports the open
conversation as a high-fidelity PDF or PNG. All processing is client-side; the extension makes no
network requests.

## 2. User experience

- **Integration point**: an `Export` pill button injected next to the conversation subject heading
  (`h2.hP`), styled to match Gmail's own buttons.
- **Interaction**: clicking the button opens a floating dropdown with two entries — *Export as PDF*
  and *Export as Image*.
- **Feedback**: the chosen entry is replaced by a spinner and *Processing…* while the render runs. The
  work is deferred by 50 ms so the spinner paints before the main thread is occupied.
- **Re-injection**: a `MutationObserver` on `document.body` re-adds the button whenever Gmail's SPA
  swaps in another conversation.

## 3. Export behaviour

**PDF**
- Single continuous page, sized to the rendered canvas — no page breaks.
- Content sanitised: Gmail toolbars, action buttons, stars, labels and alerts removed or hidden.
- Header with the conversation subject (first 100 characters) and the export timestamp.
- Fixed 800 px desktop layout width with 40 px padding.
- A JPEG raster at quality 0.95, embedded via jsPDF. Text in the PDF is not selectable.

**Image**
- The same render, emitted as a PNG at `scale: 2`.
- White background where the source DOM is transparent.
- `generateImage()` also accepts `'jpg'`, but no interface path currently requests it.

## 4. Technical implementation

- **Detection**: `div[role="main"]` as the export root — an ARIA landmark, chosen for stability —
  with `h2.hP` for the subject.
- **Isolation**: the conversation is deep-cloned; the live Gmail DOM is never mutated beyond the
  injected button and a temporary off-screen wrapper.
- **Rendering**: `html2canvas` at `scale: 2`, `useCORS: true`, `foreignObjectRendering: false`. A
  500 ms settle delay precedes measurement and capture.
- **Rationale for raster output**: vector approaches proved unstable against Gmail's deeply nested,
  heavily styled DOM. Visual fidelity was prioritised over text selectability.
- **Fonts**: a CJK-capable stack is forced onto the clone so Japanese mail does not render as tofu
  boxes. No font files are bundled — see `docs/src/content/docs/guides/fonts.mdx`.
- **Bundling**: webpack 5 produces a single `dist/content.js`; MV3 content scripts cannot load
  additional chunks at runtime.

## 5. Visual design

- **Trigger**: 36 px pill, 18 px radius, white with a `#dadce0` border, blue `#e8f0fe` / `#1967d2`
  active state, download glyph plus the label "Export".
- **Menu**: white card, 8 px radius, soft shadow, 220 px minimum width, opacity and translate
  transition on open.
- **Spinner**: 16 px, 2 px ring, `#1a73e8` on `#f3f3f3`, 1 s linear rotation.

## 6. Not implemented

- The toolbar popup (`src/popup/`) messages a `chrome.runtime.onMessage` listener that does not
  exist, so it is non-functional. The injected button is the only working entry point.
- `src/background/service-worker.js` is declared in the manifest but empty.
- The `activeTab`, `scripting` and `downloads` permissions are declared but unused.
- `src/lib/` holds older standalone html2canvas and jsPDF builds that nothing imports.
