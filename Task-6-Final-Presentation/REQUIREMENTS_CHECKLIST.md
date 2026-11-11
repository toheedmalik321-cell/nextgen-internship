# Internship Requirements Checklist

**Intern:** Toheed Mehmood
**Role:** Web Development Intern (remote)
**Company:** Next Gen Software Hub Pvt. Ltd. — Mussalhapur, Patna 800006, India
**Programme:** 8 weeks, two weeks per build
**Submission deadline:** 12 November 2026, through the link supplied by the company
**Stack:** HTML5, CSS3 and vanilla JavaScript. No framework, no build step, no ES modules.
Every page opens by double-clicking its `index.html` (`file://`). The only external request
is the Google Fonts stylesheet.

This document maps the company brief and the Internship Terms and Conditions to the files
in this submission. It is written to be checked line by line — every claim below points at
something a reviewer can open and test.

---

## 1. Week-by-week brief

| Week | Brief | Where it is met | Evidence a reviewer can check |
| --- | --- | --- | --- |
| 01–02 | HTML structure, CSS styling, Flexbox and Grid | `week-01-02-portfolio/css/style.css` | 22 `display: flex` and 14 grid declarations in the layout system |
| 01–02 | Responsive design: media queries, mobile-first | All five projects | 13 media queries in Portfolio, 15 in Plates, 7 in TaskFlow; layouts designed from 360 px up |
| 01–02 | Git & GitHub: repos, commits, branching | Not packaged — see **Gaps** | No `.git` directory is included in this folder; the work is delivered as source files |
| 01–02 | **Task:** portfolio page with a responsive layout | `week-01-02-portfolio/index.html` | Nav, hero, skills, project grid, timeline, contact form; 1 `h1`; keyboard-operable |
| 01–02 | JavaScript basics, DOM manipulation, ES6 | `week-01-02-todo/js/app.js` | CRUD through one state object; arrow functions, `const` / `let`, template strings |
| 01–02 | **Task:** interactive to-do list — add, delete, update | `week-01-02-todo/index.html` | Add form, inline edit, complete toggle, delete to Trash with undo; key `ngsh.todo.v1` |
| 03–04 | CSS animations and transitions, hover effects | `week-03-04-gallery/css/style.css` | 6 `@keyframes` blocks (`sheen`, `shimmer`, `tileIn`, `modalIn`); hover reveals on tiles |
| 03–04 | Event delegation, closures, promises | `week-03-04-gallery/js/app.js` | Delegated grid listener; closure-held caches; three `Promise.all` call sites |
| 03–04 | **Task:** image gallery with filtering and lightbox | `week-03-04-gallery/index.html` | 16 SVG plates, 5 categories, live counts, search, sort, 3 densities, lightbox with arrow keys |
| 05–06 | **Task:** functional calculator or quiz application | `week-05-06-quiz/index.html` | Quiz Arena: 20-question bank, 4 tiers, 7 topics, 30 s per question |
| 05–06 | Form validation, error handling, responsive design | `week-05-06-quiz/*` | Handle / difficulty / topic validation with `role="alert"` messages; empty-bank fault screen and an HTTP(S) fetch-failure fallback; 5 media queries |
| 07 | Project demonstration to mentors | `week-07-08-capstone/index.html` | Four-column board, three views, drag-and-drop, keyboard moves, insights, settings |
| 07 | Code review: best practices, code quality, performance | Every project README | Sectioned code, one state object per app, delegated listeners, no inline handlers or styles, no `innerHTML` for user data |
| 07 | **Task:** submit project with complete documentation and a brief video demo | `docs/` + project READMEs | `INTERNSHIP_REPORT.md`, `DESIGN_SYSTEM.md`, `PRESENTATION_NOTES.md`, `VIDEO_DEMO_SCRIPT.md` — **video itself still to be recorded** |
| 08 | Final presentation and review | `docs/PRESENTATION_NOTES.md` | 12-minute walkthrough with a 9-minute demo script, likely questions and backup answers |

---

## 2. Terms and Conditions

| Clause | How this submission handles it | Status |
| --- | --- | --- |
| 3. Complete assigned tasks by the deadline | Five briefs delivered; submission package prepared for 12 Nov | Met, pending upload |
| 3. Report to the assigned supervisor | Contact kept on WhatsApp; demo/presentation still to be given | Action needed |
| 4. Confidentiality and data protection | No client data, credentials or proprietary material is included. The TaskFlow board ships clearly labelled **sample** data, not a company record | Met |
| 4. Work and IP belong to the company | Footers read `© 2026 Next Gen Software Hub Pvt. Ltd.`; no third-party licences beyond Google Fonts | Met |
| 6. Unpaid programme, no benefits | Acknowledged; nothing in the deliverables implies employment | Met |
| 7. Certificate on successful completion | Request after the submission is accepted | Action after upload |
| 7. Experience letter only after the full duration | The programme is being completed in full | Company decision |

---

## 3. Quality gates — verified 7 November 2026

Checked with headless Chrome against the real folders over `file://`:

- All five pages load with **1 `h1`** each and **no page console errors**.
- Plates prints one expected message: the browser blocks `fetch()` of
  `assets/works/index.json` on a `file://` origin. The app falls back to its inline dataset
  and says so in a toast — this is documented in `week-03-04-gallery/README.md`.
- No missing local `href` / `src` targets and no missing CSS assets across the five pages.
- No inline `style="…"` attributes, no inline `on*=` handlers and no `console.log` in
  shipped code.
- No user-entered text is written with `innerHTML`; dynamic nodes use
  `createElement` / `textContent`.
- Semantic landmarks, skip links, visible focus styles, ARIA dialogs with focus traps,
  live regions for status messages, and `prefers-reduced-motion` support in every project.
- Storage keys are versioned: `ngsh.todo.v1`, `ngsh.todo.theme.v1`, `ngsh.plates.view.v1`,
  `ngsh.quiz.scores.v1`, `ngsh.taskflow.v1`.

---

## 4. Gaps and actions before 12 November 2026

1. **Record the video demo (required by the Week 7 task).** The script is ready at
   `docs/VIDEO_DEMO_SCRIPT.md`. It runs 8–10 minutes; for a "brief" demo, keep scenes 1,
   2, 4, 5 and 6 and stop at roughly 5–6 minutes. Export as MP4 and upload with the code.
2. **Give the mentor demonstration and final review (Week 7–8).** The company contact is on
   WhatsApp; confirm whether the walkthrough is live or recorded.
3. **Git & GitHub.** The brief lists repositories and branching as topics, but this folder
   is not a Git repository. If the company expects a repo link, run `git init`, commit the
   five folders and push to a public GitHub repository, then add the link to the submission.
4. **Confirm the upload format.** Ask whether the link accepts a ZIP, a GitHub URL, or both;
   the package below is ready either way.
5. **Request the certificate** once the submission is confirmed as received. The experience
   letter is issued only on full completion of the programme.

---

## 5. What is in the submission package

```
NextGen-Internship/
├── README.md                     project index, stack, verification table
├── docs/
│   ├── DESIGN_SYSTEM.md          the shared visual language
│   ├── INTERNSHIP_REPORT.md      week-by-week report and reflection
│   ├── PRESENTATION_NOTES.md     final presentation script
│   ├── REQUIREMENTS_CHECKLIST.md this file
│   └── VIDEO_DEMO_SCRIPT.md      shot-by-shot demo script
├── week-01-02-portfolio/         brief: responsive portfolio
├── week-01-02-todo/              brief: interactive to-do list (Taskbook)
├── week-03-04-gallery/           brief: filterable gallery + lightbox (Plates)
├── week-05-06-quiz/              brief: quiz application (Quiz Arena)
└── week-07-08-capstone/          brief: interactive web application (TaskFlow)
```

Each project folder contains its own `README.md` with architecture, keyboard map, storage
schema, verification notes and an honest limitations section.
