/* TaskFlow data. Column names, the sample cards and the simulated sync
   transport. No DOM, no store; exposes window.TaskFlowData only. */
window.TaskFlowData = (function () {
  'use strict';

  /* ---------------------------------------------------------------- board */

  /* Fixed column order. `token` names the design-system custom property that
     colours the column: BACKLOG paper-dim, IN PROGRESS cyan, REVIEW gold,
     DONE acid. That mapping is used by cards, the timeline bars and the
     completion ring, and is never overridden anywhere else. */
  const COLUMNS = [
    { id: 'backlog', name: 'BACKLOG', token: 'paper-dim' },
    { id: 'progress', name: 'IN PROGRESS', token: 'cyan' },
    { id: 'review', name: 'REVIEW', token: 'gold' },
    { id: 'done', name: 'DONE', token: 'acid' }
  ];

  const PRIORITIES = [
    { id: 'high', name: 'HIGH', token: 'clay' },
    { id: 'normal', name: 'NORMAL', token: 'acid' },
    { id: 'low', name: 'LOW', token: 'cyan' }
  ];

  const PRIORITY_IDS = PRIORITIES.map((p) => p.id);
  const COLUMN_IDS = COLUMNS.map((c) => c.id);

  /* The six tags used by the sample cards. Rendered as .tag--<id> classes,
     so every id must stay a single lowercase CSS-safe word. */
  const TAGS = ['html', 'css', 'js', 'a11y', 'docs', 'git'];

  const WIP_LIMIT = 4;
  const TIMELINE_WEEKS = 8;
  const TIME_FMT = { hour: '2-digit', minute: '2-digit' };

  const SYNC = {
    latency: 1400, /* base duration of the simulated round trip, ms */
    jitter: 240, /* deterministic per-batch variance, ms */
    batchSize: 6, /* cards per Promise.all branch */
    label: 'REMOTE'
  };

  /* ------------------------------------------------------------ date utils */

  function pad2(value) {
    return String(value).padStart(2, '0');
  }

  function isoDate(date) {
    return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
  }

  /* YYYY-MM-DD `offset` days from today. Pinned to local noon so that a
     timezone shift or a daylight-saving boundary can never move a "due
     today" card into yesterday or tomorrow. */
  function localDayOffset(offset) {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return isoDate(date);
  }

  /* ISO timestamp `daysAgo` days back at hour:minute local time. */
  function stamp(daysAgo, hour, minute) {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    date.setHours(hour, minute, 0, 0);
    return date.toISOString();
  }

  /* ----------------------------------------------------------------- ids */

  let idSeq = 0;

  function makeId(prefix) {
    idSeq += 1;
    return prefix + '-' + Date.now().toString(36) + '-' + idSeq.toString(36);
  }

  function nextKey(cards) {
    let highest = 100;
    (cards || []).forEach((card) => {
      const value = parseInt(String(card.key).replace(/\D+/g, ''), 10);
      if (Number.isFinite(value) && value > highest) highest = value;
    });
    return 'NG-' + (highest + 1);
  }

  /* ---------------------------------------------------------- sample data */

  /* Every card below carries the column it currently sits in plus the `flow`
     of column transitions it went through to get there. The flow is what makes
     the insights panel honest: average cycle time per column and 7-day
     throughput are both computed from these timestamps, never faked.

     checklist entries are [text, done]. due uses localDayOffset() so the board
     always shows a live mix of overdue / due-today / upcoming / no-date. */

  /* SAMPLE BOARD: the cards below are demo content that ships with the app so
     the columns are not empty on first load. They are not a record of real
     work, and the "Reset to sample board" action restores exactly this set.

     Each card carries the column it currently sits in plus the `flow` of
     column transitions it went through to get there. The insights panel
     computes average cycle time per column and 7-day throughput from these
     timestamps, so the sample data exercises the real maths.

     checklist entries are [text, done]. due uses localDayOffset() so the board
     always shows a live mix of overdue / due-today / upcoming / no-date. */

  const SEED = [
    {
      key: 'NG-101',
      title: 'Create repository and first commit',
      notes:
        'Initialise the repo, add a .gitignore, and push one clean first commit instead of dropping the whole project in at once.',
      priority: 'high',
      tags: ['git', 'docs'],
      column: 'done',
      week: 1,
      span: 1,
      due: localDayOffset(-24),
      createdAt: stamp(27, 9, 15),
      checklist: [
        ['git init + first commit', true],
        ['Remote origin on GitHub', true],
        ['Branch protection on main', true],
        ['README stub', true]
      ],
      flow: [
        { at: stamp(26, 10, 5), column: 'progress' },
        { at: stamp(25, 15, 40), column: 'review' },
        { at: stamp(24, 17, 10), column: 'done' }
      ]
    },
    {
      key: 'NG-102',
      title: 'Responsive layout shell',
      notes:
        'Fluid grid with clamp() type. Breakpoints only where the layout actually has to change, not at device widths.',
      priority: 'high',
      tags: ['html', 'css'],
      column: 'done',
      week: 1,
      span: 2,
      due: localDayOffset(-20),
      createdAt: stamp(25, 9, 40),
      checklist: [
        ['Grid + gutters', true],
        ['Fluid headline scale', true],
        ['360px pass', true],
        ['768px pass', true],
        ['1440px pass', true]
      ],
      flow: [
        { at: stamp(24, 9, 30), column: 'progress' },
        { at: stamp(22, 16, 20), column: 'review' },
        { at: stamp(20, 11, 55), column: 'done' }
      ]
    },
    {
      key: 'NG-103',
      title: 'Task CRUD with local persistence',
      notes:
        'One state object, one update function. Mutating arrays in place makes renders unpredictable, so every change goes through the same path.',
      priority: 'normal',
      tags: ['js', 'html', 'css'],
      column: 'done',
      week: 2,
      span: 1,
      due: localDayOffset(-17),
      createdAt: stamp(19, 11, 5),
      checklist: [
        ['Add with validation', true],
        ['Delete + confirm', true],
        ['Edit inline', true],
        ['Persist to localStorage', true]
      ],
      flow: [
        { at: stamp(18, 13, 15), column: 'progress' },
        { at: stamp(17, 18, 30), column: 'done' }
      ]
    },
    {
      key: 'NG-104',
      title: 'Media gallery with lightbox',
      notes:
        'Filter chips with live counts, plus a lightbox that pages with the arrow keys. Focus handling is the part that needs care.',
      priority: 'high',
      tags: ['js', 'css', 'a11y'],
      column: 'done',
      week: 2,
      span: 2,
      due: localDayOffset(-14),
      createdAt: stamp(17, 10, 25),
      checklist: [
        ['Grid of generated SVG tiles', true],
        ['Tag filter + count', true],
        ['Lightbox open/close', true],
        ['Prev / next', true],
        ['Keyboard close on Escape', true],
        ['Reduced-motion respected', true]
      ],
      flow: [
        { at: stamp(16, 9, 45), column: 'progress' },
        { at: stamp(15, 14, 10), column: 'review' },
        { at: stamp(14, 16, 50), column: 'done' }
      ]
    },
    {
      key: 'NG-105',
      title: 'Form validation with inline errors',
      notes:
        'Validate on blur rather than on every keystroke, and show an error summary that takes focus when submit fails. Each message names its field.',
      priority: 'normal',
      tags: ['html', 'js', 'a11y'],
      column: 'review',
      week: 3,
      span: 2,
      due: localDayOffset(0),
      createdAt: stamp(14, 9, 20),
      checklist: [
        ['Question data model', true],
        ['Score tally', true],
        ['Per-field validation', true],
        ['Error summary + focus', true],
        ['Retry flow', true],
        ['Pass/fail copy pass', false]
      ],
      flow: [
        { at: stamp(13, 11, 0), column: 'progress' },
        { at: stamp(1, 9, 30), column: 'review' }
      ]
    },
    {
      key: 'NG-106',
      title: 'Scope the release and agree the cut list',
      notes:
        'One board, history, insights, offline-first. The calendar view and multi-user sharing are cut: neither fits the time available.',
      priority: 'normal',
      tags: ['docs'],
      column: 'done',
      week: 3,
      span: 1,
      due: localDayOffset(-12),
      createdAt: stamp(13, 14, 0),
      checklist: [
        ['Draft scope doc', true],
        ['Walk through the trade-offs', true],
        ['Agree the cut list', true]
      ],
      flow: [
        { at: stamp(13, 15, 30), column: 'progress' },
        { at: stamp(12, 10, 10), column: 'done' }
      ]
    },
    {
      key: 'NG-107',
      title: 'Focus trap for modal dialogs',
      notes:
        'Focus can escape to the page behind the dialog and the background still scrolls. Needs a real focus trap, a scroll lock and focus restored on close.',
      priority: 'high',
      tags: ['a11y', 'js'],
      column: 'progress',
      week: 4,
      span: 1,
      due: localDayOffset(-4),
      createdAt: stamp(12, 10, 40),
      checklist: [
        ['Trap Tab inside dialog', true],
        ['Restore focus on close', true],
        ['Lock background scroll', false],
        ['Return focus to the trigger', false],
        ['Test with a screen reader', false]
      ],
      flow: [{ at: stamp(4, 9, 50), column: 'progress' }]
    },
    {
      key: 'NG-108',
      title: 'Timeline view with week grouping',
      notes:
        'Group cards by week, draw a hairline rail and one mono bar per card. Bar width is the span, colour is the column; the data is the same as the board.',
      priority: 'normal',
      tags: ['js', 'css'],
      column: 'review',
      week: 5,
      span: 1,
      due: localDayOffset(2),
      createdAt: stamp(11, 9, 15),
      checklist: [
        ['Week groups from card data', true],
        ['Bar width = span', true],
        ['Column colour encoding', true],
        ['Mobile: rail scrolls with the row', false]
      ],
      flow: [
        { at: stamp(10, 10, 30), column: 'progress' },
        { at: stamp(1, 14, 45), column: 'review' }
      ]
    },
    {
      key: 'NG-109',
      title: 'Filter state in the URL hash',
      notes:
        'A filtered view has to survive reload and be pasteable into chat. Hash-only, no history entry per keystroke.',
      priority: 'low',
      tags: ['js'],
      column: 'review',
      week: 5,
      span: 1,
      due: localDayOffset(-2),
      createdAt: stamp(10, 15, 20),
      checklist: [
        ['Serialise filters to hash', true],
        ['Parse hash on boot', true],
        ['Loop guard on hashchange', false]
      ],
      flow: [
        { at: stamp(9, 9, 25), column: 'progress' },
        { at: stamp(2, 11, 40), column: 'review' }
      ]
    },
    {
      key: 'NG-110',
      title: 'Write README and architecture notes',
      notes:
        'Architecture, the action list, the keyboard map, the storage schema and the limitations. Written for whoever picks the project up next.',
      priority: 'normal',
      tags: ['docs'],
      column: 'backlog',
      week: 6,
      span: 1,
      due: localDayOffset(5),
      createdAt: stamp(9, 11, 10),
      checklist: [
        ['Outline the sections', true],
        ['Architecture section', false],
        ['Keyboard map table', false],
        ['Known limitations section', false]
      ],
      flow: []
    },
    {
      key: 'NG-112',
      title: 'Sprint retro - process changes',
      notes:
        'Noted that polish was happening before wiring. New rule: a card only leaves BACKLOG once it can be seen running.',
      priority: 'low',
      tags: ['docs'],
      column: 'done',
      week: 4,
      span: 1,
      due: localDayOffset(-8),
      createdAt: stamp(10, 16, 30),
      checklist: [
        ['Pull the notes together', true],
        ['One change to the working week', true]
      ],
      flow: [
        { at: stamp(10, 16, 50), column: 'progress' },
        { at: stamp(8, 9, 55), column: 'done' }
      ]
    },
    {
      key: 'NG-113',
      title: 'Design review round 2',
      notes: 'Second pass over the board. Notes: denser header, and the insights should be clickable rather than decorative.',
      priority: 'normal',
      tags: ['docs', 'css'],
      column: 'review',
      week: 6,
      span: 1,
      due: localDayOffset(1),
      createdAt: stamp(8, 10, 0),
      checklist: [
        ['Collect written feedback', true],
        ['Second walkthrough', false]
      ],
      flow: [
        { at: stamp(6, 11, 10), column: 'progress' },
        { at: stamp(1, 15, 5), column: 'review' }
      ]
    },
    {
      key: 'NG-114',
      title: 'Keyboard map + shortcuts dialog',
      notes:
        '/, n, g b, g t, ?, undo/redo. Every drag action needs a keyboard equivalent or it does not count as done.',
      priority: 'normal',
      tags: ['a11y', 'js'],
      column: 'progress',
      week: 6,
      span: 1,
      due: localDayOffset(0),
      createdAt: stamp(7, 9, 35),
      checklist: [
        ['Shortcut registry', true],
        ['Sequential g-prefix chords', true],
        ['? dialog', true],
        ['Announce moves in a live region', false]
      ],
      flow: [{ at: stamp(2, 13, 20), column: 'progress' }]
    },
    {
      key: 'NG-115',
      title: 'Insights metrics - cycle time + throughput',
      notes:
        'Cycle time comes from the activity log: the gap between entering a column and leaving it. Throughput is completions per day for the last seven.',
      priority: 'normal',
      tags: ['js'],
      column: 'progress',
      week: 6,
      span: 2,
      due: localDayOffset(0),
      createdAt: stamp(7, 14, 15),
      checklist: [
        ['Cycle time per column', true],
        ['7-day throughput', true],
        ['Per-tag completion bars', false],
        ['Busiest week', false],
        ['Every insight clickable', false]
      ],
      flow: [{ at: stamp(3, 10, 5), column: 'progress' }]
    },
    {
      key: 'NG-116',
      title: 'Colour contrast audit',
      notes:
        'Check every text and border pair against WCAG. Acid on paper fails badly and is used in several places; acid becomes dark-surface only, and the light theme gets a darker lime.',
      priority: 'high',
      tags: ['a11y', 'css'],
      column: 'backlog',
      week: 7,
      span: 1,
      due: localDayOffset(1),
      createdAt: stamp(5, 10, 25),
      checklist: [
        ['Body text >= 4.5:1', false],
        ['UI borders >= 3:1', false],
        ['Focus ring on every control', false]
      ],
      flow: []
    },
    {
      key: 'NG-117',
      title: 'Touch path for drag-and-drop',
      notes:
        'HTML5 drag events do nothing on touch. Long-press to lift, pointer capture, elementFromPoint to find the column, then the same reducer action as the mouse path.',
      priority: 'high',
      tags: ['js'],
      column: 'progress',
      week: 7,
      span: 1,
      due: localDayOffset(1),
      createdAt: stamp(5, 13, 40),
      checklist: [
        ['Long-press to lift', true],
        ['Drop gap opens on drag-over', true],
        ['FLIP slide for neighbours', false],
        ['Works at 360px', false]
      ],
      flow: [{ at: stamp(1, 9, 30), column: 'progress' }]
    },
    {
      key: 'NG-118',
      title: 'Cross-browser QA - Firefox + Safari',
      notes: 'Safari is the interesting one: pointer capture on a scrolling list, and history.replaceState on file://.',
      priority: 'normal',
      tags: ['js'],
      column: 'backlog',
      week: 7,
      span: 1,
      due: localDayOffset(6),
      createdAt: stamp(4, 11, 50),
      checklist: [
        ['Firefox pass', false],
        ['Safari pass', false],
        ['file:// smoke test', false],
        ['Reduced-motion pass', false],
        ['Keyboard-only pass', false]
      ],
      flow: []
    },
    {
      key: 'NG-119',
      title: 'Deploy to GitHub Pages',
      notes: 'Static folder, no build. The only external request is the two Google Fonts families, and the page still reads correctly without them.',
      priority: 'normal',
      tags: ['git', 'docs'],
      column: 'backlog',
      week: 8,
      span: 1,
      due: localDayOffset(12),
      createdAt: stamp(3, 15, 15),
      checklist: [
        ['Relative paths only', false],
        ['Pages branch + folder', false],
        ['Offline font fallback check', false],
        ['Share the staging link', false]
      ],
      flow: []
    },
    {
      key: 'NG-120',
      title: 'Spacing and radius audit',
      notes: 'Radius 0 everywhere except pills. No shadows. Depth comes from surface steps and hairlines only.',
      priority: 'low',
      tags: ['css'],
      column: 'progress',
      week: 7,
      span: 1,
      due: null,
      createdAt: stamp(4, 9, 5),
      checklist: [
        ['Kill the remaining shadows', true],
        ['Normalise the gutter', false]
      ],
      flow: [{ at: stamp(2, 16, 45), column: 'progress' }]
    },
    {
      key: 'NG-121',
      title: 'Undo / redo command stack',
      notes:
        'Every mutation carries its own inverse, so history is 80 entries deep and the header can name the next undoable action.',
      priority: 'normal',
      tags: ['js'],
      column: 'done',
      week: 6,
      span: 1,
      due: localDayOffset(-3),
      createdAt: stamp(8, 11, 30),
      checklist: [
        ['Pure reducer', true],
        ['Invert(action, prevState)', true],
        ['Named undo labels', true],
        ['80-entry limit', true]
      ],
      flow: [
        { at: stamp(7, 13, 10), column: 'progress' },
        { at: stamp(4, 17, 25), column: 'review' },
        { at: stamp(3, 12, 0), column: 'done' }
      ]
    },
    {
      key: 'NG-123',
      title: 'Demo script and release notes',
      notes: 'Three minutes: drag a card, move it with the keyboard, undo it, then show the insights panel filling in.',
      priority: 'high',
      tags: ['docs'],
      column: 'backlog',
      week: 8,
      span: 1,
      due: localDayOffset(14),
      createdAt: stamp(2, 10, 45),
      checklist: [
        ['Rehearse the drag story', false],
        ['Rehearse the keyboard story', false],
        ['Reset the demo board', false],
        ['Prepare three questions', false],
        ['Screenshot the insights panel', false],
        ['Check projector contrast', false]
      ],
      flow: []
    }
  ];

  /* localDayOffset / stamp are the only two date helpers the seed uses, so
     every relative date stays correct no matter when the page is opened. */

  /* Derive the activity log for one card from its declarative spec. Order is
     guaranteed ascending: created, then every flow transition, then completion
     and checklist notes. Cycle-time maths in app.js depends on that order. */
  function buildActivity(spec) {
    const rows = [
      { id: spec.key + '-a0', type: 'created', at: spec.createdAt, text: 'Created in BACKLOG' }
    ];

    let previous = 'backlog';
    spec.flow.forEach((step) => {
      rows.push({
        id: spec.key + '-a' + rows.length,
        type: 'moved',
        at: step.at,
        from: previous,
        to: step.column,
        text: 'Moved ' + columnName(previous) + ' → ' + columnName(step.column)
      });
      previous = step.column;
    });

    if (spec.column === 'done') {
      const at = spec.flow.length ? spec.flow[spec.flow.length - 1].at : spec.createdAt;
      rows.push({ id: spec.key + '-a' + rows.length, type: 'completed', at: at, text: 'Marked complete' });
    }

    const doneCount = spec.checklist.filter((item) => item[1]).length;
    if (doneCount > 0 && doneCount < spec.checklist.length) {
      /* Anchor the checklist note to the last hop before the card's current
         column instead of "now", so a card finished three weeks ago does not
         grow a log entry dated today. */
      const anchor = spec.flow.length ? spec.flow[Math.max(0, spec.flow.length - 2)].at : spec.createdAt;
      rows.push({
        id: spec.key + '-a' + rows.length,
        type: 'checklist',
        at: anchor,
        text: 'Checklist ' + doneCount + '/' + spec.checklist.length
      });
    }

    return rows.sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  }

  function columnName(id) {
    const found = COLUMNS.find((column) => column.id === id);
    return found ? found.name : String(id).toUpperCase();
  }

  function buildSeedCards() {
    return SEED.map((spec) => ({
      key: spec.key,
      title: spec.title,
      notes: spec.notes,
      priority: spec.priority,
      tags: spec.tags.slice(),
      column: spec.column,
      due: spec.due,
      week: spec.week,
      span: spec.span,
      checklist: spec.checklist.map((item, index) => ({
        id: spec.key + '-t' + (index + 1),
        text: item[0],
        done: item[1]
      })),
      activity: buildActivity(spec),
      createdAt: spec.createdAt,
      updatedAt: spec.flow.length ? spec.flow[spec.flow.length - 1].at : spec.createdAt
    }));
  }

  let seedCache = null;

  function seedCards() {
    if (!seedCache) seedCache = buildSeedCards();
    return seedCache;
  }

  /* --------------------------------------------------- schema guard (v1) */

  const CARD_FIELDS = ['key', 'title', 'column', 'priority', 'tags', 'checklist', 'activity'];

  function validateBoard(value) {
    const errors = [];

    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return { ok: false, errors: ['Root value is not an object.'], board: null };
    }
    if (!Array.isArray(value.cards)) {
      return { ok: false, errors: ['"cards" is missing or is not an array.'], board: null };
    }

    const seen = new Set();

    value.cards.forEach((card, index) => {
      const at = 'cards[' + index + ']';
      if (!card || typeof card !== 'object') {
        errors.push(at + ' is not an object.');
        return;
      }
      CARD_FIELDS.forEach((field) => {
        if (card[field] === undefined || card[field] === null) errors.push(at + '.' + field + ' is missing.');
      });
      if (typeof card.key !== 'string' || !card.key.trim()) {
        errors.push(at + '.key must be a non-empty string.');
      } else if (seen.has(card.key)) {
        errors.push(at + '.key "' + card.key + '" is duplicated.');
      } else {
        seen.add(card.key);
      }
      if (typeof card.title !== 'string' || !card.title.trim()) {
        errors.push(at + '.title must be a non-empty string.');
      }
      if (COLUMN_IDS.indexOf(card.column) === -1) errors.push(at + '.column "' + card.column + '" is unknown.');
      if (PRIORITY_IDS.indexOf(card.priority) === -1) errors.push(at + '.priority "' + card.priority + '" is unknown.');
      if (!Array.isArray(card.tags)) {
        errors.push(at + '.tags must be an array.');
      } else {
        card.tags.forEach((tag) => {
          if (typeof tag !== 'string') errors.push(at + '.tags contains a non-string.');
        });
      }
      if (!Array.isArray(card.checklist)) {
        errors.push(at + '.checklist must be an array.');
      } else {
        card.checklist.forEach((item, itemIndex) => {
          if (!item || typeof item.text !== 'string') errors.push(at + '.checklist[' + itemIndex + '] needs a text string.');
        });
      }
      if (!Array.isArray(card.activity)) {
        errors.push(at + '.activity must be an array.');
      } else {
        card.activity.forEach((row, rowIndex) => {
          if (!row || typeof row.text !== 'string' || Number.isNaN(Date.parse(row.at))) {
            errors.push(at + '.activity[' + rowIndex + '] needs text and a parseable timestamp.');
          }
        });
      }
    });

    if (errors.length) return { ok: false, errors: errors, board: null };

    /* Normalise on the way through so downstream code never has to re-check
       optional fields. Only the shape is repaired — values are preserved. */
    const board = {
      cards: value.cards.map((card) => ({
        key: card.key,
        title: card.title,
        notes: typeof card.notes === 'string' ? card.notes : '',
        priority: card.priority,
        tags: card.tags.slice(),
        column: card.column,
        due: typeof card.due === 'string' && card.due ? card.due : null,
        week: Number.isFinite(card.week) ? card.week : 1,
        span: Number.isFinite(card.span) ? card.span : 1,
        checklist: card.checklist.map((item, index) => ({
          id: typeof item.id === 'string' && item.id ? item.id : makeId('t'),
          text: item.text,
          done: item.done === true
        })),
        activity: card.activity.map((row, rowIndex) => ({
          id: typeof row.id === 'string' && row.id ? row.id : makeId('a' + rowIndex),
          type: typeof row.type === 'string' ? row.type : 'edited',
          at: row.at,
          from: typeof row.from === 'string' ? row.from : null,
          to: typeof row.to === 'string' ? row.to : null,
          text: row.text
        })),
        createdAt: typeof card.createdAt === 'string' ? card.createdAt : card.activity[0].at,
        updatedAt: typeof card.updatedAt === 'string' ? card.updatedAt : card.activity[card.activity.length - 1].at
      })),
      filters: normaliseFilters(value.filters),
      view: value.view === 'timeline' ? 'timeline' : 'board',
      theme: value.theme === 'light' ? 'light' : 'dark'
    };

    return { ok: true, errors: [], board: board };
  }

  function normaliseFilters(filters) {
    const source = filters && typeof filters === 'object' ? filters : {};
    const list = (value, allowed) =>
      Array.isArray(value) ? value.filter((item) => allowed.indexOf(item) !== -1) : [];
    return {
      query: typeof source.query === 'string' ? source.query.slice(0, 120) : '',
      priorities: list(source.priorities, PRIORITY_IDS),
      tags: list(source.tags, TAGS),
      overdueOnly: source.overdueOnly === true,
      showDone: source.showDone !== false
    };
  }

  /* ------------------------------------------------ simulated sync (async) */

  /* Sentinel resolved in place of a value when a batch is cancelled, so that
     cancelling always settles every promise instead of leaving them pending. */
  const CANCELLED = { cancelled: true };

  const inFlight = [];

  function wait(ms) {
    let timer = 0;
    let resolveFn = null;
    const promise = new Promise((resolve) => {
      resolveFn = resolve;
      timer = setTimeout(() => resolve(undefined), ms);
    });
    promise.cancel = () => {
      clearTimeout(timer);
      const index = inFlight.indexOf(promise);
      if (index !== -1) inFlight.splice(index, 1);
      resolveFn(CANCELLED);
    };
    inFlight.push(promise);
    return promise;
  }

  function chunk(list, size) {
    const batches = [];
    for (let index = 0; index < list.length; index += size) {
      batches.push(list.slice(index, index + size));
    }
    return batches;
  }

  function cancelledError() {
    const error = new Error('Sync superseded by a newer request.');
    error.code = 'SYNC_CANCELLED';
    return error;
  }

  /* One simulated PUT. `options.fail` is read when the batch settles rather
     than when it starts, so the app can flip the failure-injection toggle
     mid-flight and still hit the error path. */
  function writeBatch(batch, options) {
    const latency = SYNC.latency + ((batch.length * 37) % SYNC.jitter);
    return wait(latency).then((token) => {
      if (token === CANCELLED) return { cancelled: true };
      if (options.fail) {
        const error = new Error(SYNC.label + ' rejected the batch (simulated 503).');
        error.code = 'SYNC_REMOTE_REJECTED';
        throw error;
      }
      return { cancelled: false, written: batch.length };
    });
  }

  /* Batched upload: the board is split into batches that all go out
     concurrently under a single Promise.all. The first rejection wins, which
     is what a real partial-failure handler would do. */
  async function syncAll(cards, options) {
    const opts = options || {};
    const target = opts.target || 'CLOUD';
    const batches = chunk(cards || [], SYNC.batchSize);
    if (!batches.length) return { batches: 0, written: 0, target: target };

    const results = await Promise.all(
      batches.map((batch) =>
        writeBatch(batch, opts).then(
          (result) => (result.cancelled ? { cancelled: true } : { cancelled: false, count: result.written }),
          (error) => ({ cancelled: false, error: error })
        )
      )
    );

    if (results.every((result) => result.cancelled)) throw cancelledError();

    const failure = results.find((result) => result.error);
    if (failure) {
      failure.error.target = target;
      throw failure.error;
    }

    return {
      batches: batches.length,
      written: results.reduce((total, result) => total + (result.count || 0), 0),
      target: target
    };
  }

  /* Called when a newer sync supersedes this one. Everything settles, so no
     promise is ever left dangling. */
  function cancelSync() {
    const pending = inFlight.slice();
    inFlight.length = 0;
    pending.forEach((promise) => {
      if (typeof promise.cancel === 'function') promise.cancel();
    });
  }

  return {
    COLUMNS: COLUMNS,
    COLUMN_IDS: COLUMN_IDS,
    PRIORITIES: PRIORITIES,
    PRIORITY_IDS: PRIORITY_IDS,
    TAGS: TAGS,
    WIP_LIMIT: WIP_LIMIT,
    TIMELINE_WEEKS: TIMELINE_WEEKS,
    TIME_FMT: TIME_FMT,
    SYNC: SYNC,
    localDayOffset: localDayOffset,
    stamp: stamp,
    makeId: makeId,
    nextKey: nextKey,
    columnName: columnName,
    buildSeedCards: buildSeedCards,
    seedCards: seedCards,
    normaliseFilters: normaliseFilters,
    validateBoard: validateBoard,
    syncAll: syncAll,
    cancelSync: cancelSync
  };
})();
