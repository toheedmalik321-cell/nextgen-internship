# Next Gen Internship — Shared Design System

All five deliverables in this submission are built from ONE visual language so the
submission reads as a single body of work by one intern. Deviate only where a brief
explicitly says to.

---

## 1. Concept — "Studio Terminal"

A dark, ink-black workspace where the work is the only light source. Swiss/editorial
typography, hairline rules, monospace metadata, and one hot accent that behaves like a
cursor highlight. Dense information, generous negative space. Nothing decorative that
isn't also load-bearing.

**Anti-goals:** no generic bootstrap-looking cards, no purple-blue SaaS gradients, no
drop-shadowed glassmorphism, no centered-everything hero with a stock 3D blob.

---

## 2. Colour

```
--ink            #0A0B0C   canvas (near-black, faintly blue-green)
--ink-2          #101214   raised surface
--ink-3          #171A1D   card / border surface
--line           #24282D   hairline rules, borders
--paper          #F2EFE8   primary text (warm off-white, never pure #fff)
--paper-dim      #9AA1A9   secondary text
--paper-faint    #5C636B   tertiary / disabled
--acid           #C9F24B   PRIMARY ACCENT — lime, headlines, active states
--acid-dim       #8FB52F   accent at rest / borders
--clay           #FF6B4A   destructive, errors, wrong answers
--cyan           #4FD6C2   secondary data, success, "in progress"
--gold            #FFC857   warnings, streaks, high scores
```

Rules:
- Accent is **rationed**. One acid element per viewport region maximum.
- Never place `--acid` text on `--paper` (fails contrast). Acid is for dark surfaces only.
- Semantic use is fixed: clay = destructive/error, cyan = success/in-progress, gold = caution/score.
- Gradients are permitted only as low-opacity accents on dark surfaces (max 2 stops,
  both from the list above). Never a rainbow, never a light-mode gradient.

---

## 3. Typography

Load via Google Fonts with a **hard local fallback stack** so the design never breaks offline.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

```css
--font-display: "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
--font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace;
```

- **Display (Archivo):** 800–900 weight, `letter-spacing: -0.04em`, `line-height: 0.88`,
  used for headlines and big numbers. Optical sizing via `font-stretch` not required.
- **Mono (JetBrains Mono):** ALL metadata, labels, counters, eyebrows, buttons,
  status chips, form labels, table headers. Uppercase, `letter-spacing: 0.14em`,
  `font-size: 0.7–0.78rem`.
- **Body:** Archivo 400/500, `line-height: 1.6`, `max-width: 65ch`.
- Headline scale (fluid, `clamp()`):
  h1 `clamp(2.75rem, 9vw, 7.5rem)` · h2 `clamp(2rem, 5vw, 3.75rem)` ·
  h3 `clamp(1.25rem, 2.4vw, 1.75rem)`
- Eyebrow pattern (use everywhere, it is the signature):
  `<p class="eyebrow"><span>02</span> / Section Name</p>` with the numeric span in acid.

---

## 4. Structure & Layout

- Container: `max-width: 1280px`, gutter `clamp(1.25rem, 4vw, 4rem)`.
- **Every section starts with a full-bleed hairline** `border-top: 1px solid var(--line)`
  and an eyebrow. Section rhythm: `padding-block: clamp(4.5rem, 10vw, 9rem)`.
- 12-column grid where useful; prefer asymmetry (7/5, 8/4 splits) over 6/6.
- Corner radius: **0 by default.** Only pills/chips get `999px`. No rounded cards.
- Elevation: **no box-shadows.** Depth comes from surface colour steps + hairlines.
- Backgrounds: solid `--ink`, or `--ink-2` for inverted/inset bands, plus an optional
  fine grid texture:
  ```css
  background-image:
    linear-gradient(var(--line) 1px, transparent 1px),
    linear-gradient(90deg, var(--line) 1px, transparent 1px);
  background-size: 64px 64px;
  opacity: .35;               /* put on a ::before layer, never on content */
  ```
- Optional grain overlay (SVG feTurbulence data-URI, `opacity: .05`, `pointer-events:none`).

---

## 5. Components

**Buttons**
- Primary: acid fill, ink text, mono uppercase, `padding: .85rem 1.6rem`, radius 0.
  Hover: ink fill + acid text + acid 1px border (invert, no movement).
- Ghost: transparent, 1px `--line` border, paper text. Hover: border acid, text acid.
- Danger: clay border/text; solid clay fill on confirm only.
- All buttons: `transition: color .2s, background-color .2s, border-color .2s`.
  `:focus-visible` = 2px acid outline, 2px offset, always present.

**Cards / panels** — `--ink-3` surface, 1px `--line` border, radius 0, `padding: 1.5rem`.

**Chips / tags** — mono, 11–12px, uppercase, 1px border, radius 999px.
Variants: default (line/paper-dim), active (acid border + acid text + acid/10 bg).

**Form fields**
- Label: mono uppercase `--paper-dim`.
- Input/textarea/select: `--ink-2` bg, 1px `--line` border, radius 0, paper text, `padding: .8rem 1rem`.
- Focus: border acid + 1px inset accent glow (`box-shadow: 0 0 0 1px var(--acid)`).
- Invalid: border clay + clay message below in mono 12px + `aria-invalid="true"`.
- Valid (after interaction): border cyan.
- Never rely on colour alone — pair with text/icon.

**Tables / lists** — hairline row separators, mono header row, no zebra striping.

**Empty states** — centred mono message + one ghost button. Never a blank screen.

**Toasts** — bottom-left, `--ink-3`, 1px acid left-border, mono text, auto-dismiss 3.2s,
respect `prefers-reduced-motion`.

---

## 6. Motion

- Only two easings: `cubic-bezier(.2,.8,.2,1)` (standard) and
  `cubic-bezier(.34,1.56,.64,1)` (spring, for pop-in only).
- Durations: 160ms micro, 260ms standard, 420ms entrances.
- Hover = colour/border change. Transform only for: card lift `-4px` on hover (with a
  border-colour change so it doesn't float), and modal/lightbox scale `.96 → 1`.
- Entrance: `IntersectionObserver` adds `.is-visible` → `opacity 0→1`, `translateY(18px)→0`.
  **Always wrap in `@media (prefers-reduced-motion: no-preference)`.**
- Keyframes needed: `fadeUp`, `pop`, `spin`, `shake` (error), `pulse` (recording/timer).
- Skeleton shimmer for loading states (`background-position` sweep).

---

## 7. Accessibility (non-negotiable)

- Semantic landmarks: `header`, `nav`, `main`, `section`, `footer`.
- Exactly one `h1`; heading levels never skip.
- Visible `:focus-visible` on every interactive element.
- Modals/lightbox: `role="dialog"`, `aria-modal="true"`, focus trap, focus restored on
  close, `Escape` closes, background scroll locked.
- Icon-only buttons: `aria-label`.
- Filter/tab controls: `role="tablist"`/`aria-pressed` with correct state.
- Live regions: `aria-live="polite"` for toasts/status, `role="alert"` for form errors.
- Contrast ≥ 4.5:1 for body text, ≥ 3:1 for large text and UI borders.
- Full keyboard operability; visible focus never clipped by `overflow:hidden`.

---

## 8. Responsive

- **Mobile-first.** Base styles = 360px. Then `min-width: 640px`, `900px`, `1200px`.
- Breakpoints are where the layout *must* change, not where it may.
- Test at 360 / 768 / 1440. No horizontal scroll at 360.
- Touch targets ≥ 44×44px on mobile.
- `clamp()` for all fluid type and spacing.
- When a grid collapses, reorder intentionally — most important content first.

---

## 9. JavaScript Standards

- `const` by default, `let` when reassigned. No `var`.
- ES6+: arrow functions, template literals, destructuring, default params,
  `spread`/`rest`, `async`/`await`, `Promise`, optional chaining, `??`.
- `const` state object; `render()` pattern — mutate state, then re-render. One source of truth.
- **Event delegation** on containers instead of per-item listeners (syllabus requirement).
- **Closures** used deliberately for private counters/caches.
- Persistence via `localStorage` with try/catch (private-mode safe) and a versioned key,
  e.g. `ngsh.taskflow.v1`.
- Images: no external services. Generate art as **inline SVG data-URIs or CSS
  gradients**. Raster only if a real generated asset sits in `assets/`.
- No `console.log` left in shipped code. No dead code. No commented-out blocks.
- Every project folder is self-contained: `index.html` + `css/` + `js/` + `assets/`.

---

## 10. File Layout per Project

```
week-XX-YY-slug/
├── index.html          semantic, no inline styles/scripts
├── css/style.css       custom properties first, then base, layout, components
├── js/app.js           one module, IIFE or ES module, sectioned with banner comments
├── assets/             generated images / favicon / og image
└── README.md           what it is, how to run, what was learned, known limitations
```