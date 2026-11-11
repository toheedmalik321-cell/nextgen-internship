# Taskbook

**Week 01–02 deliverable — Web Development Internship**
Next Gen Software Hub Pvt. Ltd., Patna

A vanilla JavaScript task manager covering the Week 01–02 material:
JavaScript fundamentals (variables, functions, closures, event delegation and direct
DOM manipulation) plus the ES6 features this script relies on — block-scoped `let`,
`Promise` and `async`/`await`.

---

## Run it

Open `index.html` in any modern browser. **No build step, no server, no
dependencies** — the app is plain HTML, CSS and one IIFE-scoped script, so it runs
straight from `file://`.

The only external request is the Google Fonts stylesheet. If you are offline the
fonts fall back to Helvetica/Arial and ui-monospace respectively; nothing breaks.

---

## Feature set

| Requirement | How it works |
| --- | --- |
| **Add** | Validated form — title (3–80 chars, inline clay error), optional notes, priority, optional due date. New tasks appear at the top. |
| **Update** | Three routes: the `✎` button opens an inline editor for every field; the checkbox toggles completion; double-clicking the title opens the editor with the title selected. |
| **Delete** | `×` moves the task to the **Trash** tab and a six-second `UNDO` toast appears. Emptying the trash is a separate, explicit bulk action. |
| **Filter** | All / Active / Completed / Trash tabs with live counts, arrow-key roving tabindex. |
| **Search** | Title + notes, debounced at 200 ms. |
| **Sort** | Manual order, due date, priority, or title A–Z. |
| **Reorder** | `↑` / `↓` arrows, plus HTML5 drag-and-drop on desktop with a visible drop indicator. |
| **Persistence** | `localStorage` under the versioned key `ngsh.todo.v1`. The rail shows the live byte size of the store. |
| **Stats** | Total / Active / Done / Overdue, a percentage figure and an acid progress bar. |
| **Bulk** | Complete all active, clear completed, empty trash, export JSON, import JSON. |
| **Theme** | Dark (default) and light, persisted separately. The light theme is a real token override, not a naive inversion. |
| **Keyboard** | `/` search · `n` new task · `Esc` cancel · `Delete` trash the focused row. Listed in the sticky rail. |

---

## Concepts demonstrated

**One source of truth.** A single `state` object holds `tasks`, `filter`, `query`,
`sort`, `theme`, `editingId` and `bytes`. Every mutation ends in `commit()`, which
persists and then calls `render()`. `render()` is the only function that rebuilds the
list DOM. No other code touches task markup.

**Event delegation.** `js/app.js` attaches exactly one `click`, one `change` and one
`submit` listener to the `<ul id="task-list">`, then dispatches with
`event.target.closest('[data-action]')`. Rows are created and destroyed constantly, so
per-row listeners would leak; delegation is both correct and cheaper.

**Closures, used for three specific jobs.**
- `debounce(fn, wait)` returns a function whose timer lives in its own closure, so only
  the last keystroke survives.
- `sanitiseTask()` is an IIFE closure that coerces any arbitrary object into a valid task
  — shared by the seed data and the JSON importer, so neither path can inject a
  malformed record.
- `readFileAsText()` wraps `FileReader` in a Promise so the import flow can `await` it.

**Block scoping.** Every binding in the script is declared with `let` rather than
`var`, so each function gets a clean scope for its temporaries and a loop variable
never leaks its value past an iteration.

**`async` / `await`** drives the two genuinely asynchronous flows: the bulk actions
(`await delay(180)` before mutating, so the button's disabled state is visible) and the
JSON import (`await readFileAsText(file)`).

**Undo without a confirm dialog.** `trashTask()` returns a snapshot; the toast's
`UNDO` button closes over that snapshot, so undo still works correctly even if other
tasks changed in the meantime.

**XSS safety.** User-entered text — titles, notes, the imported file — is never written
through `innerHTML`. Every node is built with `document.createElement` and filled with
`textContent`. There is no `innerHTML` in the shipped script.

**Resilience.** Every `localStorage` call is inside `try`/`catch`. A corrupt or
wrong-shaped store falls back to the five seeded example tasks rather than throwing. A
malformed import produces a visible error toast. Storage failures are reported, not
silently swallowed.

---

## File layout

```
week-01-02-todo/
├── index.html        semantic markup, aria wiring, form template
├── css/style.css     tokens → reset → layout → components → motion
├── js/app.js         state, storage, render, delegated events, keyboard
├── assets/favicon.svg
└── README.md
```

---

## Accessibility notes

- Semantic landmarks: `header`, `main`, `aside`, `footer`, and a skip link to `#main`.
- Exactly one `h1` (a visually hidden page title for assistive technology); heading
  levels never skip.
- Every validated field has `aria-invalid`, `aria-describedby` pointing at a
  `role="alert"` message node.
- The tab strip is a real `role="tablist"` with roving `tabindex` and `aria-selected`.
- The trash/undo toast is a polite live region; errors use `role="alert"`.
- Icon-only buttons all carry `aria-label` and `title`.
- Completion checkboxes announce their action ("Mark complete: *title*").
- Visible `:focus-visible` ring on every interactive element; focus is never clipped.
- Touch targets are ≥ 38–44 px; the checkbox is a real 22 px control inside a 44 px row.
- `prefers-reduced-motion` collapses every transition and animation, including smooth
  scrolling on the back-to-top button.

## Responsive notes

Mobile-first. The compose form is one column at 360 px, and becomes a `2fr / 1fr / 1fr`
grid at 900 px. The workspace is a single column until 900 px, at which point the
stat/bulk/shortcut rail becomes a 320 px sticky sidebar. Verified at 360 / 768 / 1440
with no horizontal scroll at 360 px.

---

## Known limitations

These are deliberate, and stated honestly rather than hidden:

1. **Storage is per-browser.** `localStorage` is not synced between devices and clearing
   site data deletes everything. The export/import pair exists to work around this.
2. **Overdue is date-only.** A task is marked overdue from the day *after* its due date;
   there is no time-of-day component.
3. **No recurring tasks, subtasks, attachments or reminders.** Out of scope for a
   Week 01–02 brief.
4. **Drag-and-drop is desktop-only.** Touch devices rely on the `↑`/`↓` buttons, which is
   why those buttons are always present rather than hidden on wide viewports.
5. **Undo is single-level.** The trash tab provides a durable recovery path, but only
   the most recent delete is undoable from the toast.
6. **Sorting and manual reordering interact.** When a non-manual sort is active, `↑`/`↓`
   swaps the underlying `order` values of the two visible neighbours — the on-screen
   result is correct, but the stored manual order only makes sense again once you switch
   back to *Manual order*.
7. **The date input is browser-native**, so its presentation and validation chrome vary
   between Chrome, Firefox and Safari.