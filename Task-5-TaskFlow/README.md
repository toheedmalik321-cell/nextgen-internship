# TaskFlow — Week 07–08 Capstone

**NG⟡SH Internship · Capstone project · Vanilla JavaScript, no framework**

A project board for a small web development team: four columns, a week timeline, keyboard
control for every drag action, undo/redo, derived insights, and an offline-first
`localStorage` store with a simulated batched sync.

Open `index.html` directly. There is no build step, no bundler, no package manager and
no server. Three plain `<script>` tags in dependency order are the whole toolchain.

---

## Running it

Double-click `index.html`, or drag it into a browser. Nothing else is required.

If you prefer a server (only useful for the devtools network panel):

```bash
# any static server works, e.g.
npx serve .
python -m http.server 8000
```

The app is written to behave identically either way. `localStorage`, `Blob` downloads
and `FileReader` all work under `file://`.

Reset the demo board at any time: **Settings → Reset to sample board** (it offers an undo).

---

## What is in it

| Feature | Notes |
| --- | --- |
| Board | 4 columns, drag-and-drop with an insertion gap, inline composer per column |
| Timeline | Same card data regrouped by week, Gantt bar width = `span` |
| Card dialog | Title, notes, column, due date, priority, tags, checklist, activity log |
| Filters | Free-text query, priority chips, tag chips, overdue-only, show/hide done |
| Insights | 7 header metrics, completion ring, 7-day throughput, cycle time per column, per-tag bars, and a generated insight list where every line is a button |
| Undo / redo | 80 entries deep, each labelled in the header (`Undo MOVE NG-110 → REVIEW`) |
| Persistence | `localStorage`, schema-versioned, with a v0 → v1 migration path |
| Sync | Simulated remote: batches of cards, `Promise.all`, failure + retry |
| Import / export | Full-state JSON round-trip |
| Theme | Dark default, light override, remembered |

Sample dataset: **21 cards**, 59% checklist completion, ~21 KB of `localStorage`.

The cards are demo content so the board is not empty on first load. They are **not** a
record of real work — the page says so above the columns, and **Settings → Reset to
sample board** restores exactly this set.

---

## Architecture

```
index.html      DOM contract — every element the JS looks up lives here
css/style.css   design tokens + all component styles
js/data.js      TaskFlowData — sample cards, columns, priorities, tags, date + insight maths, sync simulator
js/store.js     TaskFlowStore — pure reducer, history, persistence, migration
js/app.js       rendering, DOM events, keyboard map, drag-and-drop, dialogs
```

`data.js` and `store.js` know nothing about the DOM. `store.js` in particular has no
`document` reference at all, which is what makes undo/redo trustworthy: the reducer is
a pure function of `(state, action)`.

### Data flow

Every mutation goes through one funnel:

```
UI event → Store.dispatch(action) → reducer(state, action) → new state
        → subscribers → render(state) → DOM
        → persist to localStorage (debounced)
```

There is no second path that mutates state. That is the whole reason the board never
drifts out of sync with the store — and why the undo stack can be trusted to be
complete.

### The action list

Mutations (recorded in history, each with a computed inverse):

`CARD_CREATE` · `CARD_UPDATE` · `CARD_DELETE` · `CARD_RESTORE` · `CARD_MOVE` ·
`CARD_TOGGLE_CHECK` · `CHECK_ADD` · `CHECK_REMOVE` · `STATE_REPLACE`

Transient (change state, not history — filtering should not be undoable):

`FILTER_SET` · `FILTER_CLEAR` · `VIEW_SET` · `THEME_SET` · `SYNC_SET` ·
`FAIL_NEXT_SET` · `UI_SET`

---

## Undo / redo

Rather than snapshotting state, each mutating action carries **its own inverse**,
computed at dispatch time against the pre-action state. `invert(action, prevState)`
returns an action that puts the board back.

- 80-entry limit, oldest dropped first.
- The header names the next undo *and* the next redo, so the button tooltip is never
  a mystery.
- A replayed action reuses its original `id` and timestamp, so an undo → redo cycle
  does not leave duplicate rows in the activity log.

The history boundary is moved **before** an entry is replayed, not after. `replay()`
dispatches, which notifies subscribers; pushing to the opposite stack afterwards would
show every renderer a `canRedo()` that is one step stale.

---

## Keyboard map

Every drag action has a keyboard equivalent — a feature that only works by mouse does
not count as done.

| Key | Action |
| --- | --- |
| `/` | Focus search |
| `N` | New card in the first column |
| `Enter` / `Space` | Open the focused card |
| `Ctrl` / `⌘` + `←` `→` | Move the focused card between columns |
| `Ctrl` / `⌘` + `↑` `↓` | Reorder within a column |
| `U` | Undo |
| `R` | Redo |
| `V` | Switch view |
| `T` | Toggle theme |
| `Esc` | Close the dialog |

Arrow keys move focus between cards; `Home` / `End` jump to the first / last card in
the focused card's column. Press `?` for the same list in-app.

---

## Accessibility

- Landmarks (`header` / `main` / `footer`), one `h1`, ordered headings.
- Board cards are `role="button"` with a full `aria-label`
  (`NG-110: Write README + docs, BACKLOG`).
- **Roving tabindex** on the board — the whole board is a single tab stop, and exactly
  one card is tabbable at a time. Without this, `Tab` walks all 21 cards before
  reaching the next control.
- View tabs use the tablist pattern: `role="tab"` / `aria-selected`, arrow-key
  navigation, and a roving `tabIndex` so the pair is one tab stop.
- Dialogs: `role="dialog"`, `aria-modal="true"`, labelled by the dialog title.
- **Tab containment** — focus cannot leave an open dialog. Without this a dialog is
  only a visual overlay and focus walks into the board behind it.
- Focus moves to the first meaningful control on open (`[data-autofocus]`) and is
  restored to the exact trigger on close.
- Background scroll is locked while a dialog is open.
- Every move is announced in a polite live region (`NG-110 moved to IN PROGRESS.`).
- The filter count is a `role="status"` region; a sync failure is reported in an
  assertive `role="alert"` region as well as a toast.
- Visible focus ring on every interactive element; `prefers-reduced-motion` honoured.

---

## Storage schema

Key: `ngsh.taskflow.v1`

```jsonc
{
  "schemaVersion": 1,
  "savedAt": "2026-10-04T11:36:50.391Z",
  "cards": [
    {
      "key": "NG-110",              // stable id, never reused
      "title": "Write README + docs",
      "notes": "…",
      "priority": "normal",          // high | normal | low
      "tags": ["docs"],
      "column": "backlog",           // backlog | progress | review | done
      "due": "2026-10-09",           // or null
      "week": 6,
      "span": 1,
      "checklist": [{ "id": "NG-110-t1", "text": "…", "done": true }],
      "activity": [{ "id": "NG-110-a0", "type": "moved", "at": "…", "from": "…", "to": "…", "text": "…" }],
      "createdAt": "…",
      "updatedAt": "…"
    }
  ],
  "filters": { "query": "", "priorities": [], "tags": [], "overdueOnly": false, "showDone": true },
  "view": "board",
  "theme": "dark"
}
```

Writes are debounced and wrapped in `try`/`catch`: a full or blocked `localStorage`
degrades to an in-memory board with a visible notice rather than throwing.

### Migration

A payload with no `schemaVersion` is treated as v0 and migrated (`status` → `column`,
uppercase values lowercased, `completed` folded into the activity log). A payload from
a *newer* schema than this build is refused and the sample board is restored, so a stale tab
can never silently downgrade somebody's data.

---

## Simulated sync

`data.js` exposes a fake remote: cards are sent in batches of 6 with `Promise.all` and
`async`/`await`, and the status chip cycles `offline → syncing → synced`.

**Settings → Simulate a failed sync** makes the next round trip reject with a simulated
503. The board is left untouched, the failure is announced assertively, and Retry
recovers. The toggle clears itself whichever way that sync ends, so Retry can actually
succeed.

---

## Security notes

- No `innerHTML` for user data anywhere. All DOM is built with `createElement` and
  `textContent`.
- No inline `style` attributes; colours come from classes and CSS custom properties.
- No `eval`, no `Function`, no dynamic `import`.
- JSON import is parsed, schema-checked and normalised before it reaches the store —
  it never trusts a title, a tag or a key from a file.
- No external requests except the two Google Fonts families; the page degrades to
  system fonts without them.

---

## Known limitations

1. **No touch drag-and-drop.** HTML5 drag events do not fire on touch devices, so the
   board is mouse/keyboard only on phones. Cards are still fully movable there with
   `Ctrl`/`⌘` + arrows. The pointer-capture path (long-press to lift, `elementFromPoint`
   to find the column, same reducer action as the mouse path) is scoped as backlog card
   NG-117.
2. **FLIP animation is measurement-based, not a layout animation.** Moving cards
   measure their old and new rectangles and play a transform. It is skipped entirely
   under `prefers-reduced-motion`, and it does not run on the first paint. There is no
   FLIP on the timeline, and the drop gap is the only drag feedback while a card is
   still in the air.
3. **Single-user.** There is no auth and no conflict resolution — "last write wins" is
   the entire story. Two tabs open at once will overwrite each other.
4. **Sync is a simulation.** No network, no server, no credentials. It exists to prove
   the async UI states and the failure path, not to sync anything.
5. **Cross-browser testing is incomplete.** Verified in Chromium. Firefox and Safari are
   backlog card NG-118; the known risk is `history.replaceState` under `file://` and
   pointer capture on a scrolling list.
6. **Activity log grows unbounded.** Fine for 21 cards, wrong for 21,000.
7. **Filtering is not undoable** by design (`TRANSIENT`), which some users will find
   surprising after pressing `U`.

---

## Credits

Design system and brief: NG⟡SH (Next Gen Software Hub), Mussalhapur, Patna 800006.
All artwork is local SVG. Typefaces: Archivo and JetBrains Mono (Google Fonts).
