/* TaskFlow store. One reducer, one state object, subscribers notified after
   every action. Persists to localStorage and keeps undo/redo history. */
window.TaskFlowStore = (function () {
  'use strict';

  const Data = window.TaskFlowData;

  const STORAGE_KEY = 'ngsh.taskflow.v1';
  const SCHEMA_VERSION = 1;
  const HISTORY_LIMIT = 80;

  const TRANSIENT = new Set([
    'FILTER_SET',
    'FILTER_CLEAR',
    'VIEW_SET',
    'THEME_SET',
    'SYNC_SET',
    'FAIL_NEXT_SET',
    'UI_SET',
    'STATE_REPLACE'
  ]);

  /* Actions whose state change does not need writing back to localStorage. */
  const EPHEMERAL = new Set(['UI_SET', 'SYNC_SET', 'FAIL_NEXT_SET']);

  /* Action types that append to a card's activity log. */
  const LOGGED = new Set([
    'CARD_CREATE',
    'CARD_UPDATE',
    'CARD_MOVE',
    'CARD_DELETE',
    'CARD_TOGGLE_CHECK',
    'CHECK_ADD',
    'CHECK_REMOVE'
  ]);

  const DEFAULT_FILTERS = {
    query: '',
    priorities: [],
    tags: [],
    overdueOnly: false,
    showDone: true
  };

  /* ------------------------------------------------------------ selectors */

  function columnIndex(state, column) {
    return state.cards.findIndex((card) => card.column === column);
  }

  function checklistRatio(card) {
    const total = card.checklist.length;
    const done = card.checklist.filter((item) => item.done).length;
    return { done: done, total: total, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function isOverdue(card, today) {
    return Boolean(card.due) && card.column !== 'done' && card.due < today;
  }

  /* --------------------------------------------------------- state factory */

  function createInitialState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      cards: Data.buildSeedCards(),
      filters: Object.assign({}, DEFAULT_FILTERS, { priorities: [], tags: [] }),
      view: 'board',
      theme: 'dark',
      sync: {
        status: 'offline', /* offline | syncing | synced | error          */
        failNext: false, /* failure-injection toggle from settings      */
        runs: 0, /* completed round trips this session                 */
        lastAt: null,
        lastResult: null,
        error: null
      },
      ui: {
        modalKey: null,
        shortcutsOpen: false,
        settingsOpen: false,
        dragging: false
      }
    };
  }

  /* ------------------------------------------------------------- reducer */

  /* Pure helpers. Each returns a new object; nothing below mutates its input. */

  function withLog(card, row) {
    return Object.assign({}, card, {
      activity: card.activity.concat([row]),
      updatedAt: row.at
    });
  }

  /* Settle a card's activity log after a mutation.

     `row` is the row to append for a fresh user action. `restore` is the
     pre-action log captured by the history stack, and is present only when the
     store is replaying an undo or a redo: in that case the log is put back
     exactly as it was, so undoing a move does not leave the card sitting in
     BACKLOG with a "Moved BACKLOG → IN PROGRESS" entry still in its history. */
  function settleActivity(card, restore, row) {
    if (!restore) return row ? withLog(card, row) : card;
    const last = restore.length ? restore[restore.length - 1] : null;
    return Object.assign({}, card, {
      activity: restore,
      updatedAt: last ? last.at : card.createdAt
    });
  }

  function cardKeyOf(action) {
    const payload = action.payload || {};
    if (payload.key) return payload.key;
    if (payload.card && payload.card.key) return payload.card.key;
    return null;
  }

  function mapCard(cards, key, updater) {
    let found = false;
    const next = cards.map((card) => {
      if (card.key !== key) return card;
      found = true;
      return updater(card);
    });
    return found ? next : null;
  }

  /* Insert `card` into `cards` so that it becomes the `slot`-th card of its own
     column, counting from zero. `slot` is clamped to the column's length, and a
     slot past the last card inserts directly after the final sibling rather than
     at the end of the array — the global ordering interleaves columns, so those
     two positions are not the same thing. */
  function insertIntoColumn(cards, card, slot) {
    const siblings = cards.filter((item) => item.column === card.column);
    const clamped = Math.max(0, Math.min(slot, siblings.length));

    let seen = 0;
    let insertAt = -1;
    for (let index = 0; index < cards.length; index += 1) {
      if (cards[index].column !== card.column) continue;
      if (seen === clamped) {
        insertAt = index;
        break;
      }
      seen += 1;
    }

    if (insertAt === -1) {
      insertAt = cards.length;
      for (let index = cards.length - 1; index >= 0; index -= 1) {
        if (cards[index].column === card.column) {
          insertAt = index + 1;
          break;
        }
      }
    }

    const next = cards.slice();
    next.splice(insertAt, 0, card);
    return next;
  }

  /* Reposition one card.

     Index convention: `toIndex` is the ordinal slot the card should occupy in
     the destination column once it has been lifted out of its current position.
     Both branches below therefore remove first and insert second, which makes
     "drop above the first card" (0), "drop below the last card" (the remaining
     length) and a same-column no-op all fall out of the same arithmetic with no
     off-by-one correction.

     Returns null when the move is a no-op, which is the reducer's signal to
     keep the previous state object identity and leave the history untouched. */
  function moveWithin(cards, key, toColumn, toIndex) {
    const card = cards.find((item) => item.key === key);
    if (!card) return null;

    const siblings = cards.filter((item) => item.column === toColumn);
    const currentSlot = siblings.findIndex((item) => item.key === key);
    const target = Math.max(0, Math.min(toIndex, Math.max(0, siblings.length - 1)));
    if (card.column === toColumn && target === currentSlot) return null;

    const without = cards.filter((item) => item.key !== key);
    return insertIntoColumn(without, Object.assign({}, card, { column: toColumn }), toIndex);
  }

  function reducer(state, action) {
    const payload = action.payload || {};
    const now = payload.at;
    const restore = Array.isArray(payload.restoreActivity) ? payload.restoreActivity : null;

    switch (action.type) {
      case 'CARD_CREATE': {
        const card = payload.card;
        if (!card || typeof card.key !== 'string') return state;
        if (state.cards.some((item) => item.key === card.key)) return state;

        const created = Object.assign({}, card, {
          activity: [
            {
              id: Data.makeId('a'),
              type: 'created',
              at: now,
              from: null,
              to: card.column,
              text: 'Created in ' + Data.columnName(card.column)
            }
          ],
          createdAt: now,
          updatedAt: now
        });

        const siblings = state.cards.filter((item) => item.column === card.column);
        return Object.assign({}, state, {
          cards: insertIntoColumn(state.cards, created, siblings.length)
        });
      }

      case 'CARD_UPDATE': {
        const cards = mapCard(state.cards, payload.key, (card) => {
          const updated = Object.assign({}, card, payload.patch);
          return settleActivity(updated, restore, {
            id: Data.makeId('a'),
            type: 'edited',
            at: now,
            from: null,
            to: null,
            text: payload.log || 'Edited'
          });
        });
        return cards ? Object.assign({}, state, { cards: cards }) : state;
      }

      case 'CARD_DELETE': {
        const cards = state.cards.filter((item) => item.key !== payload.key);
        if (cards.length === state.cards.length) return state;
        return Object.assign({}, state, { cards: cards });
      }

      case 'CARD_RESTORE': {
        const card = payload.card;
        if (!card || state.cards.some((item) => item.key === card.key)) return state;
        const cards = state.cards.slice();
        const index = Math.max(0, Math.min(payload.index, cards.length));
        cards.splice(index, 0, card);
        return Object.assign({}, state, { cards: cards });
      }

      case 'CARD_MOVE': {
        const current = state.cards.find((item) => item.key === payload.key);
        if (!current) return state;

        const cards = moveWithin(state.cards, payload.key, payload.toColumn, payload.toIndex);
        if (!cards) return state;

        const movedCard = cards.find((item) => item.key === payload.key);
        if (movedCard.column === current.column) return Object.assign({}, state, { cards: cards });

        const stamped = mapCard(cards, payload.key, (card) =>
          settleActivity(card, restore, {
            id: Data.makeId('a'),
            type: 'moved',
            at: now,
            from: current.column,
            to: payload.toColumn,
            text: 'Moved ' + Data.columnName(current.column) + ' → ' + Data.columnName(payload.toColumn)
          })
        );
        return Object.assign({}, state, { cards: stamped });
      }

      case 'CARD_TOGGLE_CHECK': {
        const cards = mapCard(state.cards, payload.key, (card) => {
          let flipped = false;
          const checklist = card.checklist.map((item) => {
            if (item.id !== payload.itemId) return item;
            flipped = true;
            return Object.assign({}, item, { done: !item.done });
          });
          if (!flipped) return card;

          const updated = Object.assign({}, card, { checklist: checklist });
          const ratio = checklistRatio(updated);
          return settleActivity(updated, restore, {
            id: Data.makeId('a'),
            type: 'checklist',
            at: now,
            from: null,
            to: null,
            text: 'Checklist ' + ratio.done + '/' + ratio.total
          });
        });
        return cards ? Object.assign({}, state, { cards: cards }) : state;
      }

      case 'CHECK_ADD': {
        const text = typeof payload.text === 'string' ? payload.text.trim() : '';
        if (!text) return state;
        const done = payload.done === true;
        const cards = mapCard(state.cards, payload.key, (card) => {
          const updated = Object.assign({}, card, {
            checklist: card.checklist.concat([{ id: Data.makeId('t'), text: text, done: done }])
          });
          const ratio = checklistRatio(updated);
          return settleActivity(updated, restore, {
            id: Data.makeId('a'),
            type: 'checklist',
            at: now,
            from: null,
            to: null,
            text: 'Added item · ' + ratio.done + '/' + ratio.total
          });
        });
        return cards ? Object.assign({}, state, { cards: cards }) : state;
      }

      case 'CHECK_REMOVE': {
        const cards = mapCard(state.cards, payload.key, (card) => {
          const checklist = card.checklist.filter((item) => item.id !== payload.itemId);
          if (checklist.length === card.checklist.length) return card;
          const updated = Object.assign({}, card, { checklist: checklist });
          const ratio = checklistRatio(updated);
          return settleActivity(updated, restore, {
            id: Data.makeId('a'),
            type: 'checklist',
            at: now,
            from: null,
            to: null,
            text: 'Removed item · ' + ratio.done + '/' + ratio.total
          });
        });
        return cards ? Object.assign({}, state, { cards: cards }) : state;
      }

      case 'FILTER_SET':
        return Object.assign({}, state, {
          filters: Object.assign({}, state.filters, payload.patch)
        });

      case 'FILTER_CLEAR':
        return Object.assign({}, state, {
          filters: Object.assign({}, DEFAULT_FILTERS, { priorities: [], tags: [] })
        });

      case 'VIEW_SET':
        return payload.view === 'timeline'
          ? Object.assign({}, state, { view: 'timeline' })
          : Object.assign({}, state, { view: 'board' });

      case 'THEME_SET':
        return Object.assign({}, state, {
          theme: payload.theme === 'light' ? 'light' : 'dark'
        });

      case 'SYNC_SET':
        return Object.assign({}, state, { sync: Object.assign({}, state.sync, payload.patch) });

      case 'FAIL_NEXT_SET':
        return Object.assign({}, state, {
          sync: Object.assign({}, state.sync, { failNext: payload.value === true })
        });

      case 'UI_SET':
        return Object.assign({}, state, { ui: Object.assign({}, state.ui, payload.patch) });

      case 'STATE_REPLACE': {
        const board = payload.board;
        if (!board || !Array.isArray(board.cards)) return state;
        return Object.assign({}, state, {
          cards: board.cards,
          filters: board.filters || Object.assign({}, DEFAULT_FILTERS),
          view: board.view === 'timeline' ? 'timeline' : 'board',
          theme: board.theme === 'light' ? 'light' : 'dark',
          ui: { modalKey: null, shortcutsOpen: false, settingsOpen: false, dragging: false }
        });
      }

      default:
        return state;
    }
  }

  /* --------------------------------------------------------- undo / redo */

  /* Given the action, the state it was applied to, and the state it produced,
     produce the action that exactly undoes it. This is what makes the history a
     command stack rather than a list of state snapshots.

     `prev` is where to look for values an action overwrote; `next` is where to
     look for values an action created (CHECK_ADD has to find the id of the item
     the reducer just minted). */
  function invert(action, prev, next) {
    const payload = action.payload || {};

    switch (action.type) {
      case 'CARD_CREATE':
        return { type: 'CARD_DELETE', payload: { key: payload.card.key } };

      case 'CARD_DELETE': {
        const index = prev.cards.findIndex((card) => card.key === payload.key);
        if (index === -1) return null;
        return { type: 'CARD_RESTORE', payload: { key: payload.key, card: prev.cards[index], index: index } };
      }

      case 'CARD_MOVE': {
        const previous = prev.cards.findIndex((card) => card.key === payload.key);
        if (previous === -1) return null;
        const card = prev.cards[previous];
        const siblings = prev.cards.filter((item) => item.column === card.column);
        const slot = siblings.findIndex((item) => item.key === card.key);
        return {
          type: 'CARD_MOVE',
          payload: { key: payload.key, toColumn: card.column, toIndex: slot }
        };
      }

      case 'CARD_UPDATE': {
        const card = prev.cards.find((item) => item.key === payload.key);
        if (!card) return null;
        const inverse = {};
        Object.keys(payload.patch || {}).forEach((field) => {
          inverse[field] = card[field];
        });
        if (!Object.keys(inverse).length) return null;
        return { type: 'CARD_UPDATE', payload: { key: payload.key, patch: inverse, log: 'Reverted edit' } };
      }

      case 'CARD_TOGGLE_CHECK': {
        const card = prev.cards.find((item) => item.key === payload.key);
        const item = card && card.checklist.find((entry) => entry.id === payload.itemId);
        if (!item) return null;
        /* Idempotent replay: the inverse of "flip" is "flip" again. */
        return { type: 'CARD_TOGGLE_CHECK', payload: { key: payload.key, itemId: item.id } };
      }

      case 'CHECK_ADD': {
        /* The item does not exist in `prev` — it is the one the reducer just
           created — so the id has to come from `next`. The reducer appends, so
           the last item with this text is the new one even if the card already
           had an identically worded item. */
        const card = next.cards.find((item) => item.key === payload.key);
        if (!card) return null;
        const matches = card.checklist.filter((entry) => entry.text === payload.text);
        const added = matches[matches.length - 1];
        if (!added) return null;
        return { type: 'CHECK_REMOVE', payload: { key: payload.key, itemId: added.id } };
      }

      case 'CHECK_REMOVE': {
        const card = prev.cards.find((item) => item.key === payload.key);
        const item = card && card.checklist.find((entry) => entry.id === payload.itemId);
        if (!item) return null;
        /* Carry `done` across so undoing the removal of a ticked box brings the
           tick back rather than resetting the ratio. */
        return { type: 'CHECK_ADD', payload: { key: payload.key, text: item.text, done: item.done } };
      }

      default:
        return null;
    }
  }

  /* Human-readable label for the next undo/redo, shown in the header. */
  function labelFor(action) {
    const payload = action.payload || {};
    switch (action.type) {
      case 'CARD_CREATE':
        return 'CREATE ' + payload.card.key;
      case 'CARD_MOVE':
        return 'MOVE ' + payload.key + ' → ' + Data.columnName(payload.toColumn);
      case 'CARD_DELETE':
        return 'DELETE ' + payload.key;
      case 'CARD_UPDATE':
        return 'EDIT ' + payload.key;
      case 'CARD_TOGGLE_CHECK':
        return 'CHECK ' + payload.key;
      case 'CHECK_ADD':
        return 'CHECKLIST + ' + payload.key;
      case 'CHECK_REMOVE':
        return 'CHECKLIST − ' + payload.key;
      case 'CARD_RESTORE':
        return 'RESTORE ' + payload.key;
      default:
        return action.type;
    }
  }

  const history = { past: [], future: [] };

  function pushHistory(entry) {
    history.past.push(entry);
    if (history.past.length > HISTORY_LIMIT) history.past.shift();
    history.future.length = 0;
  }

  /* ------------------------------------------------------ persistence */

  const boot = loadState();
  let state = boot.state;
  let storageOk = boot.storageOk;
  let persistTimer = 0;

  const listeners = [];

  function serialise() {
    return {
      schemaVersion: SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      cards: state.cards,
      filters: state.filters,
      view: state.view,
      theme: state.theme
    };
  }

  function schedulePersist() {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(persistNow, 300);
  }

  function persistNow() {
    if (persistTimer) {
      clearTimeout(persistTimer);
      persistTimer = 0;
    }
    if (!storageOk) return null;
    let payload = null;
    try {
      payload = JSON.stringify(serialise());
      window.localStorage.setItem(STORAGE_KEY, payload);
      return payload.length;
    } catch (error) {
      /* Quota exceeded or storage revoked mid-session: keep running from
         memory rather than throwing into the render loop. */
      storageOk = false;
      return null;
    }
  }

  function migrateV0(raw) {
    /* The v0 shape: no schemaVersion, cards keyed by an uppercase `status`
       instead of `column`, checklist entries as bare strings, and no timeline
       fields. */
    const mapped = {
      schemaVersion: SCHEMA_VERSION,
      savedAt: raw.savedAt || new Date().toISOString(),
      cards: raw.cards.map((card, index) => ({
        key: card.key,
        title: card.title,
        notes: typeof card.notes === 'string' ? card.notes : '',
        priority: card.priority,
        tags: Array.isArray(card.tags) ? card.tags : [],
        column: String(card.status || card.column || '').toLowerCase(),
        due: card.due || null,
        week: index + 1,
        span: 1,
        checklist: (card.checklist || []).map((item) =>
          typeof item === 'string' ? { text: item, done: false } : item
        ),
        activity: Array.isArray(card.activity) ? card.activity : [],
        createdAt: card.createdAt || new Date().toISOString(),
        updatedAt: card.updatedAt || card.createdAt || new Date().toISOString()
      })),
      filters: raw.filters,
      view: raw.view,
      theme: raw.theme
    };
    return mapped;
  }

  /* Returns the persisted state, plus a notice describing what happened so the
     app can tell the user rather than silently swallowing a broken store. */
  function loadState() {
    let raw = null;
    try {
      raw = window.localStorage.getItem(STORAGE_KEY);
    } catch (error) {
      return {
        state: createInitialState(),
        storageOk: false,
        notice: { level: 'warn', text: 'LOCALSTORAGE UNAVAILABLE — RUNNING IN MEMORY' }
      };
    }

    if (raw === null || raw === '') {
      return { state: createInitialState(), storageOk: true, notice: null };
    }

    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      return {
        state: createInitialState(),
        storageOk: true,
        notice: { level: 'error', text: 'CORRUPT STORE - SAMPLE DATA RESTORED' }
      };
    }

    if (!parsed || typeof parsed !== 'object') {
      return {
        state: createInitialState(),
        storageOk: true,
        notice: { level: 'error', text: 'CORRUPT STORE - SAMPLE DATA RESTORED' }
      };
    }

    let candidate = parsed;
    let migrated = false;

    if (parsed.schemaVersion === undefined) {
      candidate = migrateV0(parsed);
      migrated = true;
    } else if (parsed.schemaVersion > SCHEMA_VERSION) {
      return {
        state: createInitialState(),
        storageOk: true,
        notice: {
          level: 'error',
          text: 'STORE IS v' + parsed.schemaVersion + ' - NEWER THAN THIS BUILD. SAMPLE DATA RESTORED'
        }
      };
    }

    const result = Data.validateBoard(candidate);
    if (!result.ok) {
      return {
        state: createInitialState(),
        storageOk: true,
        notice: {
          level: 'error',
          text: 'UNREADABLE STORE (' + result.errors.length + ' problems) - SAMPLE DATA RESTORED'
        }
      };
    }

    const restored = Object.assign(createInitialState(), {
      cards: result.board.cards,
      filters: result.board.filters,
      view: result.board.view,
      theme: result.board.theme
    });

    return {
      state: restored,
      storageOk: true,
      notice: migrated ? { level: 'warn', text: 'STORE MIGRATED v0 → v' + SCHEMA_VERSION } : null
    };
  }

  /* ------------------------------------------------------------ dispatch */

  /* Fill in the activity-log timestamp so the reducer stays clock-free. */
  function normaliseAction(action) {
    if (!LOGGED.has(action.type)) return action;
    const payload = action.payload || {};
    if (typeof payload.at === 'string') return action;
    return Object.assign({}, action, {
      payload: Object.assign({}, payload, { at: new Date().toISOString() })
    });
  }

  function dispatch(rawAction) {
    if (!rawAction || typeof rawAction.type !== 'string') return state;
    const action = normaliseAction(rawAction);
    const prevState = state;

    /* Snapshot the affected card's log before the action runs, so the history
       entry can restore it on undo or redo. */
    const targetKey = cardKeyOf(action);
    const targetCard = targetKey ? prevState.cards.find((card) => card.key === targetKey) : null;
    const activityBefore = targetCard ? targetCard.activity : null;

    state = reducer(prevState, action);

    const skipHistory = TRANSIENT.has(action.type) || Boolean(action.meta && action.meta.skipHistory);

    if (!skipHistory && state !== prevState) {
      const inverse = invert(action, prevState, state);
      if (inverse) {
        pushHistory({
          label: labelFor(action),
          do: { type: action.type, payload: action.payload },
          undo: inverse,
          activity: activityBefore
        });
      }
    }

    if (!EPHEMERAL.has(action.type)) schedulePersist();

    const snapshot = state;
    listeners.slice().forEach((listener) => listener(snapshot, action));
    return snapshot;
  }

  /* Replay a stored action without re-recording it in history.

     Undo restores the pre-action activity log, so the card's history matches the
     state being rolled back to. Redo does not: it re-applies the original
     forward action and lets it append a fresh row stamped at the moment of the
     redo, which is both truthful and keeps `updatedAt` meaningful. */
  function replay(entry, direction) {
    const action = entry[direction];
    if (!action) return null;
    const payload =
      direction === 'undo'
        ? Object.assign({}, action.payload, { restoreActivity: entry.activity })
        : action.payload;
    dispatch({ type: action.type, payload: payload, meta: { skipHistory: true } });
    return action;
  }

  /* The entry is moved across the history boundary *before* it is replayed.
     replay() dispatches, which notifies subscribers, so pushing afterwards
     would show every listener a canRedo()/canUndo() that is one step stale —
     the Redo button would stay disabled right after an undo. */
  function undo() {
    const entry = history.past.pop();
    if (!entry) return null;
    history.future.push(entry);
    replay(entry, 'undo');
    return entry.label;
  }

  function redo() {
    const entry = history.future.pop();
    if (!entry) return null;
    history.past.push(entry);
    replay(entry, 'do');
    return entry.label;
  }

  /* ------------------------------------------------------------- public */

  return {
    STORAGE_KEY: STORAGE_KEY,
    SCHEMA_VERSION: SCHEMA_VERSION,
    HISTORY_LIMIT: HISTORY_LIMIT,

    getState() {
      return state;
    },

    dispatch: dispatch,

    subscribe(listener) {
      listeners.push(listener);
      return () => {
        const index = listeners.indexOf(listener);
        if (index !== -1) listeners.splice(index, 1);
      };
    },

    undo: undo,
    redo: redo,

    canUndo() {
      return history.past.length > 0;
    },

    canRedo() {
      return history.future.length > 0;
    },

    nextUndoLabel() {
      return history.past.length ? history.past[history.past.length - 1].label : null;
    },

    nextRedoLabel() {
      return history.future.length ? history.future[history.future.length - 1].label : null;
    },

    historyDepth() {
      return { past: history.past.length, future: history.future.length };
    },

    /* selectors kept here so both the store and the renderer agree */
    columnIndex: columnIndex,
    checklistRatio: checklistRatio,
    isOverdue: isOverdue,

    /* -------------------------------------------------------- persistence */

    bootNotice: boot.notice,
    isStorageAvailable() {
      return storageOk;
    },
    storageBytes() {
      if (!storageOk) return 0;
      try {
        return (window.localStorage.getItem(STORAGE_KEY) || '').length;
      } catch (error) {
        return 0;
      }
    },
    /* Force the debounced write out immediately — used on pagehide and before
       export so what is on disk always matches what is on screen. */
    flush: persistNow,

    resetToSeed() {
      dispatch({
        type: 'STATE_REPLACE',
        payload: {
          board: {
            cards: Data.buildSeedCards(),
            filters: Object.assign({}, DEFAULT_FILTERS, { priorities: [], tags: [] }),
            view: state.view,
            theme: state.theme
          }
        }
      });
      history.past.length = 0;
      history.future.length = 0;
      return state;
    },

    exportJSON() {
      return JSON.stringify(Object.assign({ exportedAt: new Date().toISOString() }, serialise()), null, 2);
    },

    importJSON(text) {
      let parsed = null;
      try {
        parsed = JSON.parse(text);
      } catch (error) {
        return { ok: false, errors: ['File is not valid JSON.'] };
      }
      const result = Data.validateBoard(parsed);
      if (!result.ok) return { ok: false, errors: result.errors };
      dispatch({ type: 'STATE_REPLACE', payload: { board: result.board } });
      return { ok: true, errors: [], count: result.board.cards.length };
    }
  };
})();
