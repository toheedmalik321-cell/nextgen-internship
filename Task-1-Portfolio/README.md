# Week 01–02 — Personal Portfolio Page

**Deliverable 1 of the Next Gen Internship submission.** A single-page portfolio for the
internship capstone review. Vanilla HTML, CSS and JavaScript — no framework, no build step,
no server required.

Built from the shared design system in `../docs/DESIGN_SYSTEM.md` ("Studio Terminal":
ink canvas, 64px hairline grid, film grain, Archivo display type, JetBrains Mono metadata,
one rationed lime accent).

---

## Run it

Open `index.html` in a browser. That is the whole procedure.

```
week-01-02-portfolio/
├── index.html      semantic markup, no inline styles or scripts
├── css/style.css   tokens → base → layout → components → sections
├── js/main.js      one classic script, eight sectioned IIFE functions
├── assets/         avatar, favicon and four hand-authored SVG covers
└── README.md
```

Double-clicking the file works: the page uses no `fetch`, no ES modules and no JSON files,
so nothing is blocked by the `file://` origin. A local server (`npx serve .`) also works if
you prefer one, but it is not needed.

The only network request is the Google Fonts stylesheet for **Archivo** and
**JetBrains Mono**. Offline, both fall back to a full local stack
(`"Helvetica Neue", Helvetica, Arial, sans-serif` and
`ui-monospace, "SF Mono", Menlo, Consolas, monospace`); nothing is lost but the letter
widths, so the display type will set slightly differently.

---

## What is on the page

| Section | Anchor | Notes |
| --- | --- | --- |
| Header / nav | `#top` | Sticky, `backdrop-filter: blur(10px)`, full-screen mobile overlay menu |
| Hero | — | `00 / WELCOME`, outline-word headline, live PKT clock, stat strip |
| About | `#about` | `01 / ABOUT`, 7/5 Flexbox split, definition list, portrait mark |
| Skills | `#skills` | `02 / SKILLS`, four Grid panels, 16 bars that fill on scroll |
| Projects | `#projects` | `03 / PROJECTS`, four cards, two-column Grid |
| Timeline | `#work` | `04 / TIMELINE`, eight markers on a hairline rail |
| Contact | `#contact` | `05 / CONTACT`, details + validated form |
| Footer | — | Wordmark, year, back-to-top |

**Hero.** Three headline lines. The word under your cursor is stroked in acid and filled
transparent; move away and the stroke returns to "Interfaces". If JavaScript is off, the
stroke stays on "Interfaces" so the effect never disappears. The clock is real
`Intl.DateTimeFormat` output in `Asia/Karachi`, repainted every second.

**View CV** opens `assets/cvv.html` in a new tab. It is a standalone HTML document with its
own styles — no build step, no server request, and nothing loaded by `js/main.js`.

**Skills.** Each bar's target width lives in the stylesheet
(`.skill__bar[data-level="90"] { --level: 90%; }`) so the finished bars render correctly with
JavaScript disabled. When JS *is* available it adds `.js` to the root, which is what zeroes
the bars and lets an `IntersectionObserver` animate them to their level with a 90ms stagger.

**Timeline.** The eight rail markers use the same `is-visible` class as the scroll reveals,
so a marker lights up (acid fill plus glow) exactly when its week card arrives.

**Mobile menu.** A real overlay: `aria-expanded` on the toggle, `aria-controls` pointing at
the nav, focus moved to the first link on open, a Tab/`Shift+Tab` trap across the header's
focusable set, `Escape` to close, focus returned to the toggle, and `body.is-nav-locked` to
stop the page scrolling behind it. It closes itself if the viewport grows to desktop width.

---

## Layout systems on show

- **Flexbox** — nav bar, mobile overlay, hero header/body/actions, stat strip, the About 7/5
  split, the Contact split, the footer.
- **CSS Grid** — the four skill panels, the two-column project grid, the timeline rail and
  its two-column week rows, the caption/stack rows at 640px.
- **Mobile-first** — base styles are the 360px layout; `min-width` breakpoints at **640px**,
  **900px** and **1200px** are the only places the layout changes. At 1200px the first
  project card becomes a full-width featured entry so the grid is not a template.

## JavaScript on show

- `IntersectionObserver` for scroll reveals, the skill bars, the timeline rail and the active
  nav link.
- Event delegation for the form (`input` + `focusout` on the `<form>`), the mobile menu and
  the back-to-top control.
- `async` / `await` with `await new Promise(...)` for the simulated send.
- `Intl.DateTimeFormat`, `Blob` + `URL.createObjectURL`, template literals, `Set`,
  closures as a private cache, `const`/`let` only, no `var`.
- A closure-backed focusable cache (`focusables()`) so the trap does not re-query the DOM on
  every Tab press.

---

## Accessibility

- Semantic landmarks: `header`, `nav`, `main`, `section`, `footer`, `address`, `figure`.
- Exactly one `h1`; `h2` per section; `h3` for every card, panel and week. No skipped levels.
- Skip link as the first focusable element, visible on focus.
- `:focus-visible` is a global `2px solid var(--acid)` outline with `2px` offset — visible on
  every link, button, input and the footer control, and never clipped by `overflow: hidden`.
- All seven images have descriptive `alt` text; decorative geometry lives inside the SVGs.
- Form: `<label for>` on every control, `aria-describedby` per field, `aria-invalid` toggled
  by the validator, `role="alert"` error paragraphs, `aria-live="polite"` status line, and a
  disabled `SENDING…` button during the simulated request.
- Colour is never the only signal: invalid fields get clay borders *and* text; valid fields
  turn cyan *and* the status line reports success.
- `prefers-reduced-motion` is honoured in three places: reveals and the hamburger morph are
  wrapped in `@media (prefers-reduced-motion: no-preference)`, the scroll behaviours read the
  media query in JS, and a `reduce` block flattens every transition.

---

## Known limitations — read this honestly

1. **The contact form does not send anything.** There is no backend, no mail service and no
   third-party form endpoint. Validation, the disabled button state, the `SENDING…` label and
   the cyan success line are all real client-side behaviour, but the message is dropped when
   the page unloads. The status line says so, and so does this README.
2. **The project cards link to sibling task folders.** From here they resolve
   to `../Task-2-Taskbook/`, `../Task-3-Plates/`, `../Task-4-Quiz/` and
   `../Task-5-TaskFlow/`, so the task folders have to stay side by side.
3. **The CV is a standalone HTML document** (`assets/cvv.html`), not a PDF. It opens in a
   new tab; use the browser's print dialog to save a PDF if a file upload is required.
4. **Percentages in the Skills section are self-assessed**, and the README, the page footnote
   and the bars all say so. They are not test scores.
5. **The cover illustrations are abstract SVG compositions**, not screenshots of the finished
   projects. They were drawn as vector art so the page stays sharp at any density and adds
   zero network weight.
6. **The clock assumes the device clock is roughly right.** It formats whatever
   `Asia/Karachi` reports; there is no NTP sync and no fallback if the tab is throttled.
7. **There is no automated visual check.** The CSS was written mobile-first against the
   360 / 768 / 1440 targets and the breakpoints sit at 640/900/1200 per the design system,
   but nothing in this submission renders the page automatically, so the compositions have
   not been re-checked on real hardware after the last edit.

## What I learned

- **Flexbox and Grid are not interchangeable.** Reach for Flexbox when the content decides
  the size and Grid when the layout decides it. Mixing them up is what makes "responsive"
  CSS turn into a stack of `!important`.
- **The mobile layout is the design.** Writing the 360px version first removed every desktop
  override I would otherwise have written, and it is why nothing overflows sideways here.
- **`backdrop-filter` creates a containing block.** A `position: fixed` full-screen menu
  nested inside the blurred sticky header was being sized to the header. The fix was to drop
  the blur while the menu is open — a bug I would not have found without reading the spec.
- **`IntersectionObserver` earns its keep on four separate jobs** here, but it must degrade:
  every observer in `main.js` has a no-observer branch that reveals the content immediately.
- **A percentage needs somewhere to live.** Inline `style="--level: 90%"` would have been two
  characters, but the design system forbids inline styles — so the levels moved into the
  stylesheet, which also means the bars are correct before JavaScript runs.
- **Colour ratios are not the whole of accessibility.** `--paper-faint` measures about 3.3:1
  on the ink canvas, so it appears only in input placeholders — always beside a visible
  label. Anything a person has to read uses `--paper` or `--paper-dim`, and every state is
  paired with a word.