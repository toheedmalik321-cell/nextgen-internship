# Presentation Notes — Web Development Internship

**Duration:** 12–15 minutes plus questions
**Deck shape:** title → constraint → four builds → two bugs found → what I'd do next
**Demo:** TaskFlow and Quiz Arena (live). Everything else from screenshots.

---

## 1. Title (0:00–0:30)

> Good morning. Over eight weeks I built five web development projects at Next Gen Software
> Hub — a portfolio site, a task manager, an SVG gallery, a timed quiz and a kanban
> capstone. None of them use a framework, and none of them need a build step. Every one
> opens by double-clicking an `index.html`.

**Hold on this slide while the room reads it.** The constraint is the interesting part
of the story, so say it early and say it plainly.

---

## 2. The constraint (0:30–1:30)

> The rule for the whole programme was vanilla HTML, CSS and JavaScript. No React, no
> bundler, no `npm install`. That turned out to be useful rather than annoying — with no
> framework smoothing over the DOM, you have to actually understand why the screen
> updated.

Two supporting points, one sentence each:

- **No build step means no hidden failure.** What I ship is what runs.
- **One design system across five projects.** Same colours, same type, same borders —
  so it reads as one body of work, not five exercises.

---

## 3. The builds (1:30–6:30)

Roughly 75 seconds per project. Lead with the problem, not the feature list.

### Taskbook — task manager

> The delete is the interesting part. Deleting a task doesn't destroy it — it moves to a
> Trash tab, and the toast that appears gives you six seconds to undo. The undo button
> holds a snapshot from the moment of deletion, so it still restores the right task even
> if you've changed other things since. Same pattern works for anything destructive.

**If asked about architecture:** one state object, one render function, every mutation
goes through a single commit. No other code touches the list markup.

### Plates — SVG gallery

> Sixteen generative SVG plates I drew myself. Two techniques worth naming: the filter
> and sort animations use FLIP — First, Last, Invert, Play — which animates on the
> compositor instead of thrashing layout. And the plate catalogue loads with `fetch`,
> which browsers block on `file://`. So the fetch is an enhancement: on success it uses
> the catalogue, on failure it falls back to an inline array. The gallery behaves the
> same either way — and I tested it both ways.

### Quiz Arena — timed assessment

> A 20-question bank, four difficulty tiers, seven topics, 30 seconds a question. The
> screen layout is driven by a single phase value rather than toggling classes by hand,
> so an impossible combination of visible screens can't be represented. It's also fully
> keyboard-driven: A to D to answer, arrows to move, Enter to confirm.

**If asked about edge cases:** if you filter down to fewer questions than you asked for,
it tells you before the run starts instead of quietly giving you a short exam.

### TaskFlow — capstone

> Four columns, 21 seeded cards, three views, undo/redo, and a simulated sync layer.
> The core is a pure reducer — all mutation goes out as an action object, the store
> reduces it, the UI re-renders from the result. No view code mutates state; nothing in
> the view layer touches storage.

**The payoff line:** once that structure was in place, undo/redo, persistence and sync
stopped being features to build and became consequences of the design.

**Live demo here — 90 seconds.** Open a card, tick a checklist item, drag it to another
column, press Ctrl+Z, then open the shortcuts dialog with `?`.

---

## 4. Two bugs worth telling (6:30–9:30)

This is the strongest part of the presentation. Pick these two.

### The app that looked finished and wasn't

> Quiz Arena passed my static review and looked complete. Then I ran its script in the
> console and got a type error on the first render. A helper meant to toggle screens
> had been written as though its values were DOM nodes when they were booleans. It threw
> during initialisation, which killed the entire application — no timer, no start
> button, nothing worked.

> The lesson wasn't about the syntax. It was that reading code can't find a statement
> that throws on line one. Using the software found it in seconds.

### Six links that went nowhere

> My portfolio's project grid had six "view project" links. Every single one was
> broken — the folder names were from an earlier plan. Two of the cards also described
> projects that aren't in the submission at all, and one described a three-column board
> for what is actually four columns.

> The fix was to test against reality: I wrote a script that extracts every local
> `src` and `href` and checks the file exists. 59 references across HTML, CSS and JS, and
> now zero missing.

**Optional, if time allows — the misleading test failures:**

> Three things looked like bugs and weren't. An empty search result — caused by a task my
> own test had deleted two steps earlier. A tile count read before an async re-render
> settled. A quiz filter that seemed ignored, until I noticed all the chips are checked
> by default to mean "include everything". I confirmed each one before changing any
> code. Two needed no change at all.

---

## 5. Quality and accessibility (9:30–11:00)

Keep this to four points — it's a list, not a story.

> **Security by construction.** User text never goes through `innerHTML`. Taskbook, Plates
> and TaskFlow build nodes and fill them with `textContent`, so a malicious task title or
> an imported JSON file can't execute. Imported files are schema-validated before they go
> anywhere near state.

> **Resilience.** Every storage call is wrapped. A blocked or corrupt store falls back to
> seed data instead of throwing, and a failure is reported visibly rather than silently
> losing work.

> **Accessibility is not a pass at the end.** Landmarks, one `h1` per page, visible focus,
> keyboard parity for every pointer action, dialogs that trap focus and return it to the
> button that opened them, live regions for async status.

> **Honest documentation.** Several of my own READMEs and file headers claimed arrow
> functions and destructuring that the code didn't actually use. I counted the constructs
> in each file and rewrote the claims to match. The real version is narrower than what I'd
> written, and that's the correct one to submit.

---

## 6. What I'd do next (11:00–12:00)

> Three things, in order.

> **Automated interaction tests**, committed with each project. Both serious bugs in this
> project were invisible to code review and obvious within seconds of using the software.
> That gap should be closed by a suite, not by my memory.

> **Consistency on language style.** Three of the five projects use arrow functions and
> template literals; Taskbook and Plates are classic function style. It's internally
> consistent per file, but it isn't consistent across the submission, and that's a fair
> criticism.

> **A local working copy outside cloud sync.** My working tree sits in a OneDrive folder
> that rejects programmatic writes, so a mechanical refactor across two files had to be
> done by hand through an editor instead of a script.

---

## 7. Likely questions

**"Why no frameworks — wasn't that limiting?"**
It was the point. The interesting problems in these projects — what re-renders, when
state and DOM disagree, why an undo can restore the wrong thing — are exactly the ones a
framework hides.

**"How did you test without a test framework?"**
By driving the real interface in a browser: clicking every control, checking state
after each step, and reading console output. Then I added a static sweep for broken
asset references. It's slower and less repeatable than a suite, which is exactly why
automated tests are my first next step.

**"How do you know the apps work from `file://`?"**
Because I opened them that way, not just over a dev server. That's also how the `fetch`
limitation in Plates became visible — it never appears when you're serving over HTTP.

**"What was the hardest bug?"**
The Quiz Arena initialisation crash. Not because the syntax was hard — because the code
looked right and read correctly. The failure only existed at runtime, on the first line
of execution.

**"Is there anything you couldn't finish?"**
No functional gaps in the five deliverables. The honest gaps are the two in "what I'd do
next": no automated tests, and inconsistent function style across two files. Both are
documented in the READMEs.

---

## 8. Backup answers

If asked about something not covered:

- **Storage:** `localStorage` under versioned keys per project — `ngsh.todo.v1`,
  `ngsh.plates.view.v1`, `ngsh.quiz.scores.v1`, `ngsh.taskflow.v1`. Schema-versioned, with
  migration and seed fallback on mismatch.
- **External dependencies:** one Google Fonts stylesheet per project. Every image and icon
  is a local SVG.
- **Browser support:** current Chromium, Firefox and Safari.
- **The three files that can't be deleted** (`probe.txt`, an `index-DESKTOP-*.html`
  duplicate and a locked `.keep`) are OneDrive sync artefacts, not project files; they are
  unreferenced and safe to remove manually.
