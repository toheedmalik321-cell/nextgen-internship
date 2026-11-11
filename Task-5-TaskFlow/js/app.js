/* TaskFlow app. State lives in store.js; this file turns events into actions
   and renders whatever state comes back. No DOM reads inside handlers. */
(function () {
  'use strict';

  const Data = window.TaskFlowData;
  const Store = window.TaskFlowStore;

  /* =======================================================================
     1. DOM
     ===================================================================== */
  const $ = (sel, scope) => (scope || document).querySelector(sel);
  const $$ = (sel, scope) => Array.from((scope || document).querySelectorAll(sel));

  const el = {
    html: document.documentElement,
    body: document.body,

    viewTabs: $('#viewtabs'),
    tabBoard: $('#tab-board'),
    tabTimeline: $('#tab-timeline'),
    syncBtn: $('#btn-sync'),
    syncLabel: $('#sync-label'),
    undo: $('#btn-undo'),
    redo: $('#btn-redo'),
    theme: $('#btn-theme'),
    settings: $('#btn-settings'),
    help: $('#btn-help'),

    metricCards: $('#metric-cards'),
    metricDone: $('#metric-done'),
    metricOverdue: $('#metric-overdue'),
    metricHistory: $('#metric-history'),
    nextAction: $('#next-action'),
    flash: $('#board-flash'),

    query: $('#f-query'),
    priorities: $('#f-priorities'),
    tags: $('#f-tags'),
    overdue: $('#f-overdue'),
    showDone: $('#f-done'),
    clear: $('#f-clear'),
    count: $('#f-count'),

    viewBoard: $('#view-board'),
    viewTimeline: $('#view-timeline'),
    board: $('#board'),
    skeleton: $('#board-skeleton'),
    timeline: $('#timeline'),

    live: $('#live-region'),
    alert: $('#alert-region'),
    affordance: $('#card-affordance'),

    insightMetrics: $('#insight-metrics'),
    ringFill: $('#ring-fill'),
    ringValue: $('#ring-value'),
    ringNote: $('#ring-note'),
    throughput: $('#throughput'),
    cycleList: $('#cycle-list'),
    tagBars: $('#tag-bars'),
    insightList: $('#insight-list'),

    storageState: $('#storage-state'),
    storageReadout: $('#storage-readout'),

    overlay: $('#overlay'),
    scrim: $('#overlay-scrim'),
    dialog: $('#dialog'),
    dialogEyebrow: $('#dialog-eyebrow'),
    dialogTitle: $('#dialog-title'),
    dialogClose: $('#dialog-close'),
    dialogBody: $('#dialog-body'),
    dialogFoot: $('#dialog-foot'),

    fileImport: $('#file-import'),
    toasts: $('#toast-region')
  };

  /* UI-only state. Anything that must survive a reload lives in the store. */
  const ui = {
    composerFor: null,
    dragKey: null,
    dropColumn: null,
    dropIndex: null,
    dialog: null,
    lastFocus: null,
    editingCheck: null,
    focusedKey: null
  };

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const today = () => Data.localDayOffset(0);

  /* =======================================================================
     2. FORMATTING
     ===================================================================== */

  function fmtTime(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString('en-GB', Data.TIME_FMT);
  }

  function fmtDay(iso) {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  }

  function dueLabel(card) {
    if (!card.due) return { text: 'No due date', state: 'none' };
    const diff = daysBetween(card.due, today());
    if (diff < 0) return { text: 'Overdue · ' + fmtDay(card.due), state: 'overdue' };
    if (diff === 0) return { text: 'Due today', state: 'today' };
    if (diff === 1) return { text: 'Due tomorrow', state: 'soon' };
    return { text: 'Due ' + fmtDay(card.due), state: 'soon' };
  }

  function daysBetween(fromIso, toIso) {
    const a = Date.parse(fromIso + 'T00:00:00');
    const b = Date.parse(toIso + 'T00:00:00');
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.round((b - a) / 86400000);
  }

  function bytes(n) {
    if (n < 1024) return n + ' B';
    return (n / 1024).toFixed(1) + ' KB';
  }

  /* =======================================================================
     3. DOM BUILDERS
     Every string that can contain user input goes in through textContent.
     ===================================================================== */

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined && text !== null) element.textContent = String(text);
    return element;
  }

  function button(className, label, action, attrs) {
    const b = node('button', className, label);
    b.type = 'button';
    b.setAttribute('data-action', action);
    Object.assign(b, attrs || {});
    return b;
  }

  function progressBar(percent, prio) {
    const wrap = node('span', 'bar');
    if (prio) wrap.style.setProperty('--prio', 'var(--' + prio + ')');
    const fill = node('span', 'bar__fill');
    fill.style.setProperty('--pct', percent + '%');
    wrap.appendChild(fill);
    return wrap;
  }

  /* =======================================================================
     4. FILTERING
     ===================================================================== */

  function matchesFilters(card, filters) {
    if (!filters.showDone && card.column === 'done') return false;

    if (filters.priorities.length && !filters.priorities.includes(card.priority)) return false;

    if (filters.tags.length) {
      const hit = filters.tags.every((tag) => card.tags.includes(tag));
      if (!hit) return false;
    }

    if (filters.overdueOnly && !Store.isOverdue(card, today())) return false;

    const query = filters.query.trim().toLowerCase();
    if (query) {
      const haystack = (card.key + ' ' + card.title + ' ' + card.notes + ' ' + card.tags.join(' ')).toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  }

  function columnCards(state, column) {
    return state.cards.filter((card) => card.column === column);
  }

  function visibleCards(state, column) {
    return columnCards(state, column).filter((card) => matchesFilters(card, state.filters));
  }

  /* =======================================================================
     5. BOARD RENDER
     ===================================================================== */

  function buildCard(card, state) {
    const ratio = Store.checklistRatio(card);
    const overdue = Store.isOverdue(card, today());
    const due = dueLabel(card);

    const article = node('article', 'card');
    article.setAttribute('data-key', card.key);
    article.setAttribute('data-priority', card.priority);
    article.setAttribute('data-column', card.column);
    /* Roving tabindex: the board is one tab stop, not one per card. Exactly one
       card is tabbable at a time (see applyRovingTabindex). */
    article.setAttribute('tabindex', '-1');
    article.setAttribute('role', 'button');
    article.setAttribute('aria-describedby', 'card-affordance');
    article.setAttribute('aria-label', card.key + ': ' + card.title + ', ' + Data.columnName(card.column));
    article.draggable = true;
    if (overdue) article.classList.add('is-overdue');

    const top = node('div', 'card__top');
    top.append(node('span', 'card__key', card.key), node('span', 'card__prio', card.priority));

    const title = node('h3', 'card__title', card.title);

    article.append(top, title);

    if (card.notes) article.append(node('p', 'card__notes', card.notes));

    if (card.tags.length) {
      const tags = node('div', 'card__tags');
      card.tags.forEach((tag) => {
        tags.appendChild(node('span', 'tag tag--' + tag, tag));
      });
      article.appendChild(tags);
    }

    if (ratio.total) {
      const progress = node('div', 'card__progress');
      progress.append(progressBar(ratio.percent, card.priority), node('span', 'card__ratio', ratio.done + '/' + ratio.total));
      article.appendChild(progress);
    }

    const foot = node('div', 'card__foot');
    const dueEl = node('span', 'card__due', due.text);
    dueEl.setAttribute('data-state', due.state);
    foot.append(dueEl, node('span', 'org', 'W' + card.week));
    article.appendChild(foot);

    return article;
  }

  function buildComposer(column) {
    const wrap = node('div', 'composer');
    const toggle = node('button', 'composer__toggle');
    toggle.type = 'button';
    toggle.setAttribute('data-action', 'composer-toggle');
    toggle.setAttribute('data-column', column);
    toggle.setAttribute('aria-expanded', ui.composerFor === column ? 'true' : 'false');
    toggle.append(node('span', null, '+'), node('span', null, 'New card in ' + Data.columnName(column)));

    const panel = node('div', 'composer__panel');
    panel.hidden = ui.composerFor !== column;

    const input = node('input', 'composer__input');
    input.type = 'text';
    input.placeholder = 'Card title…';
    input.maxLength = 120;
    input.setAttribute('data-role', 'composer-input');
    input.setAttribute('data-column', column);
    input.setAttribute('aria-label', 'Title for the new card in ' + Data.columnName(column));

    const actions = node('div', 'composer__actions');
    const add = button('btn btn--primary btn--sm', 'Add', 'composer-add');
    add.setAttribute('data-column', column);
    const cancel = button('btn btn--ghost btn--sm', 'Cancel', 'composer-cancel');
    cancel.setAttribute('data-column', column);
    actions.append(add, cancel);

    panel.append(input, actions);
    wrap.append(toggle, panel);

    if (ui.composerFor === column) {
      window.requestAnimationFrame(() => input.focus());
    }
    return wrap;
  }

  function buildColumn(column, state) {
    const all = columnCards(state, column.id);
    const shown = visibleCards(state, column.id);
    const ratio = Store.checklistRatio({ checklist: all.flatMap((card) => card.checklist) });

    const section = node('section', 'col');
    section.setAttribute('data-column', column.id);
    section.setAttribute('aria-label', Data.columnName(column.id));

    const head = node('header', 'col__head');
    const name = node('h2', 'col__name', column.name);
    const stat = node('span', 'col__stat');
    stat.append(node('span', 'col__count', String(shown.length)));
    stat.append(node('span', 'col__count-total', ' / ' + all.length));

    const wip = node('span', 'col__wip', 'WIP ' + all.length + '/' + Data.WIP_LIMIT);
    if (all.length >= Data.WIP_LIMIT) {
      wip.setAttribute('data-level', 'warn');
      section.classList.add('col--busy');
    }

    head.append(name, stat, wip);

    const rule = node('div', 'col__rule');
    rule.setAttribute('aria-hidden', 'true');

    const list = node('div', 'col__list');
    list.setAttribute('data-column', column.id);

    if (!all.length) {
      list.appendChild(node('p', 'col__empty', 'Empty'));
    } else if (!shown.length) {
      const empty = node('p', 'col__empty', 'No matches');
      list.appendChild(empty);
    } else {
      shown.forEach((card) => list.appendChild(buildCard(card, state)));
    }

    list.appendChild(buildDropGap(column.id));
    list.appendChild(buildComposer(column.id));

    section.append(head, rule, list);
    section.setAttribute('data-ratio', ratio.percent + '%');
    return section;
  }

  function buildDropGap(column) {
    const gap = node('div', 'dropgap');
    gap.setAttribute('data-column', column);
    return gap;
  }

  /* ---- FLIP: measure, mutate, invert, play ------------------------------ */

  function renderBoard(state) {
    const previous = new Map();
    $$('.card', el.board).forEach((card) => {
      previous.set(card.getAttribute('data-key'), card.getBoundingClientRect());
    });

    const frag = document.createDocumentFragment();
    Data.COLUMNS.forEach((column) => frag.appendChild(buildColumn(column, state)));
    el.board.textContent = '';
    el.board.appendChild(frag);

    applyRovingTabindex(ui.focusedKey);

    if (reduceMotion) return;

    $$('.card', el.board).forEach((card) => {
      const before = previous.get(card.getAttribute('data-key'));
      if (!before) {
        card.classList.add('is-entering');
        return;
      }
      const after = card.getBoundingClientRect();
      const dx = before.left - after.left;
      const dy = before.top - after.top;
      if (!dx && !dy) return;
      card.classList.add('is-flipping');
      card.style.setProperty('--fx', dx + 'px');
      card.style.setProperty('--fy', dy + 'px');
      window.requestAnimationFrame(() => {
        card.style.setProperty('--fx', '0px');
        card.style.setProperty('--fy', '0px');
      });
    });
  }

  function renderSkeleton(show) {
    if (!show) {
      el.skeleton.textContent = '';
      return;
    }
    const frag = document.createDocumentFragment();
    Data.COLUMNS.forEach((column) => {
      const col = node('div', 'skelcol');
      col.appendChild(node('div', 'skelcol__head'));
      for (let i = 0; i < 3; i += 1) col.appendChild(node('div', 'skelcol__row'));
      frag.appendChild(col);
    });
    el.skeleton.textContent = '';
    el.skeleton.appendChild(frag);
  }

  /* =======================================================================
     6. FILTER RAIL
     ===================================================================== */

  function renderFilters(state) {
    const filters = state.filters;

    el.priorities.textContent = '';
    Data.PRIORITIES.forEach((priority) => {
      const chip = node('button', 'chip', priority.name);
      chip.type = 'button';
      chip.setAttribute('data-action', 'filter-priority');
      chip.setAttribute('data-value', priority.id);
      chip.setAttribute('aria-pressed', filters.priorities.includes(priority.id) ? 'true' : 'false');
      if (filters.priorities.includes(priority.id)) chip.classList.add('is-on');
      el.priorities.appendChild(chip);
    });

    el.tags.textContent = '';
    Data.TAGS.forEach((tag) => {
      const chip = node('button', 'chip', tag);
      chip.type = 'button';
      chip.setAttribute('data-action', 'filter-tag');
      chip.setAttribute('data-value', tag);
      chip.setAttribute('aria-pressed', filters.tags.includes(tag) ? 'true' : 'false');
      if (filters.tags.includes(tag)) chip.classList.add('is-on');
      el.tags.appendChild(chip);
    });

    el.overdue.setAttribute('aria-pressed', filters.overdueOnly ? 'true' : 'false');
    el.overdue.classList.toggle('is-on', filters.overdueOnly);
    el.showDone.setAttribute('aria-pressed', filters.showDone ? 'true' : 'false');
    el.showDone.classList.toggle('is-on', filters.showDone);

    if (el.query.value !== filters.query) el.query.value = filters.query;

    const shown = state.cards.filter((card) => matchesFilters(card, filters)).length;
    el.count.textContent = shown + ' / ' + state.cards.length + ' cards';
  }

  /* =======================================================================
     7. HEADER METRICS
     ===================================================================== */

  function renderHeader(state) {
    const done = state.cards.filter((card) => card.column === 'done').length;
    const overdue = state.cards.filter((card) => Store.isOverdue(card, today())).length;
    const depth = Store.historyDepth();

    el.metricCards.textContent = String(state.cards.length);
    el.metricDone.textContent = String(done);
    el.metricOverdue.textContent = String(overdue);
    el.metricHistory.textContent = String(depth.past);

    el.nextAction.textContent = Store.canUndo() ? Store.nextUndoLabel() : 'Nothing to undo';

    el.undo.disabled = !Store.canUndo();
    el.redo.disabled = !Store.canRedo();
    el.undo.title = Store.canUndo() ? 'Undo ' + Store.nextUndoLabel() : 'Nothing to undo';
    el.redo.title = Store.canRedo() ? 'Redo ' + Store.nextRedoLabel() : 'Nothing to redo';

    const sync = state.sync;
    el.syncBtn.setAttribute('data-state', sync.status);
    el.syncLabel.textContent =
      sync.status === 'syncing' ? 'Syncing' : sync.status === 'synced' ? 'Synced' : sync.status === 'error' ? 'Error' : 'Offline';
    el.syncBtn.disabled = sync.status === 'syncing';

    el.storageState.textContent = Store.STORAGE_KEY;
    el.storageReadout.textContent = bytes(Store.storageBytes());

    el.html.setAttribute('data-theme', state.theme);
    el.theme.setAttribute('aria-pressed', state.theme === 'light' ? 'true' : 'false');
    el.theme.setAttribute('aria-label', state.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme');
  }

  /* =======================================================================
     8. TIMELINE
     ===================================================================== */

  function renderTimeline(state) {
    el.timeline.textContent = '';
    const weeks = Data.TIMELINE_WEEKS;
    const width = 100 / weeks;

    for (let week = 1; week <= weeks; week += 1) {
      const rows = state.cards.filter((card) => card.week === week);
      if (!rows.length) continue;

      const group = node('section', 'tlgroup');
      const meta = node('div', 'tlgroup__meta');
      meta.append(node('h3', 'tlgroup__title', 'Week ' + week), node('p', 'micro micro--dim', rows.length + ' card' + (rows.length === 1 ? '' : 's')));

      const list = node('div', 'tlgroup__list');
      rows.forEach((card) => {
        const row = node('div', 'tlrow');
        const span = Math.max(1, Math.min(card.span || 1, weeks - week + 1));

        const track = node('span', 'tlrow__track');
        const bar = node('span', 'tlrow__bar');
        bar.setAttribute('data-column', card.column);
        bar.style.setProperty('--pct', (span * width).toFixed(3) + '%');
        track.appendChild(bar);

        const column = node('span', 'tlrow__col', Data.columnName(card.column));

        row.append(node('span', 'tlrow__key', card.key), node('span', 'tlrow__title', card.title), track, column);
        row.setAttribute('data-action', 'card-open');
        row.setAttribute('data-key', card.key);
        row.setAttribute('tabindex', '0');
        row.setAttribute('role', 'button');
        row.setAttribute('aria-label', 'Open ' + card.key + ': ' + card.title);

        list.appendChild(row);
      });

      group.append(meta, list);
      el.timeline.appendChild(group);
    }

    if (!el.timeline.children.length) {
      el.timeline.appendChild(node('p', 'empty__text', 'No cards to plot.'));
    }
  }

  /* =======================================================================
     9. INSIGHTS
     ===================================================================== */

  function throughputByDay(state) {
    const buckets = new Map();
    for (let back = 6; back >= 0; back -= 1) {
      buckets.set(Data.localDayOffset(-back), { iso: Data.localDayOffset(-back), count: 0 });
    }
    state.cards.forEach((card) => {
      card.activity.forEach((row) => {
        if (row.type !== 'moved' || row.to !== 'done') return;
        const day = String(row.at).slice(0, 10);
        if (buckets.has(day)) buckets.get(day).count += 1;
      });
    });
    return Array.from(buckets.values());
  }

  function averageCycleDays(state) {
    const totals = new Map();
    state.cards.forEach((card) => {
      const stamps = card.activity
        .filter((row) => row.type === 'moved' && row.at)
        .map((row) => ({ column: row.to, at: row.at }))
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

      for (let i = 1; i < stamps.length; i += 1) {
        const from = stamps[i - 1];
        const to = stamps[i];
        if (from.column === to.column) continue;
        const hours = (Date.parse(to.at) - Date.parse(from.at)) / 3600000;
        if (!Number.isFinite(hours) || hours < 0) continue;
        const list = totals.get(from.column) || [];
        list.push(hours);
        totals.set(from.column, list);
      }
    });

    return Array.from(totals.entries()).map(([column, list]) => ({
      column: column,
      average: list.reduce((sum, value) => sum + value, 0) / list.length,
      samples: list.length
    }));
  }

  function renderMetrics(state) {
    const done = state.cards.filter((card) => card.column === 'done').length;
    const percent = state.cards.length ? Math.round((done / state.cards.length) * 100) : 0;

    const cards = [
      { label: 'Cards', value: state.cards.length, sub: 'in the store' },
      { label: 'Backlog', value: state.cards.filter((c) => c.column === 'backlog').length, sub: 'not started' },
      { label: 'In progress', value: state.cards.filter((c) => c.column === 'progress').length, sub: 'WIP limit ' + Data.WIP_LIMIT },
      { label: 'Review', value: state.cards.filter((c) => c.column === 'review').length, sub: 'awaiting sign-off' },
      { label: 'Done', value: done, sub: percent + '% complete' },
      { label: 'Overdue', value: state.cards.filter((c) => Store.isOverdue(c, today())).length, sub: 'past due date', alert: true },
      { label: 'Checklist', value: Store.checklistRatio({ checklist: state.cards.flatMap((c) => c.checklist) }).percent + '%', sub: 'items ticked' }
    ];

    el.insightMetrics.textContent = '';
    cards.forEach((metric) => {
      const item = node('li', 'metric' + (metric.alert && Number(metric.value) > 0 ? ' metric--alert' : ''));
      item.append(node('p', 'metric__label', metric.label), node('p', 'metric__value', metric.value), node('p', 'metric__sub', metric.sub));
      el.insightMetrics.appendChild(item);
    });

    const circumference = 2 * Math.PI * 58;
    el.ringFill.style.strokeDasharray = circumference.toFixed(1);
    el.ringFill.style.strokeDashoffset = (circumference * (1 - percent / 100)).toFixed(1);
    el.ringValue.textContent = percent + '%';
    el.ringNote.textContent = done
      ? done + ' of ' + state.cards.length + ' cards finished.'
      : 'Nothing finished yet.';
  }

  function renderThroughput(state) {
    const rows = throughputByDay(state);
    const max = Math.max(1, ...rows.map((row) => row.count));

    el.throughput.textContent = '';
    rows.forEach((row) => {
      const item = node('li', 'barrow');
      item.append(node('span', 'barrow__label', fmtDay(row.iso + 'T00:00:00')));

      const track = node('span', 'barrow__track');
      const fill = node('span', 'barrow__fill');
      fill.style.setProperty('--pct', ((row.count / max) * 100).toFixed(1) + '%');
      track.appendChild(fill);

      item.append(track, node('span', 'barrow__value', String(row.count)));
      el.throughput.appendChild(item);
    });
  }

  function renderCycle(state) {
    const rows = averageCycleDays(state).filter((row) => row.column !== 'done');
    el.cycleList.textContent = '';

    if (!rows.length) {
      el.cycleList.appendChild(node('li', 'ledger__item', 'Not enough movement recorded yet.'));
      return;
    }

    rows
      .sort((a, b) => b.average - a.average)
      .forEach((row) => {
        const item = node('li', 'ledger__item');
        item.append(
          node('span', 'ledger__key', Data.columnName(row.column)),
          node('span', 'ledger__value', (row.average / 24).toFixed(1) + ' d')
        );
        item.title = row.samples + ' transition' + (row.samples === 1 ? '' : 's') + ' sampled';
        el.cycleList.appendChild(item);
      });
  }

  function renderTagBars(state) {
    const stats = Data.TAGS.map((tag) => {
      const cards = state.cards.filter((card) => card.tags.includes(tag));
      const done = cards.filter((card) => card.column === 'done').length;
      return { tag: tag, total: cards.length, done: done, percent: cards.length ? Math.round((done / cards.length) * 100) : 0 };
    }).filter((row) => row.total > 0);

    el.tagBars.textContent = '';
    stats
      .sort((a, b) => b.percent - a.percent)
      .forEach((row) => {
        const item = document.createElement('li');
        const btn = node('button', 'insight__btn');
        btn.type = 'button';
        btn.setAttribute('data-action', 'filter-tag');
        btn.setAttribute('data-value', row.tag);

        const head = node('span', 'insight__head');
        head.append(node('span', 'ledger__key', row.tag), node('span', 'ledger__value', row.percent + '%'));

        const track = node('span', 'barrow__track');
        const fill = node('span', 'barrow__fill');
        fill.style.setProperty('--pct', row.percent + '%');
        track.appendChild(fill);

        btn.append(head, track, node('span', 'insight__text', row.done + '/' + row.total + ' done'));
        item.appendChild(btn);
        el.tagBars.appendChild(item);
      });
  }

  function renderInsights(state) {
    const done = state.cards.filter((card) => card.column === 'done');
    const overdue = state.cards.filter((card) => Store.isOverdue(card, today()));
    const highOpen = state.cards.filter((card) => card.priority === 'high' && card.column !== 'done');
    const stalled = state.cards.filter((card) => {
      if (card.column === 'done') return false;
      const age = (Date.now() - Date.parse(card.updatedAt)) / 86400000;
      return Number.isFinite(age) && age > 10;
    });
    const busiest = averageCycleDays(state).sort((a, b) => b.average - a.average)[0];

    const rows = [
      {
        text: done.length
          ? done.length + ' of ' + state.cards.length + ' cards are finished (' + Math.round((done.length / state.cards.length) * 100) + '%).'
          : 'Nothing is finished yet — the board is all backlog.',
        action: { type: 'view', view: 'board' },
        go: 'Open the board'
      },
      {
        text: overdue.length
          ? overdue.length + ' card' + (overdue.length === 1 ? ' is' : 's are') + ' past its due date.'
          : 'Nothing is overdue. Every dated card is still inside its window.',
        action: { type: 'filter', filter: 'overdueOnly' },
        go: overdue.length ? 'Show only overdue' : 'Clear the filter'
      },
      {
        text: highOpen.length
          ? highOpen.length + ' high-priority card' + (highOpen.length === 1 ? '' : 's') + ' still open.'
          : 'No high-priority work is outstanding.',
        action: { type: 'priority', value: 'high' },
        go: 'Filter to high'
      },
      {
        text: stalled.length
          ? stalled.length + ' card' + (stalled.length === 1 ? ' has' : 's have') + ' not moved in over ten days.'
          : 'Every open card has moved in the last ten days.',
        action: { type: 'clear-filters' },
        go: 'Clear filters'
      },
      {
        text: busiest
          ? Data.columnName(busiest.column) + ' has the longest average dwell at ' + (busiest.average / 24).toFixed(1) + ' days.'
          : 'No column has been entered and left often enough to measure yet.',
        action: { type: 'view', view: 'timeline' },
        go: 'See the timeline'
      }
    ];

    el.insightList.textContent = '';
    rows.forEach((row) => {
      const item = document.createElement('li');
      const btn = node('button', 'insight__btn');
      btn.type = 'button';
      btn.setAttribute('data-action', 'insight');
      btn.dataset.insight = JSON.stringify(row.action);

      const head = node('span', 'insight__head');
      head.append(node('span', 'insight__dot'), node('span', 'insight__go', row.go));

      btn.append(head, node('span', 'insight__text', row.text));
      item.appendChild(btn);
      el.insightList.appendChild(item);
    });
  }

  function renderInsightsAll(state) {
    renderMetrics(state);
    renderThroughput(state);
    renderCycle(state);
    renderTagBars(state);
    renderInsights(state);
  }

  /* =======================================================================
     10. ROOT RENDER
     ===================================================================== */

  function render(state) {
    renderHeader(state);
    renderFilters(state);

    const timeline = state.view === 'timeline';
    el.viewBoard.hidden = timeline;
    el.viewTimeline.hidden = !timeline;
    el.tabBoard.setAttribute('aria-selected', timeline ? 'false' : 'true');
    el.tabTimeline.setAttribute('aria-selected', timeline ? 'true' : 'false');
    el.tabBoard.tabIndex = timeline ? -1 : 0;
    el.tabTimeline.tabIndex = timeline ? 0 : -1;

    if (timeline) renderTimeline(state);
    else renderBoard(state);

    renderInsightsAll(state);

    if (ui.dialog) renderDialog(state);
  }

  /* =======================================================================
     11. TOASTS
     ===================================================================== */

  function toast(message, action, tone) {
    const node1 = node('div', 'toast');
    node1.setAttribute('data-tone', tone || 'info');
    const text = node('span', 'toast__text', message);
    node1.appendChild(text);

    if (action && typeof action.run === 'function') {
      const btn = node('button', 'toast__action', action.label || 'Undo');
      btn.type = 'button';
      btn.addEventListener('click', () => {
        action.run();
        dismiss();
      });
      node1.appendChild(btn);
    }

    const dismiss = () => {
      node1.classList.add('is-out');
      window.setTimeout(() => node1.remove(), 200);
    };

    el.toasts.appendChild(node1);
    window.setTimeout(dismiss, action ? 6000 : 3200);
    return dismiss;
  }

  function announce(message) {
    el.live.textContent = '';
    window.setTimeout(() => {
      el.live.textContent = message;
    }, 30);
  }

  /* =======================================================================
     12. DIALOG SHELL
     ===================================================================== */

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

  function openDialog(kind, payload) {
    if (ui.dialog) return;
    ui.lastFocus = document.activeElement;
    ui.dialog = { kind: kind, payload: payload || null };
    el.overlay.hidden = false;
    el.body.classList.add('is-locked');
    renderDialog(Store.getState());
    window.requestAnimationFrame(() => {
      const target = $('[data-autofocus]', el.dialog) || $(FOCUSABLE, el.dialog);
      if (target) target.focus();
    });
  }

  function closeDialog() {
    if (!ui.dialog) return;
    ui.dialog = null;
    el.overlay.hidden = true;
    el.dialogBody.textContent = '';
    el.dialogFoot.textContent = '';
    el.body.classList.remove('is-locked');
    if (ui.lastFocus && document.contains(ui.lastFocus)) ui.lastFocus.focus();
    ui.lastFocus = null;
  }

  function setHead(eyebrow, title) {
    el.dialogEyebrow.textContent = eyebrow;
    el.dialogTitle.textContent = title;
  }

  function footButton(label, action, className) {
    return button(className || 'btn btn--ghost btn--sm', label, action);
  }

  function renderDialog(state) {
    if (ui.dialog.kind === 'card') renderCardDialog(state, ui.dialog.payload);
    else if (ui.dialog.kind === 'shortcuts') renderShortcutsDialog();
    else if (ui.dialog.kind === 'settings') renderSettingsDialog(state);
    else if (ui.dialog.kind === 'notice') renderNoticeDialog(ui.dialog.payload);
  }

  /* ---- card dialog ------------------------------------------------------ */

  function renderCardDialog(state, key) {
    const card = state.cards.find((item) => item.key === key);
    if (!card) {
      closeDialog();
      return;
    }

    setHead(card.key + ' · ' + Data.columnName(card.column), card.title);

    const body = el.dialogBody;
    body.textContent = '';

    const grid = node('div', 'dlg__grid');

    /* editable title + notes */
    const titleField = field('dlg__full', 'Title', 'text', card.title);
    titleField.input.value = card.title;
    titleField.input.setAttribute('data-role', 'card-title');
    titleField.input.setAttribute('data-autofocus', '');

    const notesField = field('dlg__full', 'Notes', 'textarea', null);
    notesField.input.value = card.notes || '';
    notesField.input.setAttribute('data-role', 'card-notes');

    /* priority radios */
    const prioBlock = node('div', 'dlg__block');
    prioBlock.appendChild(node('p', 'dlg__blocktitle', 'Priority'));
    const radios = node('div', 'radiochips');
    Data.PRIORITIES.forEach((priority) => {
      const chip = node('button', 'radiochip radiochip--' + priority.id, priority.name);
      chip.type = 'button';
      chip.setAttribute('data-action', 'card-priority');
      chip.setAttribute('data-value', priority.id);
      chip.setAttribute('aria-pressed', card.priority === priority.id ? 'true' : 'false');
      if (card.priority === priority.id) chip.classList.add('is-on');
      radios.appendChild(chip);
    });
    prioBlock.appendChild(radios);

    /* column select */
    const columnField = field('', 'Column', 'select', null);
    Data.COLUMNS.forEach((column) => {
      const option = node('option', null, column.name);
      option.value = column.id;
      if (card.column === column.id) option.selected = true;
      columnField.input.appendChild(option);
    });
    columnField.input.setAttribute('data-role', 'card-column');

    const dueField = field('', 'Due date', 'date', null);
    dueField.input.value = card.due || '';
    dueField.input.setAttribute('data-role', 'card-due');

    grid.append(titleField.wrap, notesField.wrap, prioBlock, columnField.wrap, dueField.wrap);
    body.appendChild(grid);

    /* tags */
    const tagBlock = node('div', 'dlg__block');
    tagBlock.appendChild(node('p', 'dlg__blocktitle', 'Tags'));
    const tagRow = node('div', 'radiochips');
    Data.TAGS.forEach((tag) => {
      const chip = node('button', 'radiochip', tag);
      chip.type = 'button';
      chip.setAttribute('data-action', 'card-tag');
      chip.setAttribute('data-value', tag);
      chip.setAttribute('aria-pressed', card.tags.includes(tag) ? 'true' : 'false');
      if (card.tags.includes(tag)) chip.classList.add('is-on');
      tagRow.appendChild(chip);
    });
    tagBlock.appendChild(tagRow);
    body.appendChild(tagBlock);

    /* checklist */
    const ratio = Store.checklistRatio(card);
    const checkBlock = node('div', 'dlg__block');
    checkBlock.appendChild(node('p', 'dlg__blocktitle', 'Checklist · ' + ratio.done + '/' + ratio.total));

    const list = node('div', 'checklist');
    card.checklist.forEach((item) => list.appendChild(buildCheckItem(card, item)));
    checkBlock.appendChild(list);

    const addRow = node('div', 'composer__actions');
    const addInput = node('input', 'composer__input');
    addInput.type = 'text';
    addInput.placeholder = 'Add a checklist item…';
    addInput.maxLength = 90;
    addInput.setAttribute('data-role', 'check-input');
    addInput.setAttribute('aria-label', 'New checklist item');
    const addBtn = footButton('Add item', 'check-add');
    addRow.append(addInput, addBtn);
    checkBlock.appendChild(addRow);

    body.appendChild(checkBlock);

    /* activity log */
    const logBlock = node('div', 'dlg__block');
    logBlock.appendChild(node('p', 'dlg__blocktitle', 'Activity'));
    const log = node('div', 'log');
    card.activity
      .slice()
      .reverse()
      .forEach((row) => {
        const item = node('div', 'logrow');
        item.append(node('time', 'logrow__time', fmtDay(row.at) + ' ' + fmtTime(row.at)), node('span', 'logrow__text', row.text));
        log.appendChild(item);
      });
    logBlock.appendChild(log);
    body.appendChild(logBlock);

    const foot = el.dialogFoot;
    foot.textContent = '';
    const del = footButton('Delete card', 'card-delete', 'btn btn--danger btn--sm');
    del.setAttribute('data-key', card.key);
    const note = node('span', 'dialog__note', 'Key ' + card.key + ' · created ' + fmtDay(card.createdAt));
    const save = footButton('Save changes', 'card-save', 'btn btn--primary btn--sm');
    save.setAttribute('data-key', card.key);
    foot.append(del, note, save);
  }

  function buildCheckItem(card, item) {
    const row = node('div', 'checkitem');
    if (item.done) row.classList.add('is-done');

    const box = node('button', 'checkitem__box');
    box.type = 'button';
    box.setAttribute('data-action', 'check-toggle');
    box.setAttribute('data-key', card.key);
    box.setAttribute('data-item', item.id);
    box.setAttribute('aria-pressed', item.done ? 'true' : 'false');
    box.setAttribute('aria-label', (item.done ? 'Untick' : 'Tick') + ': ' + item.text);
    box.appendChild(node('span', 'checkitem__mark', '✓'));

    const text = node('span', 'checkitem__text', item.text);

    const remove = node('button', 'checkitem__remove', '×');
    remove.type = 'button';
    remove.setAttribute('data-action', 'check-remove');
    remove.setAttribute('data-key', card.key);
    remove.setAttribute('data-item', item.id);
    remove.setAttribute('aria-label', 'Remove item: ' + item.text);

    row.append(box, text, remove);
    return row;
  }

  function field(extraClass, labelText, type, value) {
    const wrap = node('div', 'field ' + (extraClass || 'field--group'));
    const label = node('label', 'field__label', labelText);

    /* <input type="select"> is not a thing, and <textarea>.type is a getter-only
       property that throws under strict mode — so the element has to be chosen
       first and only an <input> may be given a type. */
    let input;
    if (type === 'select') input = document.createElement('select');
    else if (type === 'textarea') input = document.createElement('textarea');
    else {
      input = document.createElement('input');
      input.type = type;
    }
    input.className = 'field__input';
    if (value !== null && value !== undefined) input.value = value;

    const id = 'dlg-' + labelText.toLowerCase().replace(/[^a-z]+/g, '-');
    input.id = id;
    label.setAttribute('for', id);
    wrap.append(label, input);
    return { wrap: wrap, input: input, error: null };
  }

  /* ---- shortcuts ------------------------------------------------------- */

  const SHORTCUTS = [
    ['/', 'Focus search'],
    ['N', 'New card in the first column'],
    ['Enter', 'Open the focused card'],
    ['Ctrl / ⌘ + ← →', 'Move the focused card between columns'],
    ['Ctrl / ⌘ + ↑ ↓', 'Reorder within a column'],
    ['← → ↑ ↓', 'Move focus between cards'],
    ['Home / End', 'First / last card in the column'],
    ['U', 'Undo'],
    ['R', 'Redo'],
    ['V', 'Switch view'],
    ['T', 'Toggle theme'],
    ['Esc', 'Close this dialog']
  ];

  function renderShortcutsDialog() {
    setHead('Keyboard', 'Shortcuts');
    const body = el.dialogBody;
    body.textContent = '';

    const keys = node('div', 'keys');
    SHORTCUTS.forEach(([combo, what]) => {
      const row = node('div', 'keys__row');
      row.append(node('kbd', 'keys__combo', combo), node('span', 'keys__what', what));
      keys.appendChild(row);
    });
    body.appendChild(keys);

    const foot = el.dialogFoot;
    foot.textContent = '';
    foot.appendChild(node('span', 'dialog__note', 'Shortcuts are ignored while typing in a field.'));
  }

  /* ---- settings -------------------------------------------------------- */

  function renderSettingsDialog(state) {
    setHead('Settings', 'Board settings');
    const body = el.dialogBody;
    body.textContent = '';

    const block = node('div', 'setting');

    const exportRow = node('div', 'setting');
    const exportBody = node('div', 'setting__body');
    exportBody.append(
      node('p', 'setting__label', 'Export'),
      node('p', 'field__help', 'Downloads the whole board as JSON, including filters, view and theme.')
    );
    const exportActions = node('div', 'composer__actions');
    exportActions.append(footButton('Export JSON', 'export', 'btn btn--ghost btn--sm'), footButton('Import JSON…', 'import', 'btn btn--ghost btn--sm'));
    exportRow.append(exportBody, exportActions);
    block.appendChild(exportRow);

    const resetRow = node('div', 'setting');
    const resetBody = node('div', 'setting__body');
    resetBody.append(node('p', 'setting__label', 'Reset'), node('p', 'field__help', 'Discards every card and restores the built-in sample board. Undo still works afterwards.'));
    const resetActions = node('div', 'composer__actions');
    resetActions.append(footButton('Reset to sample board', 'reset', 'btn btn--danger btn--sm'));
    resetRow.append(resetBody, resetActions);
    block.appendChild(resetRow);

    const faultRow = node('div', 'setting');
    const faultBody = node('div', 'setting__body');
    faultBody.append(
      node('p', 'setting__label', 'Simulate a failed sync'),
      node('p', 'field__help', 'Makes the next sync round trip reject, so the error path and its recovery can be demonstrated.')
    );
    const faultToggle = node('button', 'chip chip--toggle', 'Fail next sync');
    faultToggle.type = 'button';
    faultToggle.setAttribute('data-action', 'fail-next');
    faultToggle.setAttribute('aria-pressed', state.sync.failNext ? 'true' : 'false');
    if (state.sync.failNext) faultToggle.classList.add('is-on');
    faultRow.append(faultBody, faultToggle);
    block.appendChild(faultRow);

    body.appendChild(block);

    if (state.sync.runs) {
      const stats = node('div', 'dlg__block');
      stats.append(
        node('p', 'dlg__blocktitle', 'Sync history'),
        node('p', 'field__help', state.sync.runs + ' round trip' + (state.sync.runs === 1 ? '' : 's') + ' this session, last at ' + (state.sync.lastAt ? fmtTime(state.sync.lastAt) : 'never'))
      );
      body.appendChild(stats);
    }

    const foot = el.dialogFoot;
    foot.textContent = '';
    foot.appendChild(node('span', 'dialog__note', Store.isStorageAvailable() ? 'Store healthy' : 'Storage unavailable — running in memory'));
  }

  /* ---- notice / fault -------------------------------------------------- */

  function renderNoticeDialog(payload) {
    setHead('Import', payload.title || 'Notice');
    const body = el.dialogBody;
    body.textContent = '';

    const wrap = node('div', 'fault');
    wrap.appendChild(node('p', 'fault__title', payload.title || 'Notice'));
    wrap.appendChild(node('p', 'field__help', payload.text || ''));

    if (Array.isArray(payload.errors) && payload.errors.length) {
      const list = node('ul', 'errlist');
      payload.errors.forEach((message) => list.appendChild(node('li', 'errlist__item', message)));
      wrap.appendChild(list);
    }
    body.appendChild(wrap);

    const foot = el.dialogFoot;
    foot.textContent = '';
    foot.appendChild(footButton('Close', 'close-dialog', 'btn btn--primary btn--sm'));
  }

  /* =======================================================================
     13. ACTIONS
     ===================================================================== */

  function newCard(column, title) {
    const now = new Date().toISOString();
    return {
      key: Data.nextKey(Store.getState().cards),
      title: title,
      notes: '',
      priority: 'normal',
      tags: [],
      column: column,
      due: '',
      week: 1,
      span: 1,
      checklist: [],
      activity: [],
      createdAt: now,
      updatedAt: now
    };
  }

  function moveCard(key, toColumn, toIndex) {
    Store.dispatch({ type: 'CARD_MOVE', payload: { key: key, toColumn: toColumn, toIndex: toIndex } });
  }

  function indexInColumn(state, column, key) {
    return state.cards.filter((card) => card.column === column).findIndex((card) => card.key === key);
  }

  function deleteCard(key) {
    const state = Store.getState();
    const index = state.cards.findIndex((card) => card.key === key);
    if (index === -1) return;
    const card = state.cards[index];
    Store.dispatch({ type: 'CARD_DELETE', payload: { key: key } });
    toast(card.key + ' deleted.', {
      label: 'Undo',
      run: () => Store.dispatch({ type: 'CARD_RESTORE', payload: { card: card, index: index } })
    });
    announce(card.key + ' deleted. Undo is available.');
  }

  /* ---- sync ------------------------------------------------------------ */

  async function runSync() {
    const state = Store.getState();
    if (state.sync.status === 'syncing') return;

    Store.dispatch({ type: 'SYNC_SET', payload: { patch: { status: 'syncing', error: null } } });

    try {
      const result = await Data.syncAll(Store.getState().cards, { fail: state.sync.failNext, target: 'CLOUD' });
      Store.dispatch({
        type: 'SYNC_SET',
        payload: {
          patch: {
            status: 'synced',
            failNext: false,
            runs: Store.getState().sync.runs + 1,
            lastAt: new Date().toISOString(),
            lastResult: result,
            error: null
          }
        }
      });
      el.alert.textContent = '';
      toast('Synced ' + result.written + ' cards in ' + result.batches + ' batch' + (result.batches === 1 ? '' : 'es') + '.');
      announce('Sync complete. ' + result.written + ' cards uploaded.');
    } catch (error) {
      if (error && error.code === 'SYNC_CANCELLED') {
        Store.dispatch({ type: 'SYNC_SET', payload: { patch: { status: 'offline', error: null } } });
        return;
      }
      /* The toggle is "fail the NEXT sync", so it clears itself whichever way
       that sync ends — otherwise Retry could never succeed. */
      Store.dispatch({
        type: 'SYNC_SET',
        payload: { patch: { status: 'error', failNext: false, error: (error && error.message) || 'Sync failed.' } }
      });
      el.alert.textContent = (error && error.message) || 'Sync failed.';
      toast(
        'Sync failed — the board is unchanged and still saved locally.',
        { label: 'Retry', run: () => runSync() },
        'error'
      );
    }
  }

  /* ---- import / export ------------------------------------------------- */

  function exportJSON() {
    Store.flush();
    const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'taskflow-' + today() + '.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Exported taskflow-' + today() + '.json');
  }

  function importJSONFile(file) {
    const reader = new FileReader();
    reader.onload = () => {
      const result = Store.importJSON(String(reader.result));
      if (!result.ok) {
        openDialog('notice', { title: 'Import rejected', text: 'The file was not applied. The current board is untouched.', errors: result.errors });
        return;
      }
      toast('Imported ' + result.count + ' cards.');
      announce('Imported ' + result.count + ' cards.');
    };
    reader.onerror = () => openDialog('notice', { title: 'Import failed', text: 'The file could not be read.', errors: [] });
    reader.readAsText(file);
  }

  /* =======================================================================
     14. DRAG & DROP
     ===================================================================== */

  function cardFrom(target) {
    const node1 = target.closest('.card');
    return node1 && el.board.contains(node1) ? node1 : null;
  }

  function openGaps() {
    $$('.dropgap.is-open', el.board).forEach((gap) => gap.classList.remove('is-open'));
  }

  function gapIndex(column, key) {
    const state = Store.getState();
    const columnKey = state.cards.filter((card) => card.column === column).map((card) => card.key);
    const at = columnKey.indexOf(key);
    return at === -1 ? columnKey.length : at;
  }

  function wireDragAndDrop() {
    el.board.addEventListener('dragstart', (event) => {
      const card = cardFrom(event.target);
      if (!card) return;
      ui.dragKey = card.getAttribute('data-key');
      card.classList.add('is-dragging');
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', ui.dragKey);
      Store.dispatch({ type: 'UI_SET', payload: { patch: { dragging: true } } });
    });

    el.board.addEventListener('dragend', () => {
      const card = $('.card.is-dragging', el.board);
      if (card) card.classList.remove('is-dragging');
      $$('.col.is-over', el.board).forEach((col) => col.classList.remove('is-over'));
      openGaps();
      ui.dragKey = null;
      ui.dropColumn = null;
      ui.dropIndex = null;
      Store.dispatch({ type: 'UI_SET', payload: { patch: { dragging: false } } });
    });

    el.board.addEventListener('dragover', (event) => {
      if (!ui.dragKey) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';

      const list = event.target.closest('.col__list');
      if (!list) return;
      const column = list.getAttribute('data-column');

      $$('.col.is-over', el.board).forEach((col) => col.classList.remove('is-over'));
      const section = list.closest('.col');
      if (section) section.classList.add('is-over');

      const cards = $$('.card', list);
      let index = cards.length;
      for (let i = 0; i < cards.length; i += 1) {
        const box = cards[i].getBoundingClientRect();
        if (event.clientY < box.top + box.height / 2) {
          index = i;
          break;
        }
      }

      openGaps();
      const gap = $('.dropgap[data-column="' + column + '"]', list);
      if (gap) {
        const before = gap.previousElementSibling;
        if (index >= cards.length || !before || !before.classList.contains('card')) {
          gap.classList.add('is-open');
        } else {
          /* gapIndex() is only meaningful while reordering inside one column:
             it gives the card's own slot so the gap does not flicker between
             two positions. A card arriving from another column is not in that
             list at all, so its gap has to be allowed to open anywhere. */
          const inColumn = indexInColumn(Store.getState(), column, ui.dragKey) !== -1;
          gap.classList.toggle('is-open', !inColumn || gapIndex(column, ui.dragKey) <= index);
        }
      }

      ui.dropColumn = column;
      ui.dropIndex = index;
    });

    el.board.addEventListener('dragleave', (event) => {
      if (event.target.closest('.col')) return;
      openGaps();
    });

    el.board.addEventListener('drop', (event) => {
      if (!ui.dragKey) return;
      event.preventDefault();
      const column = ui.dropColumn;
      const index = ui.dropIndex;
      const key = ui.dragKey;

      openGaps();
      $$('.col.is-over', el.board).forEach((col) => col.classList.remove('is-over'));

      if (column && typeof index === 'number') {
        const state = Store.getState();
        const current = indexInColumn(state, column, key);
        let target = index;
        if (current !== -1 && current < index) target = index - 1;
        moveCard(key, column, Math.max(0, target));
        announce(Data.nextKey ? key + ' moved to ' + Data.columnName(column) + '.' : '');
      }

      ui.dragKey = null;
      ui.dropColumn = null;
      ui.dropIndex = null;
    });
  }

  /* =======================================================================
     15. KEYBOARD BOARD NAVIGATION
     ===================================================================== */

  function focusedCard() {
    const active = document.activeElement;
    return active && active.classList && active.classList.contains('card') ? active : null;
  }

  /* Keep exactly one card in the page tab order. Without this, Tab walks all 21
     cards before reaching the next control, which is the classic mistake with a
     composite widget. The active card falls back to the first one so the board is
     always reachable. */
  function applyRovingTabindex(preferredKey) {
    const cards = $$('.card', el.board);
    if (!cards.length) return;

    let target = preferredKey && $('.card[data-key="' + preferredKey + '"]', el.board);
    if (!target) target = cards[0];
    ui.focusedKey = target.getAttribute('data-key');

    cards.forEach((card) => {
      const isTarget = card === target;
      card.setAttribute('tabindex', isTarget ? '0' : '-1');
      card.setAttribute('data-focused', isTarget ? 'true' : 'false');
    });
  }

  /* First / last card of the column the given card is in, so Home and End stay
     within a column the way the arrow keys do. */
  function columnEdge(card, edge) {
    const column = card.getAttribute('data-column');
    const cards = $$('.card[data-column="' + column + '"]', el.board);
    if (!cards.length) return;
    const next = edge === 'first' ? cards[0] : cards[cards.length - 1];
    if (next) next.focus();
  }

  function moveFocus(card, delta) {
    const cards = $$('.card', el.board).filter((node1) => !node1.hidden);
    if (!cards.length) return;
    const index = cards.indexOf(card);
    const next = cards[Math.max(0, Math.min(cards.length - 1, index + delta))];
    if (next) next.focus();
  }

  function nudge(key, deltaColumn, deltaRow) {
    const state = Store.getState();
    const card = state.cards.find((item) => item.key === key);
    if (!card) return;

    if (deltaColumn) {
      const order = Data.COLUMN_IDS;
      const at = order.indexOf(card.column);
      const target = order[Math.max(0, Math.min(order.length - 1, at + deltaColumn))];
      if (target === card.column) return;
      const columnIndex = state.cards.filter((item) => item.column === target).length;
      moveCard(key, target, columnIndex);
      announce(key + ' moved to ' + Data.columnName(target) + '.');
      return;
    }

    const siblings = state.cards.filter((item) => item.column === card.column);
    const at = siblings.findIndex((item) => item.key === key);
    const target = siblings[Math.max(0, Math.min(siblings.length - 1, at + deltaRow))];
    if (!target || target.key === key) return;
    moveCard(key, card.column, at + deltaRow);
    announce(key + ' moved to position ' + (at + deltaRow + 1) + ' in ' + Data.columnName(card.column) + '.');
  }

  /* =======================================================================
     16. EVENTS
     ===================================================================== */

  function isTyping(target) {
    if (!target) return false;
    const tag = target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
  }

  function wireHeader() {
    el.viewTabs.addEventListener('click', (event) => {
      const tab = event.target.closest('[data-view]');
      if (!tab) return;
      Store.dispatch({ type: 'VIEW_SET', payload: { view: tab.getAttribute('data-view') } });
      announce(tab.getAttribute('data-view') === 'timeline' ? 'Timeline view.' : 'Board view.');
    });

    el.viewTabs.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
      event.preventDefault();
      const tabs = $$('[role="tab"]', el.viewTabs);
      const current = tabs.findIndex((tab) => tab.getAttribute('aria-selected') === 'true');
      const next = tabs[(current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      next.focus();
      Store.dispatch({ type: 'VIEW_SET', payload: { view: next.getAttribute('data-view') } });
    });

    el.syncBtn.addEventListener('click', () => runSync());

    el.undo.addEventListener('click', () => {
      const label = Store.undo();
      if (label) {
        toast('Undid ' + label + '.', { label: 'Redo', run: () => Store.redo() });
        announce('Undid ' + label + '.');
      }
    });

    el.redo.addEventListener('click', () => {
      const label = Store.redo();
      if (label) {
        toast('Redid ' + label + '.');
        announce('Redid ' + label + '.');
      }
    });

    el.theme.addEventListener('click', () => {
      const next = Store.getState().theme === 'dark' ? 'light' : 'dark';
      Store.dispatch({ type: 'THEME_SET', payload: { theme: next } });
      announce(next + ' theme.');
    });

    el.settings.addEventListener('click', () => openDialog('settings'));
    el.help.addEventListener('click', () => openDialog('shortcuts'));
  }

  function wireFilters() {
    let timer = 0;
    el.query.addEventListener('input', () => {
      window.clearTimeout(timer);
      const value = el.query.value;
      timer = window.setTimeout(() => Store.dispatch({ type: 'FILTER_SET', payload: { patch: { query: value } } }), 160);
    });

    el.priorities.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-value]');
      if (!chip) return;
      const value = chip.getAttribute('data-value');
      const current = Store.getState().filters.priorities.slice();
      const next = current.includes(value) ? current.filter((id) => id !== value) : current.concat(value);
      Store.dispatch({ type: 'FILTER_SET', payload: { patch: { priorities: next } } });
    });

    el.tags.addEventListener('click', (event) => {
      const chip = event.target.closest('[data-value]');
      if (!chip) return;
      const value = chip.getAttribute('data-value');
      const current = Store.getState().filters.tags.slice();
      const next = current.includes(value) ? current.filter((id) => id !== value) : current.concat(value);
      Store.dispatch({ type: 'FILTER_SET', payload: { patch: { tags: next } } });
    });

    el.overdue.addEventListener('click', () => {
      Store.dispatch({ type: 'FILTER_SET', payload: { patch: { overdueOnly: !Store.getState().filters.overdueOnly } } });
    });

    el.showDone.addEventListener('click', () => {
      Store.dispatch({ type: 'FILTER_SET', payload: { patch: { showDone: !Store.getState().filters.showDone } } });
    });

    el.clear.addEventListener('click', () => {
      el.query.value = '';
      Store.dispatch({ type: 'FILTER_CLEAR' });
      announce('Filters cleared.');
    });
  }

  function wireBoard() {
    el.board.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-action]');
      const card = cardFrom(event.target);
      const action = trigger && trigger.getAttribute('data-action');

      if (action === 'composer-toggle') {
        const column = trigger.getAttribute('data-column');
        ui.composerFor = ui.composerFor === column ? null : column;
        render(Store.getState());
        return;
      }

      if (action === 'composer-cancel') {
        ui.composerFor = null;
        render(Store.getState());
        return;
      }

      if (action === 'composer-add') {
        const column = trigger.getAttribute('data-column');
        const input = $('[data-role="composer-input"]', el.board);
        const title = input ? input.value.trim() : '';
        if (!title) {
          announce('A card needs a title.');
          el.alert.textContent = 'A card needs a title.';
          if (input) input.focus();
          return;
        }
        const card = newCard(column, title);
        Store.dispatch({ type: 'CARD_CREATE', payload: { card: card } });
        ui.composerFor = null;
        toast(card.key + ' created.');
        announce(card.key + ' created in ' + Data.columnName(column) + '.');
        return;
      }

      if (!card) return;

      switch (action) {
        case 'card-delete':
          deleteCard(card.getAttribute('data-key'));
          break;
        case 'card-open':
          openDialog('card', card.getAttribute('data-key'));
          break;
        default:
          openDialog('card', card.getAttribute('data-key'));
      }
    });

    el.board.addEventListener('keydown', (event) => {
      const card = focusedCard();
      if (!card) return;
      const key = card.getAttribute('data-key');

      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openDialog('card', key);
        return;
      }

      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          nudge(key, event.key === 'ArrowRight' ? 1 : -1, 0);
          return;
        }
        event.preventDefault();
        moveFocus(card, event.key === 'ArrowRight' ? 1 : -1);
        return;
      }

      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          nudge(key, 0, event.key === 'ArrowDown' ? 1 : -1);
          return;
        }
        event.preventDefault();
        moveFocus(card, event.key === 'ArrowDown' ? 1 : -1);
        return;
      }

      if (event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        columnEdge(card, event.key === 'Home' ? 'first' : 'last');
      }
    });

    el.board.addEventListener('focusin', (event) => {
      const card = cardFrom(event.target);
      if (!card) return;
      applyRovingTabindex(card.getAttribute('data-key'));
    });
  }

  function wireDialog() {
    el.dialogClose.addEventListener('click', closeDialog);
    el.scrim.addEventListener('click', closeDialog);

    el.dialogBody.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.getAttribute('data-action');
      const key = ui.dialog && ui.dialog.kind === 'card' ? ui.dialog.payload : null;

      if (action === 'card-priority' && key) {
        const card = Store.getState().cards.find((item) => item.key === key);
        Store.dispatch({
          type: 'CARD_UPDATE',
          payload: { key: key, patch: { priority: trigger.getAttribute('data-value') }, log: 'Priority set to ' + trigger.getAttribute('data-value') }
        });
        announce(card ? 'Priority updated.' : '');
        return;
      }

      if (action === 'card-tag' && key) {
        const card = Store.getState().cards.find((item) => item.key === key);
        if (!card) return;
        const tag = trigger.getAttribute('data-value');
        const tags = card.tags.includes(tag) ? card.tags.filter((item) => item !== tag) : card.tags.concat(tag);
        Store.dispatch({ type: 'CARD_UPDATE', payload: { key: key, patch: { tags: tags }, log: 'Tags updated' } });
        return;
      }

      if (action === 'check-toggle' && key) {
        Store.dispatch({ type: 'CARD_TOGGLE_CHECK', payload: { key: key, itemId: trigger.getAttribute('data-item') } });
        return;
      }

      if (action === 'check-remove' && key) {
        Store.dispatch({ type: 'CHECK_REMOVE', payload: { key: key, itemId: trigger.getAttribute('data-item') } });
        return;
      }

      if (action === 'check-add' && key) {
        const input = $('[data-role="check-input"]', el.dialogBody);
        const text = input ? input.value.trim() : '';
        if (!text) {
          if (input) input.focus();
          return;
        }
        Store.dispatch({ type: 'CHECK_ADD', payload: { key: key, text: text, done: false } });
        return;
      }

      if (action === 'fail-next') {
        Store.dispatch({ type: 'FAIL_NEXT_SET', payload: { value: !Store.getState().sync.failNext } });
        return;
      }

      /* The settings dialog lays its actions out inside the body, not the
         footer, so export / import / reset are handled here. */
      if (action === 'export') {
        exportJSON();
        return;
      }

      if (action === 'import') {
        closeDialog();
        el.fileImport.click();
        return;
      }

      if (action === 'reset') {
        /* resetToSeed() deliberately wipes the history stacks, so the snapshot
           is taken here — otherwise the toast's Undo would have nothing to do. */
        const previous = Store.getState();
        const snapshot = {
          cards: previous.cards,
          filters: previous.filters,
          view: previous.view,
          theme: previous.theme
        };
        Store.resetToSeed();
        closeDialog();
        toast('Board reset to the sample board.', {
          label: 'Undo',
          run: () => {
            Store.dispatch({ type: 'STATE_REPLACE', payload: { board: snapshot } });
            announce('Reset undone.');
          }
        });
        announce('Board reset to the sample board.');
      }
    });

    el.dialogBody.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      const trigger = event.target.closest('[data-action="check-add"]');
      if (trigger) trigger.click();
    });

    el.dialogFoot.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-action]');
      if (!trigger) return;
      const action = trigger.getAttribute('data-action');

      if (action === 'close-dialog') {
        closeDialog();
        return;
      }

      if (action === 'card-delete') {
        deleteCard(trigger.getAttribute('data-key'));
        closeDialog();
        return;
      }

      if (action === 'card-save') {
        saveCard(trigger.getAttribute('data-key'));
      }
    });
  }

  function saveCard(key) {
    const card = Store.getState().cards.find((item) => item.key === key);
    if (!card) return;

    const titleInput = $('[data-role="card-title"]', el.dialogBody);
    const notesInput = $('[data-role="card-notes"]', el.dialogBody);
    const columnInput = $('[data-role="card-column"]', el.dialogBody);
    const dueInput = $('[data-role="card-due"]', el.dialogBody);

    const title = titleInput ? titleInput.value.trim() : card.title;
    if (!title) {
      el.alert.textContent = 'A card needs a title.';
      if (titleInput) {
        titleInput.setAttribute('aria-invalid', 'true');
        titleInput.focus();
      }
      return;
    }

    const patch = {
      title: title,
      notes: notesInput ? notesInput.value.trim() : card.notes,
      due: dueInput ? dueInput.value : card.due
    };

    const targetColumn = columnInput && Data.COLUMN_IDS.includes(columnInput.value) ? columnInput.value : card.column;

    if (targetColumn !== card.column) {
      const index = Store.getState().cards.filter((item) => item.column === targetColumn).length;
      Store.dispatch({ type: 'CARD_UPDATE', payload: { key: key, patch: patch, log: 'Details updated' } });
      moveCard(key, targetColumn, index);
    } else {
      Store.dispatch({ type: 'CARD_UPDATE', payload: { key: key, patch: patch, log: 'Details updated' } });
    }

    closeDialog();
    toast(key + ' saved.');
    announce(key + ' saved.');
  }

  function wireInsights() {
    el.insightList.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-insight]');
      if (!btn) return;
      let action = null;
      try {
        action = JSON.parse(btn.dataset.insight);
      } catch (error) {
        return;
      }
      if (!action) return;

      if (action.type === 'view') Store.dispatch({ type: 'VIEW_SET', payload: { view: action.view } });
      else if (action.type === 'filter') {
        const current = Store.getState().filters;
        Store.dispatch({ type: 'FILTER_SET', payload: { patch: { overdueOnly: !current.overdueOnly } } });
      } else if (action.type === 'priority') {
        const current = Store.getState().filters.priorities;
        Store.dispatch({
          type: 'FILTER_SET',
          payload: { patch: { priorities: current.includes(action.value) ? [] : [action.value] } }
        });
      } else if (action.type === 'clear-filters') {
        Store.dispatch({ type: 'FILTER_CLEAR' });
      }

      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      announce('Insight applied.');
    });

    el.tagBars.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-value]');
      if (!btn) return;
      const value = btn.getAttribute('data-value');
      const current = Store.getState().filters.tags;
      Store.dispatch({
        type: 'FILTER_SET',
        payload: { patch: { tags: current.includes(value) ? [] : [value] } }
      });
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    });
  }

  function wireTimeline() {
    const open = (event) => {
      const row = event.target.closest('.tlrow');
      if (!row) return;
      openDialog('card', row.getAttribute('data-key'));
    };

    el.timeline.addEventListener('click', open);
    el.timeline.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const row = event.target.closest('.tlrow');
      if (!row) return;
      event.preventDefault();
      openDialog('card', row.getAttribute('data-key'));
    });
  }

  function wireGlobalKeys() {
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        if (ui.dialog) {
          event.preventDefault();
          closeDialog();
        }
        return;
      }

      /* Tab containment. Without this the dialog is only a visual overlay:
         focus walks straight off the last control and into the board behind,
         which is the exact bug NG-107 is filed against. */
      if (event.key === 'Tab' && ui.dialog) {
        const items = $$(FOCUSABLE, el.dialog).filter(
          (node) => node.offsetParent !== null || node === document.activeElement
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }

      if (isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;

      if (ui.dialog) return;

      if (event.key === '/') {
        event.preventDefault();
        el.query.focus();
        el.query.select();
        return;
      }

      if (event.key === '?') {
        event.preventDefault();
        openDialog('shortcuts');
        return;
      }

      const key = event.key.toLowerCase();
      if (key === 'u') {
        event.preventDefault();
        el.undo.click();
        return;
      }
      if (key === 'r') {
        event.preventDefault();
        el.redo.click();
        return;
      }
      if (key === 't') {
        event.preventDefault();
        el.theme.click();
        return;
      }
      if (key === 'v') {
        event.preventDefault();
        const next = Store.getState().view === 'board' ? 'timeline' : 'board';
        Store.dispatch({ type: 'VIEW_SET', payload: { view: next } });
        return;
      }
      if (key === 'n') {
        event.preventDefault();
        ui.composerFor = Data.COLUMN_IDS[0];
        render(Store.getState());
      }
    });
  }

  function wireImport() {
    el.fileImport.addEventListener('change', () => {
      const file = el.fileImport.files && el.fileImport.files[0];
      if (file) importJSONFile(file);
      el.fileImport.value = '';
    });
  }

  /* =======================================================================
     17. BOOT
     ===================================================================== */

  function boot() {
    renderSkeleton(true);

    wireHeader();
    wireFilters();
    wireBoard();
    wireDialog();
    wireInsights();
    wireTimeline();
    wireGlobalKeys();
    wireImport();
    wireDragAndDrop();

    Store.subscribe((state) => render(state));

    window.addEventListener('pagehide', () => Store.flush());
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') Store.flush();
    });

    renderSkeleton(false);
    render(Store.getState());

    const notice = Store.bootNotice;
    if (notice) {
      el.alert.textContent = notice.text;
      toast(notice.text, null, notice.level === 'error' ? 'error' : 'warn');
    }

    if (!Store.isStorageAvailable()) {
      toast('LocalStorage is unavailable — changes will not survive a reload.', null, 'warn');
    }
  }

  boot();
})();
