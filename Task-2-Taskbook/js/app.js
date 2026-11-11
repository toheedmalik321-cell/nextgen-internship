/* Taskbook. One state object, one render(), one localStorage write.
   Task text always goes in through textContent, never innerHTML. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------- config */
  let STORAGE_KEY = 'ngsh.todo.v1';
  let THEME_KEY = 'ngsh.todo.theme.v1';
  let TITLE_MIN = 3;
  let TITLE_MAX = 80;
  let UNDO_MS = 6000;
  let TOAST_MS = 3200;
  let SEARCH_DEBOUNCE_MS = 200;
  let PRIORITY_RANK = { high: 0, normal: 1, low: 2 };
  let PRIORITY_LABEL = { high: 'High', normal: 'Normal', low: 'Low' };

  /* ------------------------------------------------------------------ dom */
  let $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  let $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  let el = {
    html: document.documentElement,
    form: $('#task-form'),
    title: $('#task-title'),
    titleError: $('#task-title-error'),
    counter: $('#title-counter'),
    priority: $('#task-priority'),
    due: $('#task-due'),
    dueError: $('#task-due-error'),
    notes: $('#task-notes'),
    list: $('#task-list'),
    summary: $('#list-summary'),
    empty: $('#empty-state'),
    emptyMsg: $('#empty-msg'),
    emptyReset: $('#empty-reset'),
    search: $('#task-search'),
    searchClear: $('#search-clear'),
    sort: $('#task-sort'),
    tabs: $('.tabs'),
    readout: $('#header-readout'),
    progressFill: $('#progress-fill'),
    progressWrap: $('#progress-wrap'),
    percent: $('#stat-percent'),
    storage: $('#storage-line'),
    importFile: $('#import-file'),
    themeToggle: $('#theme-toggle'),
    themeLabel: $('#theme-toggle-label'),
    toasts: $('#toasts'),
    toTop: $('#to-top')
  };

  /* ---------------------------------------------------------------- state */
  let state = {
    tasks: [],
    filter: 'all',
    query: '',
    sort: 'manual',
    theme: 'dark',
    editingId: null,
    bytes: 0
  };

  /* =======================================================================
     1. STORAGE — every access is guarded; a corrupt store falls back to seed
     ===================================================================== */

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return window.crypto.randomUUID();
    }
    return 't-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }

  /* Closure: a sanitiser that coerces one arbitrary value into a valid task.
     Used by both the seed data and the JSON importer so both paths can never
     inject a malformed record into state. */
  let sanitiseTask = (function () {
    let VALID_PRIORITY = { low: 1, normal: 1, high: 1 };
    return function (raw, index) {
      let source = raw && typeof raw === 'object' ? raw : {};
      let title = typeof source.title === 'string' ? source.title.trim().slice(0, 200) : '';
      let due = typeof source.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.due) ? source.due : '';
      return {
        id: typeof source.id === 'string' && source.id ? source.id : makeId(),
        title: title,
        notes: typeof source.notes === 'string' ? source.notes.slice(0, 400) : '',
        priority: VALID_PRIORITY[source.priority] ? source.priority : 'normal',
        due: due,
        done: source.done === true,
        trashed: source.trashed === true,
        createdAt: Number.isFinite(source.createdAt) ? source.createdAt : Date.now() - index,
        completedAt: Number.isFinite(source.completedAt) ? source.completedAt : null,
        order: Number.isFinite(source.order) ? source.order : index
      };
    };
  })();

  function seedTasks() {
    let today = new Date();
    let iso = function (offsetDays) {
      let d = new Date(today.getTime());
      d.setDate(d.getDate() + offsetDays);
      return d.toISOString().slice(0, 10);
    };
    let rows = [
      ['Read the MDN HTML element reference', 'high', -2, true, 'Skim <main>, <section> and <dialog> before the review.'],
      ['Set up the GitHub repository', 'high', -6, true, 'git init, first commit, push to origin/main.'],
      ['Build the responsive portfolio layout', 'normal', -3, true, 'Flexbox for the nav, Grid for the project cards.'],
      ['Write the image gallery lightbox', 'normal', 1, false, 'Focus trap plus Escape to close.'],
      ['Prepare the Week 08 presentation deck', 'low', 9, false, 'Ten slides, five minutes each.']
    ];
    return rows.map(function (row, i) {
      let base = sanitiseTask({ title: row[0], priority: row[1], due: iso(row[2]), done: row[3], notes: row[4] }, i);
      return Object.assign(base, { createdAt: Date.now() - (rows.length - i) * 3600000, order: i });
    });
  }

  function load() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return seedTasks();
    }
    if (!raw) return seedTasks();
    try {
      let parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.tasks)) throw new Error('bad shape');
      return parsed.tasks.map(sanitiseTask);
    } catch (err) {
      return seedTasks();
    }
  }

  function save() {
    try {
      let payload = JSON.stringify({ version: 1, tasks: state.tasks });
      window.localStorage.setItem(STORAGE_KEY, payload);
      setStorageSize(payload.length);
      return true;
    } catch (err) {
      toast('Could not save locally — storage is unavailable or full.', 'error');
      setStorageSize(0);
      return false;
    }
  }

  /* Closure: formats a byte count into a short human string. */
  let formatBytes = function (bytes) {
    if (!bytes) return '0 B';
    let units = ['B', 'KB', 'MB'];
    let value = bytes;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }
    return (value >= 10 || unitIndex === 0 ? Math.round(value) : value.toFixed(1)) + ' ' + units[unitIndex];
  };

  function setStorageSize(bytes) {
    state.bytes = bytes;
    if (el.storage) el.storage.textContent = 'STORE ' + formatBytes(bytes) + ' · ngsh.todo.v1';
  }

  function loadTheme() {
    let saved = null;
    try { saved = window.localStorage.getItem(THEME_KEY); } catch (err) { saved = null; }
    return saved === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    state.theme = theme;
    el.html.setAttribute('data-theme', theme);
    el.themeToggle.setAttribute('aria-pressed', theme === 'light' ? 'true' : 'false');
    el.themeLabel.textContent = theme === 'light' ? 'DARK' : 'LIGHT';
    try { window.localStorage.setItem(THEME_KEY, theme); } catch (err) { /* non-fatal */ }
  }

  /* =======================================================================
     2. DERIVED DATA — the only place the visible list is computed
     ===================================================================== */

  function isOverdue(task, todayIso) {
    return !task.done && !task.trashed && Boolean(task.due) && task.due < todayIso;
  }

  function todayIso() {
    let d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }

  function formatDue(iso) {
    if (!iso) return null;
    let parts = iso.split('-');
    if (parts.length !== 3) return iso;
    let months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let monthIndex = Number(parts[1]) - 1;
    return parts[2] + ' ' + (months[monthIndex] || parts[1]) + ' ' + parts[0];
  }

  function visibleTasks() {
    let query = state.query.trim().toLowerCase();
    let rows = state.tasks.filter(function (task) {
      if (state.filter === 'trash') return task.trashed;
      if (task.trashed) return false;
      if (state.filter === 'active') return !task.done;
      if (state.filter === 'completed') return task.done;
      return true;
    });

    if (query) {
      rows = rows.filter(function (task) {
        return (task.title + ' ' + task.notes).toLowerCase().indexOf(query) !== -1;
      });
    }

    let sorted = rows.slice();
    let byDue = function (a, b) {
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
    };

    if (state.sort === 'due') {
      sorted.sort(function (a, b) { return byDue(a, b) || a.order - b.order; });
    } else if (state.sort === 'priority') {
      sorted.sort(function (a, b) {
        return (PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]) || byDue(a, b);
      });
    } else if (state.sort === 'alpha') {
      sorted.sort(function (a, b) { return a.title.localeCompare(b.title); });
    } else {
      sorted.sort(function (a, b) { return a.order - b.order; });
    }
    return sorted;
  }

  function counts() {
    return {
      all: state.tasks.filter(function (t) { return !t.trashed; }).length,
      active: state.tasks.filter(function (t) { return !t.trashed && !t.done; }).length,
      completed: state.tasks.filter(function (t) { return !t.trashed && t.done; }).length,
      trash: state.tasks.filter(function (t) { return t.trashed; }).length
    };
  }

  function findTask(id) {
    return state.tasks.find(function (task) { return task.id === id; }) || null;
  }

  function nextOrder() {
    return state.tasks.reduce(function (max, task) { return Math.max(max, task.order); }, -1) + 1;
  }

  /* =======================================================================
     3. MUTATIONS — every one of these is followed by persist() + render()
     ===================================================================== */

  function commit() {
    save();
    render();
  }

  function addTask(payload) {
    let task = sanitiseTask({
      title: payload.title,
      notes: payload.notes,
      priority: payload.priority,
      due: payload.due
    }, 0);
    task.order = nextOrder();
    state.tasks.unshift(task);
    commit();
    return task;
  }

  function updateTask(id, patch) {
    let task = findTask(id);
    if (!task) return;
    if (typeof patch.title === 'string') task.title = patch.title;
    if (typeof patch.notes === 'string') task.notes = patch.notes;
    if (PRIORITY_RANK[patch.priority]) task.priority = patch.priority;
    if (typeof patch.due === 'string') task.due = patch.due;
    commit();
  }

  function toggleDone(id) {
    let task = findTask(id);
    if (!task) return;
    task.done = !task.done;
    task.completedAt = task.done ? Date.now() : null;
    commit();
  }

  /* Delete is reversible: the task moves to the trash and an UNDO action is
     offered for six seconds. The closure below holds the snapshot, so the undo
     works even if other tasks have been changed in the meantime. */
  function trashTask(id) {
    let task = findTask(id);
    if (!task) return null;
    let snapshot = Object.assign({}, task);
    task.trashed = true;
    task.done = false;
    commit();
    return snapshot;
  }

  function purgeTask(id) {
    state.tasks = state.tasks.filter(function (task) { return task.id !== id; });
    if (state.editingId === id) state.editingId = null;
    commit();
  }

  function restoreTask(snapshot) {
    let index = state.tasks.findIndex(function (task) { return task.id === snapshot.id; });
    let copy = Object.assign({}, snapshot, { trashed: false });
    if (index === -1) state.tasks.unshift(copy);
    else state.tasks[index] = copy;
    if (state.filter === 'trash') state.filter = 'all';
    commit();
  }

  /* Manual reorder used by the up/down arrows. It swaps the `order` values of
     the two neighbouring rows in the *current visible slice*, so the on-screen
     order always changes by exactly one step regardless of the active filter
     or sort, and no other row is disturbed. */
  function shiftVisible(id, direction) {
    let visible = visibleTasks();
    let index = visible.findIndex(function (task) { return task.id === id; });
    if (index === -1) return;
    let target = visible[index + direction];
    if (!target) return;
    let a = findTask(id);
    let b = findTask(target.id);
    if (!a || !b) return;
    let swap = a.order;
    a.order = b.order;
    b.order = swap;
    commit();
  }

  function reorderTo(sourceId, targetId, after) {
    if (sourceId === targetId) return;
    let source = findTask(sourceId);
    if (!source) return;
    let ordered = state.tasks.slice().sort(function (a, b) { return a.order - b.order; })
      .filter(function (task) { return task.id !== sourceId; });
    let at = ordered.findIndex(function (task) { return task.id === targetId; });
    if (at === -1) { commit(); return; }
    ordered.splice(after ? at + 1 : at, 0, source);
    ordered.forEach(function (task, i) { task.order = i; });
    commit();
  }

  /* Closure: simulates the small async cost of a destructive bulk action and
     the FileReader-based import. Kept in one place so both read the same way. */
  let delay = function (ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  };

  function completeAllActive() {
    let changed = 0;
    state.tasks.forEach(function (task) {
      if (!task.trashed && !task.done) { task.done = true; task.completedAt = Date.now(); changed += 1; }
    });
    return changed;
  }

  function clearCompleted() {
    let before = state.tasks.length;
    state.tasks = state.tasks.filter(function (task) { return task.trashed || !task.done; });
    return before - state.tasks.length;
  }

  function emptyTrash() {
    let before = state.tasks.length;
    state.tasks = state.tasks.filter(function (task) { return !task.trashed; });
    return before - state.tasks.length;
  }

  /* =======================================================================
     4. RENDER — the single place the list DOM is rebuilt
     ===================================================================== */

  function buildMeta(task) {
    let parts = [];
    if (state.filter === 'trash') {
      parts.push('Trashed');
    } else {
      parts.push(PRIORITY_LABEL[task.priority]);
      if (task.due) {
        let overdue = isOverdue(task, todayIso());
        parts.push('due ' + formatDue(task.due));
        if (overdue) parts.push('OVERDUE');
      }
    }
    let node = document.createElement('p');
    node.className = 'task__meta';
    let text = parts.join(' \u00b7 ');
    if (parts[parts.length - 1] === 'OVERDUE') {
      node.appendChild(document.createTextNode(text.slice(0, -8)));
      let flag = document.createElement('span');
      flag.className = 'overdue';
      flag.textContent = '\u00b7 OVERDUE';
      node.appendChild(flag);
    } else {
      node.textContent = text;
    }
    if (task.notes) {
      let preview = document.createElement('span');
      preview.textContent = '\u00b7 ' + task.notes.slice(0, 48) + (task.notes.length > 48 ? '\u2026' : '');
      node.appendChild(preview);
    }
    return node;
  }

  function iconButton(action, glyph, label, extra) {
    let button = document.createElement('button');
    button.type = 'button';
    button.className = 'icon-btn';
    button.setAttribute('data-action', action);
    button.setAttribute('aria-label', label);
    button.title = label;
    button.textContent = glyph;
    if (extra) Object.keys(extra).forEach(function (key) { button.setAttribute(key, extra[key]); });
    return button;
  }

  function buildEditor(task) {
    let form = document.createElement('form');
    form.className = 'task__editor';
    form.setAttribute('data-editor-for', task.id);

    let titleField = document.createElement('div');
    titleField.className = 'field';
    let titleLabel = document.createElement('label');
    titleLabel.className = 'field__label';
    titleLabel.setAttribute('for', 'edit-title-' + task.id);
    titleLabel.textContent = 'Title';
    let titleInput = document.createElement('input');
    titleInput.className = 'field__input';
    titleInput.type = 'text';
    titleInput.id = 'edit-title-' + task.id;
    titleInput.name = 'title';
    titleInput.value = task.title;
    titleInput.maxLength = 120;
    let titleError = document.createElement('p');
    titleError.className = 'field__error';
    titleError.id = 'edit-title-error-' + task.id;
    titleError.setAttribute('role', 'alert');
    titleInput.setAttribute('aria-describedby', titleError.id);
    titleField.append(titleLabel, titleInput, titleError);

    let priorityField = document.createElement('div');
    priorityField.className = 'field';
    let priorityLabel = document.createElement('label');
    priorityLabel.className = 'field__label';
    priorityLabel.setAttribute('for', 'edit-priority-' + task.id);
    priorityLabel.textContent = 'Priority';
    let prioritySelect = document.createElement('select');
    prioritySelect.className = 'field__input';
    prioritySelect.id = 'edit-priority-' + task.id;
    prioritySelect.name = 'priority';
    ['low', 'normal', 'high'].forEach(function (value) {
      let option = document.createElement('option');
      option.value = value;
      option.textContent = PRIORITY_LABEL[value];
      if (value === task.priority) option.selected = true;
      prioritySelect.appendChild(option);
    });
    priorityField.append(priorityLabel, prioritySelect);

    let dueField = document.createElement('div');
    dueField.className = 'field';
    let dueLabel = document.createElement('label');
    dueLabel.className = 'field__label';
    dueLabel.setAttribute('for', 'edit-due-' + task.id);
    dueLabel.textContent = 'Due date';
    let dueInput = document.createElement('input');
    dueInput.className = 'field__input';
    dueInput.type = 'date';
    dueInput.id = 'edit-due-' + task.id;
    dueInput.name = 'due';
    dueInput.value = task.due;
    dueField.append(dueLabel, dueInput);

    let notesField = document.createElement('div');
    notesField.className = 'field field--full';
    let notesLabel = document.createElement('label');
    notesLabel.className = 'field__label';
    notesLabel.setAttribute('for', 'edit-notes-' + task.id);
    notesLabel.textContent = 'Notes';
    let notesArea = document.createElement('textarea');
    notesArea.className = 'field__input field__input--area';
    notesArea.id = 'edit-notes-' + task.id;
    notesArea.name = 'notes';
    notesArea.rows = 2;
    notesArea.maxLength = 400;
    notesArea.value = task.notes;
    notesField.append(notesLabel, notesArea);

    let actions = document.createElement('div');
    actions.className = 'editor-actions';
    let saveBtn = document.createElement('button');
    saveBtn.type = 'submit';
    saveBtn.className = 'btn btn--primary btn--sm';
    saveBtn.textContent = 'Save';
    let cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn btn--ghost btn--sm';
    cancelBtn.setAttribute('data-action', 'cancel-edit');
    cancelBtn.textContent = 'Cancel';
    let toggleBtn = document.createElement('button');
    toggleBtn.type = 'button';
    toggleBtn.className = 'btn btn--ghost btn--sm';
    toggleBtn.setAttribute('data-action', 'toggle-done');
    toggleBtn.textContent = task.done ? 'Mark active' : 'Mark complete';
    actions.append(saveBtn, cancelBtn, toggleBtn);

    form.append(titleField, priorityField, dueField, notesField, actions);
    return form;
  }

  function buildTaskNode(task, index, total) {
    let li = document.createElement('li');
    li.className = 'task' + (task.trashed ? ' is-trash' : '');
    li.setAttribute('data-id', task.id);
    li.setAttribute('data-priority', task.priority);
    li.setAttribute('data-done', task.done ? 'true' : 'false');
    li.setAttribute('role', 'listitem');
    li.draggable = !task.trashed;

    let row = document.createElement('div');
    row.className = 'task__row';

    let indexCell = document.createElement('span');
    indexCell.className = 'task__index';
    indexCell.textContent = String(index + 1).padStart(2, '0');

    let check = document.createElement('input');
    check.type = 'checkbox';
    check.className = 'task__check';
    check.checked = task.done;
    check.setAttribute('data-action', 'toggle-check');
    check.setAttribute('aria-label', (task.done ? 'Mark incomplete: ' : 'Mark complete: ') + task.title);

    let body = document.createElement('div');
    body.className = 'task__body';
    let title = document.createElement('p');
    title.className = 'task__title';
    title.textContent = task.title;
    title.title = 'Double-click to rename';
    body.append(title, buildMeta(task));

    let actions = document.createElement('div');
    actions.className = 'task__actions';

    let up = iconButton('move-up', '\u2191', 'Move up');
    up.disabled = index === 0;
    let down = iconButton('move-down', '\u2193', 'Move down');
    down.disabled = index === total - 1;

    let edit = iconButton('toggle-edit', task.trashed ? '\u2713' : '\u270e',
      task.trashed ? 'Restore task' : 'Edit task', { 'aria-expanded': state.editingId === task.id ? 'true' : 'false' });

    actions.append(up, down, edit, iconButton(task.trashed ? 'purge' : 'delete', '\u00d7',
      task.trashed ? 'Delete permanently' : 'Move to trash'));

    row.append(indexCell, check, body, actions);
    li.appendChild(row);

    if (!task.trashed && state.editingId === task.id) {
      li.appendChild(buildEditor(task));
    }
    return li;
  }

  function renderStats(visible) {
    let stats = counts();
    let live = state.tasks.filter(function (task) { return !task.trashed; });
    let done = stats.completed;
    let percent = live.length ? Math.round((done / live.length) * 100) : 0;
    let today = todayIso();
    let overdue = live.filter(function (task) { return isOverdue(task, today); }).length;

    el.percent.textContent = '';
    el.percent.appendChild(document.createTextNode(String(percent)));
    let unit = document.createElement('span');
    unit.className = 'stat-big__unit';
    unit.textContent = '%';
    el.percent.appendChild(unit);

    el.progressFill.style.width = percent + '%';
    el.progressWrap.setAttribute('aria-label', percent + '% of tasks completed');

    $$('[data-stat]').forEach(function (node) {
      let key = node.getAttribute('data-stat');
      let map = { total: stats.all, active: stats.active, completed: done, overdue: overdue };
      node.textContent = map[key] !== undefined ? String(map[key]) : '0';
    });

    $$('[data-count]').forEach(function (node) {
      let key = node.getAttribute('data-count');
      node.textContent = String(stats[key] !== undefined ? stats[key] : 0);
    });

    el.readout.textContent = stats.active + ' OPEN';
  }

  function render() {
    let visible = visibleTasks();

    el.list.textContent = '';
    let fragment = document.createDocumentFragment();
    visible.forEach(function (task, index) {
      fragment.appendChild(buildTaskNode(task, index, visible.length));
    });
    el.list.appendChild(fragment);

    let countsMap = counts();
    if (visible.length) {
      el.empty.hidden = true;
      el.list.hidden = false;
      el.summary.textContent = visible.length + ' of ' + countsMap.all + ' shown \u00b7 filter ' + state.filter +
        (state.query ? ' \u00b7 search "' + state.query + '"' : '') + ' \u00b7 sorted by ' + state.sort;
    } else {
      el.list.hidden = true;
      el.empty.hidden = false;
      el.summary.textContent = 'Nothing matches the current view.';
      let messages = {
        all: 'No tasks yet. Add your first one above.',
        active: 'No active tasks. Everything is complete.',
        completed: 'No completed tasks yet.',
        trash: 'The trash is empty.'
      };
      el.emptyMsg.textContent = state.query
        ? 'No tasks match "' + state.query + '".'
        : messages[state.filter];
      el.emptyReset.hidden = state.filter === 'all' && !state.query;
      el.emptyReset.textContent = state.query || state.sort !== 'manual' ? 'Reset filters' : 'Reset everything';
    }

    $$('[role="tab"]').forEach(function (tab) {
      let isActive = tab.getAttribute('data-filter') === state.filter;
      tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
      tab.tabIndex = isActive ? 0 : -1;
    });

    renderStats(visible);
  }

  /* =======================================================================
     5. TOASTS — including the six-second UNDO window
     ===================================================================== */

  function toast(message, kind, action) {
    let node = document.createElement('div');
    node.className = 'toast';
    node.setAttribute('data-kind', kind || 'info');
    node.setAttribute('role', kind === 'error' ? 'alert' : 'status');

    let text = document.createElement('p');
    text.className = 'toast__msg';
    text.textContent = message;
    node.appendChild(text);

    let timer = null;
    let dismiss = function () {
      if (timer) window.clearTimeout(timer);
      node.classList.add('is-out');
      window.setTimeout(function () { if (node.parentNode) node.parentNode.removeChild(node); }, 280);
    };

    if (action) {
      let button = document.createElement('button');
      button.type = 'button';
      button.className = 'toast__action';
      button.textContent = action.label;
      button.addEventListener('click', function () {
        action.run();
        dismiss();
      });
      node.appendChild(button);
    }

    el.toasts.appendChild(node);
    timer = window.setTimeout(dismiss, action ? UNDO_MS : TOAST_MS);
    return dismiss;
  }

  /* =======================================================================
     6. VALIDATION
     ===================================================================== */

  function validateTitle(value) {
    let trimmed = value.trim();
    if (!trimmed) return { ok: false, message: 'A title is required.' };
    if (trimmed.length < TITLE_MIN) return { ok: false, message: 'Use at least ' + TITLE_MIN + ' characters.' };
    if (trimmed.length > TITLE_MAX) return { ok: false, message: 'Keep the title under ' + TITLE_MAX + ' characters.' };
    return { ok: true, message: '' };
  }

  function setFieldError(input, errorNode, result) {
    if (result.ok) {
      input.removeAttribute('aria-invalid');
      errorNode.textContent = '';
    } else {
      input.setAttribute('aria-invalid', 'true');
      errorNode.textContent = result.message;
    }
    return result.ok;
  }

  /* =======================================================================
     7. EVENTS — delegated wherever the target is dynamic
     ===================================================================== */

  el.form.addEventListener('submit', function (event) {
    event.preventDefault();
    let result = validateTitle(el.title.value);
    let titleValid = setFieldError(el.title, el.titleError, result);

    if (!titleValid) {
      el.title.focus();
      return;
    }

    addTask({
      title: el.title.value,
      notes: el.notes.value,
      priority: el.priority.value,
      due: el.due.value
    });

    el.form.reset();
    el.priority.value = 'normal';
    el.title.removeAttribute('aria-invalid');
    el.titleError.textContent = '';
    el.dueError.textContent = '';
    el.counter.textContent = '0/' + TITLE_MAX;
    el.title.focus();

    toast('Task added.', 'info');
  });

  el.title.addEventListener('input', function () {
    el.counter.textContent = el.title.value.trim().length + '/' + TITLE_MAX;
    if (el.title.getAttribute('aria-invalid') === 'true') {
      setFieldError(el.title, el.titleError, validateTitle(el.title.value));
    }
  });

  el.due.addEventListener('input', function () {
    el.dueError.textContent = '';
    el.due.removeAttribute('aria-invalid');
  });

  /* --- Event delegation on the task list: ONE listener for every row. ----- */
  el.list.addEventListener('click', function (event) {
    let target = event.target.closest('[data-action]');
    if (!target) return;
    let action = target.getAttribute('data-action');
    let li = target.closest('.task');
    if (!li) return;
    let id = li.getAttribute('data-id');
    let task = findTask(id);
    if (!task) return;

    switch (action) {
      case 'toggle-edit':
        if (task.trashed) {
          restoreTask(task);
          toast('Task restored from trash.', 'info');
          break;
        }
        state.editingId = state.editingId === id ? null : id;
        render();
        if (state.editingId) {
          let input = document.getElementById('edit-title-' + id);
          if (input) { input.focus(); input.select(); }
        }
        break;
      case 'cancel-edit':
        state.editingId = null;
        render();
        break;
      case 'move-up':
        shiftVisible(id, -1);
        break;
      case 'move-down':
        shiftVisible(id, 1);
        break;
      case 'purge':
        purgeTask(id);
        toast('Deleted permanently.', 'info');
        break;
      case 'delete':
        let snapshot = trashTask(id);
        if (state.editingId === id) state.editingId = null;
        render();
        toast('Moved to trash.', 'info', {
          label: 'Undo',
          run: function () { restoreTask(snapshot); toast('Task restored.', 'info'); }
        });
        break;
      case 'toggle-done': {
        let form = target.closest('form');
        if (form) {
          let update = {
            title: form.elements.title.value,
            notes: form.elements.notes.value,
            priority: form.elements.priority.value,
            due: form.elements.due.value
          };
          if (!setFieldError(
            form.elements.title,
            form.querySelector('.field__error'),
            validateTitle(update.title)
          )) return;
        }
        toggleDone(id);
        state.editingId = null;
        render();
        break;
      }
      default:
        break;
    }
  });

  /* Checkboxes live inside the delegated container, so a change listener on
     the <ul> covers rows that did not exist when the page loaded. */
  el.list.addEventListener('change', function (event) {
    let target = event.target.closest('[data-action="toggle-check"]');
    if (!target) return;
    let li = target.closest('.task');
    if (!li) return;
    toggleDone(li.getAttribute('data-id'));
  });

  /* Delegated submit for the per-task editors, which are created dynamically. */
  el.list.addEventListener('submit', function (event) {
    let form = event.target.closest('[data-editor-for]');
    if (!form) return;
    event.preventDefault();
    let id = form.getAttribute('data-editor-for');
    let titleInput = form.elements.title;
    let errorNode = form.querySelector('.field__error');
    let result = validateTitle(titleInput.value);
    if (!setFieldError(titleInput, errorNode, result)) {
      titleInput.focus();
      return;
    }
    updateTask(id, {
      title: titleInput.value,
      notes: form.elements.notes.value,
      priority: form.elements.priority.value,
      due: form.elements.due.value
    });
    state.editingId = null;
    render();
    toast('Task updated.', 'info');
  });

  /* Double-click to rename — closes the editor and focuses the title field. */
  el.list.addEventListener('dblclick', function (event) {
    let title = event.target.closest('.task__title');
    if (!title) return;
    let li = title.closest('.task');
    if (!li) return;
    state.editingId = li.getAttribute('data-id');
    render();
    let input = document.getElementById('edit-title-' + state.editingId);
    if (input) { input.focus(); input.select(); }
  });

  /* --- Drag and drop reordering (progressive enhancement over the arrows) - */
  let dragId = null;

  el.list.addEventListener('dragstart', function (event) {
    let li = event.target.closest('.task');
    if (!li) return;
    dragId = li.getAttribute('data-id');
    li.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', dragId);
  });

  el.list.addEventListener('dragend', function () {
    dragId = null;
    $$('.task', el.list).forEach(function (node) {
      node.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after');
    });
  });

  el.list.addEventListener('dragover', function (event) {
    if (!dragId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    let li = event.target.closest('.task');
    $$('.task', el.list).forEach(function (node) {
      node.classList.remove('is-drop-before', 'is-drop-after');
    });
    if (!li || li.getAttribute('data-id') === dragId) return;
    let box = li.getBoundingClientRect();
    let after = (event.clientY - box.top) > box.height / 2;
    li.classList.add(after ? 'is-drop-after' : 'is-drop-before');
  });

  el.list.addEventListener('drop', function (event) {
    if (!dragId) return;
    event.preventDefault();
    let li = event.target.closest('.task');
    if (!li) return;
    let targetId = li.getAttribute('data-id');
    if (targetId === dragId) return;
    let box = li.getBoundingClientRect();
    let after = (event.clientY - box.top) > box.height / 2;
    reorderTo(dragId, targetId, after);
    dragId = null;
  });

  /* --- Tabs --------------------------------------------------------------- */
  el.tabs.addEventListener('click', function (event) {
    let tab = event.target.closest('[data-filter]');
    if (!tab) return;
    state.filter = tab.getAttribute('data-filter');
    state.editingId = null;
    render();
  });

  el.tabs.addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    let tabs = $$('[role="tab"]', el.tabs);
    let current = tabs.findIndex(function (tab) { return tab.getAttribute('aria-selected') === 'true'; });
    let next = event.key === 'ArrowRight'
      ? (current + 1) % tabs.length
      : (current - 1 + tabs.length) % tabs.length;
    tabs[next].focus();
    state.filter = tabs[next].getAttribute('data-filter');
    render();
    let active = $$('[role="tab"]', el.tabs).find(function (tab) { return tab.getAttribute('aria-selected') === 'true'; });
    if (active) active.focus();
  });

  el.sort.addEventListener('change', function () {
    state.sort = el.sort.value;
    render();
  });

  /* Closure: a debounce factory. The timer lives inside the returned closure,
     so only the most recent keystroke wins and stale searches never run. */
  let debounce = function (fn, wait) {
    let timer = null;
    return function () {
      let args = arguments;
      let self = this;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        timer = null;
        fn.apply(self, args);
      }, wait);
    };
  };

  let runSearch = debounce(function (value) {
    state.query = value;
    render();
  }, SEARCH_DEBOUNCE_MS);

  el.search.addEventListener('input', function () {
    let value = el.search.value;
    el.searchClear.hidden = value.length === 0;
    runSearch(value);
  });

  el.searchClear.addEventListener('click', function () {
    el.search.value = '';
    el.searchClear.hidden = true;
    state.query = '';
    render();
    el.search.focus();
  });

  el.emptyReset.addEventListener('click', function () {
    state.query = '';
    state.sort = 'manual';
    state.filter = 'all';
    el.search.value = '';
    el.searchClear.hidden = true;
    el.sort.value = 'manual';
    render();
  });

  /* --- Bulk actions ------------------------------------------------------- */
  $$('[data-bulk]').forEach(function (button) {
    button.addEventListener('click', async function () {
      let kind = button.getAttribute('data-bulk');

      if (kind === 'export') {
        let payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), tasks: state.tasks }, null, 2);
        let blob = new Blob([payload], { type: 'application/json' });
        let url = URL.createObjectURL(blob);
        let link = document.createElement('a');
        link.href = url;
        link.download = 'taskbook-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast('Exported ' + state.tasks.length + ' tasks.', 'info');
        return;
      }

      if (kind === 'import') {
        el.importFile.click();
        return;
      }

      button.disabled = true;
      await delay(180);
      let changed = 0;
      if (kind === 'complete-all') changed = completeAllActive();
      else if (kind === 'clear-completed') changed = clearCompleted();
      else if (kind === 'empty-trash') changed = emptyTrash();
      button.disabled = false;
      commit();

      let messages = {
        'complete-all': 'Completed ' + changed + ' task(s).',
        'clear-completed': 'Removed ' + changed + ' completed task(s).',
        'empty-trash': 'Emptied ' + changed + ' task(s) from the trash.'
      };
      toast(changed ? messages[kind] : 'Nothing to do.', changed ? 'info' : 'error');
    });
  });

  /* Closure: reads a File as text via FileReader wrapped in a Promise so the
     import flow can use async/await. */
  let readFileAsText = function (file) {
    return new Promise(function (resolve, reject) {
      let reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result)); };
      reader.onerror = function () { reject(new Error('The file could not be read.')); };
      reader.readAsText(file);
    });
  };

  el.importFile.addEventListener('change', async function () {
    let file = el.importFile.files && el.importFile.files[0];
    el.importFile.value = '';
    if (!file) return;

    try {
      let text = await readFileAsText(file);
      let parsed = JSON.parse(text);
      let rows = Array.isArray(parsed) ? parsed : parsed && parsed.tasks;
      if (!Array.isArray(rows) || rows.length === 0) {
        throw new Error('No tasks array was found in that file.');
      }
      let imported = rows.map(sanitiseTask).filter(function (task) {
        return task.title.trim().length >= TITLE_MIN;
      });
      if (!imported.length) {
        throw new Error('Every entry in that file was invalid.');
      }
      state.tasks = imported;
      state.filter = 'all';
      state.query = '';
      el.search.value = '';
      commit();
      toast('Imported ' + imported.length + ' task(s).', 'info');
    } catch (err) {
      toast(err.message || 'Import failed — the file was not valid JSON.', 'error');
    }
  });

  /* --- Theme, footer, global keyboard ------------------------------------- */
  el.themeToggle.addEventListener('click', function () {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
  });

  el.toTop.addEventListener('click', function () {
    let reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  document.addEventListener('keydown', function (event) {
    let active = document.activeElement;
    let typing = active && (
      active.tagName === 'INPUT' ||
      active.tagName === 'TEXTAREA' ||
      active.tagName === 'SELECT' ||
      active.isContentEditable
    );

    if (event.key === '/' && !typing) {
      event.preventDefault();
      el.search.focus();
      return;
    }

    if (event.key === 'n' && !typing && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      el.title.focus();
      return;
    }

    if (event.key === 'Escape') {
      if (state.editingId) {
        state.editingId = null;
        render();
        return;
      }
      if (el.search.value) {
        el.search.value = '';
        el.searchClear.hidden = true;
        state.query = '';
        render();
        return;
      }
      if (active && active.blur) active.blur();
      return;
    }

    if ((event.key === 'Delete' || event.key === 'Backspace') && !typing) {
      let row = document.activeElement && document.activeElement.closest('.task');
      if (row) {
        event.preventDefault();
        let id = row.getAttribute('data-id');
        let snapshot = trashTask(id);
        render();
        toast('Moved to trash.', 'info', {
          label: 'Undo',
          run: function () { restoreTask(snapshot); render(); }
        });
      }
    }
  });

  /* =======================================================================
     8. BOOT
     ===================================================================== */

  applyTheme(loadTheme());
  state.tasks = load();
  try {
    setStorageSize((window.localStorage.getItem(STORAGE_KEY) || '').length);
  } catch (err) {
    setStorageSize(0);
  }
  render();
})();