# LinkedIn Posts — Task 1 to Task 6

**Intern:** Toheed Mehmood
**Company:** Next Gen Software Hub Pvt. Ltd.
**Deadline:** 12 November 2026

Each task on the form needs a **public LinkedIn post URL**. Post the text below from your
personal profile, attach the matching screenshot, publish it as **Anyone**, then copy the
post link.

## Images to attach

| Task | Image file |
| --- | --- |
| Task 1 — Portfolio | `LinkedIn-Images\Task-1-Portfolio.png` |
| Task 2 — Taskbook | `LinkedIn-Images\Task-2-Taskbook.png` |
| Task 3 — Plates | `LinkedIn-Images\Task-3-Plates.png` |
| Task 4 — Quiz Arena | `LinkedIn-Images\Task-4-Quiz.png` |
| Task 5 — TaskFlow | `LinkedIn-Images\Task-5-TaskFlow.png` |
| Task 6 — Final | `LinkedIn-Images\Task-6-Final.png` (screenshot of the live project index) |

## How to post and get the link

1. Open LinkedIn → **Start a post**.
2. Paste one draft below.
3. Click **Add media** and attach the matching PNG.
4. Set visibility to **Anyone**.
5. Click **Post**.
6. On the published post, click the **three dots (⋯)** → **Copy link to post**.
7. Paste that URL into the matching **LinkedIn Post Link** field on the form.
8. Do not delete or edit the post until the company confirms the submission.

If the company's LinkedIn page appears when you type `@Next Gen Software Hub`, tag it.
If it does not appear, leave the plain name — do not tag an unrelated page.

Suggested schedule: one post per day from 8 to 13 November is ideal, but two per day also
works. The form only checks that the link opens publicly.

---

## Task 1 — Portfolio

Task 1 of my web development internship at Next Gen Software Hub is done: a personal portfolio
built from scratch with HTML, CSS and vanilla JavaScript.

What went into it:
• mobile-first layout with Flexbox and Grid
• accessible navigation: skip link, visible focus states, keyboard menu
• scroll reveals with IntersectionObserver
• reduced-motion support
• a print-friendly HTML CV

No framework, no build step — the page opens straight from `file://`.

The biggest lesson: a portfolio is a layout and accessibility exercise before it is a
design exercise.

Live: https://toheedmalik321-cell.github.io/nextgen-internship/Task-1-Portfolio/

#WebDevelopment #HTML #CSS #JavaScript #Internship #LearningInPublic

---

## Task 2 — Taskbook

Task 2: Taskbook, a to-do app built with vanilla JavaScript.

Features: add, edit, complete, delete, filters, search, bulk actions, drag reordering and
localStorage persistence.

My favourite detail is the delete flow. A task is not destroyed — it moves to Trash, and
the toast offers undo for six seconds. The undo button closes over a snapshot, so it
restores the right task even if other tasks changed in between.

No framework. One state object, one render path.

Try it: https://toheedmalik321-cell.github.io/nextgen-internship/Task-2-Taskbook/

#JavaScript #WebDevelopment #LocalStorage #Internship #NextGenSoftwareHub

---

## Task 3 — Plates

Task 3: Plates — a filterable gallery of 16 hand-authored SVG studies.

I built the artwork as SVG so the whole gallery stays lightweight. The interface has
category filters, debounced search, three densities, a keyboard-trapped lightbox and FLIP
animations for reordering.

The tricky part was `file://`. `fetch()` is blocked when a page is opened directly from
disk, so the catalogue is treated as an enhancement: use it when available, otherwise
fall back to an inline dataset. Same behaviour either way.

Live: https://toheedmalik321-cell.github.io/nextgen-internship/Task-3-Plates/

#CSS #SVG #JavaScript #Animation #Accessibility #Internship

---

## Task 4 — Quiz Arena

Task 4: Quiz Arena — a timed quiz built with HTML, CSS and vanilla JavaScript.

20 questions across 4 difficulty tiers and 7 topics, 30 seconds per question, pause and
resume, streak scoring, per-question explanations and a local leaderboard.

The real work was validation and state: six screens driven by one phase value, inline
`role="alert"` errors, a pool-size warning when filters match fewer questions than
requested, and a fault screen instead of a blank page when something fails.

A quiz is mostly an error-handling exercise wearing a game costume.

Live: https://toheedmalik321-cell.github.io/nextgen-internship/Task-4-Quiz/

#JavaScript #WebDevelopment #Accessibility #Internship #NextGenSoftwareHub

---

## Task 5 — TaskFlow

Task 5: TaskFlow — my capstone project.

A four-column Kanban board with pointer and keyboard drag-and-drop, undo/redo, filters,
search, insights, settings and offline persistence.

Architecture: a pure reducer, plain action objects through `dispatch`, subscribers for
rendering, and one flush to localStorage per commit. Undo/redo is a history stack beside
the reducer rather than a tangle inside the UI.

The most useful bug I fixed was in the replay order: move the history entry before
replaying it, or the buttons are computed from stale state.

Live: https://toheedmalik321-cell.github.io/nextgen-internship/Task-5-TaskFlow/

#JavaScript #WebDevelopment #Kanban #Accessibility #Internship

---

## Task 6 — Final presentation and report

Task 6: wrapping up my eight-week web development internship at Next Gen Software Hub.

Five projects, one design system, all built with HTML, CSS and vanilla JavaScript:

1. Portfolio
2. Taskbook
3. Plates
4. Quiz Arena
5. TaskFlow

No framework, no build step, no bundler. Every project opens from `file://` and works.

I also wrote the full internship report, a presentation script and a requirements
checklist that maps every brief item to evidence.

The biggest gain was not a library or a trick. It was learning to test the running
product instead of trusting code that merely reads correctly.

Thank you to the Next Gen Software Hub team for the brief and the review.

Everything is public here: https://github.com/toheedmalik321-cell/nextgen-internship

#WebDevelopment #JavaScript #HTML #CSS #Internship #NextGenSoftwareHub
