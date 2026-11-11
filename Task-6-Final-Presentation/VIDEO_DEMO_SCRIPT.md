# Video Demo Script

**Target length:** 8–10 minutes
**Format:** screen capture with voiceover. No talking heads needed.
**Audio:** quiet room mic. No background music under narration.

## Before you record

- Close every unrelated tab and window. Hide the taskbar and dock.
- Turn on **Do Not Disturb** so no notification pops mid-take.
- Set browser zoom to **100%**. Set the window to a fixed size — 1440×900 is a good
  16:10-ish frame; do not resize during recording.
- Clear `localStorage` in each project before recording so you always start from seed
  data and every take is identical.
- Open each project from its folder, not from a server, so the video proves the
  `file://` claim.
- Do one silent run-through first to shake out clicks and dead air.

## Marks

`[ACTION]` = what to do on screen · `(VO)` = what to say · `[PAUSE 1s]` = hold

---

## Scene 1 — Cold open (0:00–0:25)

`[ACTION]` Black screen. Fade up on the folder view showing all five project folders.

**(VO)** "Five projects, eight weeks, no framework and no build step. Every one of these
opens by double-clicking the HTML file."

`[PAUSE 1s]`

`[ACTION]` Cut to TaskFlow already open on the board.

**(VO)** "This one's the capstone. Let me start here, then wind back to the beginning."

---

## Scene 2 — TaskFlow board (0:25–1:40)

`[ACTION]` Show the board with its four columns and 21 cards. Slowly pan across the
column headers. Point out the metrics strip along the top.

**(VO)** "Four columns — backlog, in progress, review, done. Twenty-one seeded cards, each
with a priority, tags, a due date, a checklist and an activity trail. The numbers along
the top are live: they recalculate from state, they're not typed in."

`[ACTION]` Click a card. The dialog opens with the checklist visible.

**(VO)** "Every card opens a dialog. Tick a checklist item."

`[ACTION]` Tick one item. Watch the dialog's progress read out and the card's checklist
ratio update.

**(VO)** "That updates the card's completion ratio, which feeds the metrics."

`[ACTION]` Cancel the dialog. Drag a card from In Progress to Review.

**(VO)** "Drag it across columns."

`[ACTION]` The card lands in Review. A toast appears.

**(VO)** "And it's undoable. Ctrl+Z."

`[ACTION]` Press Ctrl+Z. The card returns to In Progress.

**(VO)** "Back where it started. The whole board is a pure reducer — every change goes out
as an action, and the screen is re-rendered from the result."

`[ACTION]` Press `?` to open the shortcuts dialog.

**(VO)** "The board is fully keyboard-operable. This lists the shortcuts."

`[ACTION]` Close with Escape.

**(VO)** "Escape closes it and returns focus to the board."

---

## Scene 3 — Timeline and undo/redo (1:40–2:40)

`[ACTION]` Click the Timeline view.

**(VO)** "Second view. The same cards on an eight-week timeline, positioned by due date."

`[ACTION]` Click List view briefly.

**(VO)** "And a list view. Same state, three renderings — that's the point of keeping state
separate from the view."

`[ACTION]` Back to Board. Press Ctrl+Z twice, then Ctrl+Shift+Z once.

**(VO)** "Undo and redo, across an eighty-step history."

`[ACTION]` Scroll down to the Insights section.

**(VO)** "There's an insights section — busiest tag, per-tag completion, ageing work. All
derived from the same state."

---

## Scene 4 — Taskbook (2:40–4:10)

`[ACTION]` Open `week-01-02-todo/index.html`.

**(VO)** "Week one to two. A task manager. Add, edit, complete, filter, search, sort,
reorder."

`[ACTION]` Type a title, pick a priority, submit.

**(VO)** "Adding a task validates the title inline."

`[ACTION]` Delete a task with the `×`.

**(VO)** "Now watch the delete. The task isn't destroyed — it moves to a trash tab, and a
toast gives me six seconds to undo."

`[ACTION]` Click Undo in the toast. The task returns.

**(VO)** "Undo holds a snapshot from the moment of deletion, so it restores the right task
even if I changed other things in between."

`[ACTION]` Type into the search box: "gallery". Results narrow after a short pause.

**(VO)** "Search is debounced two hundred milliseconds — a fast typist triggers one render,
not ten."

`[ACTION]` Drag a task to reorder it. Switch to the light theme.

**(VO)** "Reorder by drag. And there's a light theme — same tokens, different values, not an
inverted filter."

`[ACTION]` Open the Trash tab. Click "Empty trash".

**(VO)** "Emptying the trash is a separate, explicit bulk action — not a side effect of
deleting one task. Note this one has no undo: deleting a single task gives you six
seconds, but emptying the trash is final."

---

## Scene 5 — Plates (4:10–5:20)

`[ACTION]` Open `week-03-04-gallery/index.html`.

**(VO)** "Weeks three to four. Sixteen generative SVG plates, all drawn locally — no image
files, no CDN."

`[ACTION]` Click the Geometric filter. Watch the tiles re-flow.

**(VO)** "Filtering re-flows with a FLIP animation — first, last, invert, play — so it runs
on the compositor instead of thrashing layout."

`[ACTION]` Switch to Mosaic view.

**(VO)** "Grid or mosaic. The preference persists."

`[ACTION]` Click a plate to open the lightbox. Arrow-key through several. Click a filmstrip
thumbnail. Press Escape.

**(VO)** "Lightbox is keyboard-driven — arrows to move, Escape to close — and focus returns
to the thumbnail you came from."

---

## Scene 6 — Quiz Arena (5:20–6:50)

`[ACTION]` Open `week-05-06-quiz/index.html`.

**(VO)** "Weeks five to six. A timed assessment. Twenty questions across four difficulty
tiers."

`[ACTION]` Enter a handle. Untick most tiers and topics so the pool shrinks — the warning
appears.

**(VO)** "If my filters match fewer questions than I asked for, it tells me before the run
starts, rather than quietly giving me a short exam."

`[ACTION]` Start a five-question run.

**(VO)** "Thirty seconds a question. A to D to answer, arrows to move, Enter to confirm —
no mouse needed."

`[ACTION]` Answer a question. The explanation appears.

**(VO)** "Every answer explains itself immediately."

`[ACTION]` Flag a question with the flag button, then continue through the rest.

**[PAUSE 0.5s]**

`[ACTION]` Reach the results screen.

**(VO)** "Results give a score, a grade band, per-question timing, and a breakdown by topic
— so you can see which topic cost you the marks."

`[ACTION]` Scroll to the standings; the run is saved.

**(VO)** "Runs save to a local top-ten board. Nothing leaves the browser."

---

## Scene 7 — The bug story (6:50–8:10)

`[ACTION]` Show `js/app.js` open at the `showScreens` function.

**(VO)** "I want to show you the most useful thing I got wrong."

`[ACTION]` Highlight the helper.

**(VO)** "This function is meant to toggle screens by selector. When I first wrote it, I
wrote it as though the values in the map were DOM nodes — but they're booleans."

`[ACTION]` Show the browser console with the error text.

**(VO)** "So on the first render it tried to set a property on a boolean, threw, and that
exception happened during initialisation — which killed the entire app. No timer, no
start button, nothing worked."

`[PAUSE 1s]`

**(VO)** "The code *read* correctly. It looked finished. I'd have shipped it if I'd only
reviewed it — I found it because I actually clicked through the app."

`[ACTION]` Show the corrected version briefly.

**(VO)** "Fixed, and then every project got exercised through its interface rather than
just read. Static review can't find a statement that throws on line one."

---

## Scene 8 — Close (8:10–9:00)

`[ACTION]` Return to the folder view showing all five projects.

**(VO)** "Five projects. One design system. No framework, no build step, no runtime
dependencies beyond a webfont — and every one runs from the filesystem."

`[ACTION]` Fade to black.

**(VO)** "The honest gaps: there's no automated test suite — I tested by hand, which is
slower and less repeatable — and two of the five files use classic function style while
the other three use modern ES6. Both are things I'd fix first."

`[END]`

---

## Re-record checklist

If any take has a stumble, re-record **only that scene** — the pieces are independent.

- [ ] No notification appeared mid-scene
- [ ] Zoom stayed at 100%, window never resized
- [ ] Every scene started from seed data (storage cleared beforehand)
- [ ] Narration matches what's actually on screen — no claiming a feature before it appears
- [ ] The bug scene shows the real error text, not a paraphrase
- [ ] No dead air longer than two seconds
- [ ] Audio peaks below about −3 dB, no clipping
