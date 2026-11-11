# Plates — Generative SVG Gallery (Week 03–04)

**Track:** Web Development Internship — Next Gen Software Hub Pvt. Ltd.
**Weeks:** 03–04 · **Covers:** CSS animations &amp; transitions, advanced JavaScript
**Runs from:** `file://` — double-click `index.html`, no server, no build step.

---

## What this is

A filterable, sortable gallery of **sixteen abstract SVG studies** that were authored
by hand for this internship. There are no photographs, no stock imagery, and no
external image service anywhere in the project — every plate is a local `.svg` file
generated from a small set of rules and one fixed eight-colour palette, which is why
they read as a series rather than a random collection.

The same page doubles as the week's technique demonstration:

| Requirement | Where to look |
| --- | --- |
| CSS animations & transitions | `css/style.css` — `@keyframes sheen`, `shimmer`, `tileIn`, `modalIn`; hover reveals on badge and caption |
| Advanced JavaScript | `js/app.js` — event delegation, closures, promises, `async` metadata load with fallback |
| FLIP animation | `js/app.js` §5 `render()` — the four phases are commented `FIRST` / `LAST` / `INVERT` / `PLAY` |
| Clean architecture | one `state` object, one `render()`, one source of truth; no duplicated DOM writes |

---

## The plates

| # | Plate | Category |
| --- | --- | --- |
| 01 | Contour Field | Geometric |
| 02 | Strata | Topographic |
| 03 | Topography | Topographic |
| 04 | Moire | Geometric |
| 05 | Circuit | Technical |
| 06 | Radial Burst | Geometric |
| 07 | Brutalist Blocks | Geometric |
| 08 | Orbit | Geometric |
| 09 | Blueprint | Technical |
| 10 | Lattice | Geometric |
| 11 | Spiral Dash | Generative |
| 12 | Waveform | Generative |
| 13 | Halftone | Generative |
| 14 | Prism | Technical |
| 15 | Vortex | Generative |
| 16 | Dot Matrix Face | Figurative |

Five categories: **Geometric**, **Topographic**, **Technical**, **Generative**, **Figurative**.

---

## Features

- **Filter** by category with live per-chip result counts. A chip whose count drops to
  zero disables itself instead of showing an empty grid.
- **Search** across title, description and tags, debounced at 180 ms.
- **Sort** by Featured (curated order), Title A–Z, or Newest.
- **Three densities** — Grid, Comfort and Mosaic. The chosen density persists to
  `localStorage` under `ngsh.plates.view.v1`.
- **Lightbox** with arrow-key paging, `Home`/`End`, a jumpable filmstrip, and touch
  swipe on the image.
- **Deep links** — opening a plate writes `#/plate/<slug>` to the URL, so any plate is
  linkable and survives a reload. `hashchange` is handled in both directions.
- **Neighbour preloading** via `Promise.all` so paging feels instant.
- **Empty state** with a one-click reset.

---

## Keyboard map

| Key | Action |
| --- | --- |
| `/` | Focus the search field |
| `?` | Open the shortcuts panel |
| `1` – `6` | Jump straight to a category (1 = All) |
| `Enter` / `Space` | Open the focused plate |
| `←` / `→` | Previous / next plate in the lightbox |
| `Home` / `End` | First / last plate |
| `Esc` | Close the lightbox or the shortcuts panel |
| `Tab` | Cycles inside the open dialog only (focus trap) |

Focus is returned to the tile that opened the dialog on close.

---

## Files

```
week-03-04-gallery/
├── index.html
├── README.md
├── css/
│   └── style.css
├── js/
│   └── app.js
└── assets/
    ├── favicon.svg
    └── works/
        ├── index.json      ← metadata (title, category, tags, description)
        └── *.svg           ← 16 plates
```

### `assets/works/index.json`

Metadata for all sixteen plates. The app attempts to `fetch()` this file at boot and
falls back to the inline `PLATES` array in `js/app.js` if the request fails — which is
what happens when the page is opened straight from `file://`, because browsers block
`fetch()` on opaque file origins. **Both paths are first-class**; a boot toast reports
which source was used. The loader validates the payload with `normalise()`, so an
unexpected key or shape can never break rendering.

---

## Design system

Follows `../docs/DESIGN_SYSTEM.md` — "Studio Terminal":

- Dark-first. Tokens: `--ink #0A0B0C`, `--ink-2`, `--ink-3`, `--line`, `--paper`,
  `--paper-dim`, `--paper-faint`, `--acid #C9F24B`, `--clay #FF6B4A`, `--cyan #4FD6C2`,
  `--gold #FFC857`.
- **Archivo** for display, **JetBrains Mono** for labels and readouts.
- Zero border-radius. Hairline borders. No gradients, no glassmorphism, no shadows.
- Layout switches at **760px** and **1200px** only.

---

## Accessibility

- Semantic landmarks: `header` / `main` / `footer`, skip link, one `h1`, section headings.
- Full keyboard operation, including the dialog focus trap and focus restoration.
- Dialog uses `role="dialog"` + `aria-modal` + `aria-labelledby`.
- Result counts announced through `aria-live="polite"` regions.
- Every decorative element carries `aria-hidden="true"`.
- `prefers-reduced-motion: reduce` disables the FLIP transition, the sheen sweep, the
  modal animation and smooth scrolling.

---

## Code quality

- No `console.log` left in the shipped code.
- No inline `style=` attributes and no inline `on*=` handlers in the HTML.
- No user input is ever written through `innerHTML` — every dynamic node is built with
  `createElement` / `textContent`.
- One delegated listener on the grid regardless of how many tiles exist; no
  per-card listener leaks.
- The app is wrapped in an IIFE with `'use strict'`; nothing leaks to `globalThis`.

---

## Known limitations

- `fetch()` of `index.json` is blocked under `file://`, so the inline fallback array is
  what most reviewers will actually see. Both produce identical output.
- Touch swipe is intentionally ignored for mouse pointers, so it cannot fight with
  click-to-open.
- The mosaic density promotes the first tile to a double-width panel; the ordering is
  by the active sort, so changing the sort changes which plate is promoted.

---

*Next Gen Software Hub Pvt. Ltd. — Mussalhapur, Patna 800006*
