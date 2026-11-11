# Quiz Arena — Web Development Fundamentals

Quiz Arena is a fully offline, vanilla HTML/CSS/JS quiz application built to the "Studio Terminal" design system. It delivers a timed, graded assessment covering HTML semantics, CSS layout (Flexbox vs Grid), responsive design, JavaScript (DOM/events/ES6), accessibility, Git/GitHub, and browser DevTools.

## What it is

- **Quiz subject:** Web Development Fundamentals (20 questions across four difficulty tiers: easy / medium / hard / expert)
- **Run modes:** configurable by name/handle, difficulty multi-select, topic multi-select, question count (5/10/15/all)
- **Per-question timing:** 30 seconds per question, countdown displayed in MM:SS with a depleting timer bar. Under 10s both turn clay and pulse; expiry auto-flags the question as unanswered and advances.
- **Feedback model:** after confirming an answer, immediate feedback shows the chosen vs correct answer plus a 2–4 sentence explanation (learning-first).
- **Results & reporting:** score count-up, percentage ring, grade band (A≥90/B≥75/C≥60/D≥40/E<40), stat strip, topic breakdown bars, full per-question review list, plus JSON report export and print stylesheet.
- **Persistence:** high scores leaderboard stored in `localStorage` under `ngsh.quiz.scores.v1` (top 10, newest first). Import/export supported.
- **Offline-first:** question bank embedded in `js/questions.js` as a plain script. Optional `assets/questions.json` fetch is attempted with graceful fallback and network-style error handling.

## How to run

The app must run opened directly from `file://` (plain `<script src>` with no ES module imports).

1. Navigate to `week-05-06-quiz/`
2. Open `index.html` in a modern browser (Chrome/Firefox/Edge/Safari)
3. Complete setup (handle, tiers, topics, question count), click **Start quiz**
4. Answer questions: A–D or arrow keys to move, **Enter** to confirm; **F** to flag, **P** to pause. Each question shows 30s countdown.
5. After last question, review results, export/print report, or jump to leaderboard.

No build step, no CDN except Google Fonts (loaded with preconnect). All assets are local.

## Question bank

- **Location:** `js/questions.js` — exposed as `window.QUESTION_BANK` (array of 20 entries)
- **Shape per question:**
  - `id` (stable, e.g. `q01`)
  - `difficulty`: `easy|medium|hard|expert` (distribution ~7/7/4/2 in this bank)
  - `topic`: `html|css|js|responsive|a11y|git|devtools`
  - `prompt` (question text)
  - `options` (exactly 4 strings)
  - `answer` (0–3 index into options, correct)
  - `explanation` (2–4 sentences shown after answering)

**How to extend it:**
- Append a new object with the same shape and a new `id`. Keep exactly 4 options and `answer` inside 0–3.
- The UI derives difficulty counts, topic legend, topic breakdown and review list automatically from the bank; no other changes required.
- `window.QUESTION_TIERS`, `window.DIFFICULTY_META`, and `window.QUESTION_TOPICS` are also exposed for metadata.
- Optional: when served over HTTP(S), provide `assets/questions.json` with the same structure; `js/app.js` will attempt to fetch it (with short timeout) and fall back to the embedded bank if unavailable/malformed. Under `file://` the embedded bank is used directly.

## Keyboard map

| Key(s) | Action (quiz screen) |
| --- | --- |
| `A`–`D` | Select option A–D |
| `←` / `→` / `↑` / `↓` | Move selection between options |
| `Home` / `End` | Jump to first/last option |
| `Space` | Select current option |
| `Enter` | Confirm selected answer |
| `F` | Toggle flag for review |
| `P` | Pause/resume timer (opens paused dialog) |
| `Esc` | Close pause dialog (resumes) |
| `Tab` | Focus moves (focus trap in pause dialog) |

Navigation dots are clickable; options use `role="radiogroup"` with delegated keyboard handling.

## Validation rules

**Setup form (`#setup-form`, novalidate):**
- Handle: 2–24 chars, pattern `/^[A-Za-z0-9 _.\-]+$/` (letters/numbers/spaces and `- _ .`). `aria-invalid` set on input; inline `#handle-error` (`role="alert"`, hidden) shown on invalid/blur.
- Difficulty tiers: at least one must be checked. Error shown via `#difficulty-error`.
- Topics: at least one must be checked. Error shown via `#topic-error`.
- Question count: 5/10/15/all (dropdown). Preview updates live: `X QUESTIONS · Y MINUTES · TIERS`.

Config validation prevents starting with no matching pool (start button disabled). The pool note warns on shortfall or zero matches.

## Error-handling strategy

- **Storage:** `localStorage` access wrapped in try/catch; corruption of `ngsh.quiz.scores.v1` or prefs triggers reset with a single warning toast; private mode surfaces "storage blocks persistence" toast once.
- **Bank loading:** over HTTP(S), `fetch('assets/questions.json')` runs with a 1200ms timeout and `AbortController`; any failure (non-OK, malformed/empty, network) falls back to embedded `js/questions.js` and logs a single toast ("REMOTE BANK UNAVAILABLE — USING THE EMBEDDED BANK"). Under `file://` the embedded bank is used directly, with no failed request and no toast.
- **Question normalization:** `normaliseBank()` validates every entry (non-empty prompt, exactly 4 non-empty options, `answer` in 0–3, known difficulty/topic); malformed entries are dropped. Empty normalized bank surfaces a fault screen.
- **Runtime safety:** global `error` and `unhandledrejection` handlers emit a single mono toast (truncated) instead of crashing silently.
- **Form/flow errors:** invalid setup produces inline `role="alert"` messages and a wrong-sound cue. Timer expiry is handled deterministically (marks unanswered, flags, advances). Auto-advance is cancellable.
- **Empty/edge states:** empty leaderboard state shown with "Back to setup"; fault screen offers Retry/Back to setup. No blank screens.

## Accessibility notes

- Semantic landmarks: `header`, `main`, `section`, `footer`. Skip link `#main` (appears on focus).
- Exactly one `h1` (setup). Heading levels respected in results/review.
- Visible `:focus-visible` on all interactive elements.
- Question uses `role="radiogroup"` with `aria-labelledby="question-text"`; each option is a `<button role="radio">` with `aria-checked`. Keyboard navigation follows radiogroup conventions (arrow/Home/End/Space/Enter/A–D).
- Live region `#live-region` (`aria-live="polite"`, `aria-atomic="true"`) announces question advance, pause/resume, completion, and flag changes.
- Validation errors use `role="alert"` and inputs set `aria-invalid`. Pause dialog is `role="dialog"` with `aria-modal="true"`, `aria-labelledby`, `aria-describedby`, focus trap, Escape to close, background scroll locked while open (`body.is-locked`).
- Icon-only buttons have `aria-label`/`aria-pressed`. Navigator dots have descriptive `aria-label` per state (answered/correct/incorrect/unanswered/flagged/current).
- Timer bar is a `role="progressbar"` with `aria-valuemin="0"`, `aria-valuemax="30"`, `aria-valuenow`, `aria-valuetext`. Live region supplements for critical state changes.
- Colour not sole indicator (borders, labels, icons, text). Contrast-minded palette per design system; paper/ink themes available.
- Reduced motion respected: reveal-on-scroll, score ring count-up, shake/unfold/pop animations skipped when `prefers-reduced-motion: reduce`.

## Responsive notes

- Mobile-first base (360px). Breakpoints at `min-width: 640px`, `900px`, `1200px`.
- Quiz layout: stacked on mobile; 2-column (240px rail + main) from 900px. Rail sticky at 96px.
- Navigator grid: 6-wide (mobile), 8-wide (≥640px), 4-wide (≥900px), 5-wide (≥1200px). Collapses as specified.
- Options: full-width rows, min-height ≥ 44px (touch target) on mobile; remain ≥44px throughout.
- Results: stat strip 2-up (≤639px), 3-up (≥640px), 6-up (≥900px). Scoreboard becomes 3-column at ≥900px.
- No horizontal scroll at 360. Fluid type/spacing via `clamp()`. Touch targets meet ≥44×44px.

## Known limitations (honest)

- **Runs from `file://`:** designed for direct open (no server). The optional `assets/questions.json` remote bank is only requested over HTTP(S); under `file://` the embedded bank is used directly.
- **localStorage scope:** scores/prefs are per-origin (per file path in some browsers); clearing browser storage clears them. Private mode may block persistence.
- **Sound:** uses Web Audio API (lazy init). If unsupported, sound is disabled automatically. Autoplay policies may prevent resume until first user gesture (clicking Start/Pause/Sound/Options will typically unlock).
- **Print:** dedicated `@media print` stylesheet forces ink-on-white and hides chrome. Browser print dialog styling varies by platform.
- **JSON export/import:** Blob download uses `URL.createObjectURL`; in very strict environments download may be blocked — the app reports failure via toast.
- **No network sync:** leaderboard is local-only by design (`ngsh.quiz.scores.v1`).
- **Validation depth:** native constraint validation is noted in questions, but app uses custom rules for setup; server-side validation is out of scope.

## File layout

```
week-05-06-quiz/
├── index.html          semantic, no inline styles/scripts; script order: questions.js, app.js
├── css/style.css       Studio Terminal tokens, sections 01–16, print rules
├── js/questions.js      plain script defining window.QUESTION_BANK + metadata
├── js/app.js            vanilla logic (IIFE), sections 01–20; exposes QuizArena.{exportAllScores,importScores,buildReport}
├── assets/favicon.svg  Q monogram on ink
└── README.md           this document
```

## Verification notes

- `node --check js/app.js` and `node --check js/questions.js` pass (plain JS, no ES module syntax). Script load order is plain `<script src>` — works from `file://`.
- JS selectors align with IDs/classes in `index.html` (options radiogroup, nav dots, timer bar, live region, etc.).
- CSS uses design system tokens (`--ink`, `--paper`, `--acid`, `--clay`, `--cyan`, `--gold`, `--line`, `--font-display`, `--font-mono`).
- No `console.log`, no inline handlers (`onclick`), no `style=` attributes, no external image/CDN assets except Google Fonts.
- Text injection uses `textContent` only (never `innerHTML`) for user-entered values (handle).
- Leaderboard key is `ngsh.quiz.scores.v1` as specified.

## Design notes (from brief)

Aesthetic: broadcast control-room/exam hall feel with corner-bracket exam-sheet framing (CSS pseudo-elements `┌└┐┘` on question card), large display question prompt, hairline ledger-style option rows with mono A–D gutter, depleting acid timer bar pinned under sticky header. Correct/wrong feedback unfolds beneath options; results include count-up and topic bars. No rounded cards, no shadows — conforms to Studio Terminal.