/* Quiz Arena. Classic script wrapped in an IIFE. Only the two demo helpers
   named in the brief (exportAllScores, importScores) touch window. */
(function () {
  'use strict';

  /* ------------------------------------------------------- 01 CONSTANTS */

  const STORAGE_KEYS = {
    scores: 'ngsh.quiz.scores.v1',
    prefs: 'ngsh.quiz.prefs.v1'
  };

  /** Timer model: 30 seconds PER QUESTION, reset on every new question. */
  const SECONDS_PER_QUESTION = 30;
  const BUILD_MIN_MS = 500;
  const REMOTE_FETCH_TIMEOUT_MS = 1200;
  const REMOTE_BANK_URL = 'assets/questions.json';
  const TOAST_MS = 3200;
  const AUTO_ADVANCE_MS = 1000;
  const ARM_WINDOW_MS = 4000;
  const MAX_BOARD_ENTRIES = 50;
  const MAX_BOARD_ROWS = 10;
  const RING_CIRCUMFERENCE = 351.86;
  const LETTERS = ['A', 'B', 'C', 'D'];

  const TOPIC_META = {
    html: { label: 'HTML Semantics', blurb: 'Landmarks, forms, native validation' },
    css: { label: 'CSS Layout', blurb: 'Flexbox, Grid, positioning' },
    js: { label: 'JavaScript', blurb: 'DOM, events, ES6, task ordering' },
    responsive: { label: 'Responsive', blurb: 'Mobile-first queries, breakpoints' },
    a11y: { label: 'Accessibility', blurb: 'Names, roles, keyboard, ARIA' },
    git: { label: 'Git & GitHub', blurb: 'Index, history, rebasing' },
    devtools: { label: 'DevTools', blurb: 'Elements, Network, Performance' }
  };

  const GRADE_BANDS = [
    { band: 'A', min: 90, range: '90% and above', copy: 'Distinction. You could walk into an interview and defend every answer in here. Chase the flagged items only if you want the last few per cent.' },
    { band: 'B', min: 75, range: '75% to 89%', copy: 'Strong pass. The foundations are solid — read the two or three explanations you got wrong and this becomes an A.' },
    { band: 'C', min: 60, range: '60% to 74%', copy: 'Pass, with gaps. Work the topic bars below, lowest first, then run the same set again.' },
    { band: 'D', min: 40, range: '40% to 59%', copy: 'Borderline. Rework the medium tier end to end — the medium band carries most of the real interview questions.' },
    { band: 'E', min: 0, range: 'Below 40%', copy: 'Not yet. Re-read every explanation here, then retry the same set until the bands climb.' }
  ];

  const NAME_RULES = {
    min: 2,
    max: 24,
    pattern: /^[A-Za-z0-9 _.\-]+$/,
    patternMessage: 'Letters, numbers, spaces and - _ . only.'
  };

  /* ------------------------------------------------- 02 DOM HELPERS */

  const $ = (selector, root) => (root || document).querySelector(selector);
  const $$ = (selector, root) => Array.from((root || document).querySelectorAll(selector));

  /**
   * Creates an element. Text always goes through textContent, never innerHTML,
   * so nothing a user types can ever be parsed as markup.
   */
  const make = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  };

  const pad2 = (n) => String(n).padStart(2, '0');

  const formatClock = (seconds) => `${pad2(Math.floor(seconds / 60))}:${pad2(seconds % 60)}`;

  const formatSeconds = (ms) => `${(ms / 1000).toFixed(1)}s`;

  const wait = (ms) => new Promise((resolve) => { setTimeout(resolve, ms); });

  const prefersReducedMotion = () =>
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  /* --------------------------------------------- 03 SAFE STORAGE */

  const storage = (() => {
    let warned = false;
    const warnOnce = () => {
      if (warned) return;
      warned = true;
      toast('THIS BROWSER BLOCKS LOCAL STORAGE — SCORES WILL NOT PERSIST', 'warn', 'STORAGE');
    };
    return {
      get(key) {
        try {
          return window.localStorage.getItem(key);
        } catch (err) {
          warnOnce();
          return null;
        }
      },
      set(key, value) {
        try {
          window.localStorage.setItem(key, value);
          return true;
        } catch (err) {
          warnOnce();
          return false;
        }
      },
      remove(key) {
        try {
          window.localStorage.removeItem(key);
          return true;
        } catch (err) {
          return false;
        }
      }
    };
  })();

  /* --------------------------------------------------- 04 TOASTS */

  const toastRegion = () => document.getElementById('toast-region');

  const TOAST_TAGS = { info: 'NOTE', ok: 'OK', warn: 'CHECK', error: 'FAULT' };

  function toast(message, tone, tag) {
    const region = toastRegion();
    if (!region) return;
    const node = make('p', 'toast');
    node.dataset.tone = tone || 'info';
    node.appendChild(make('span', 'toast__tag', tag || TOAST_TAGS[tone] || TOAST_TAGS.info));
    node.appendChild(make('span', 'toast__text', message));
    region.appendChild(node);
    setTimeout(() => {
      node.remove();
    }, TOAST_MS);
  }

  /* -------------------------------------------------- 05 SOUND */

  const sfx = (() => {
    let ctx = null;
    let enabled = true;
    const TONES = {
      correct: [660, 990, 'sine', 0.24],
      wrong: [220, 150, 'sawtooth', 0.28],
      tick: [1180, 1180, 'sine', 0.07],
      ui: [420, 520, 'sine', 0.12]
    };

    const context = () => {
      try {
        if (ctx) {
          if (ctx.state === 'suspended') ctx.resume().catch(() => {});
          return ctx;
        }
        const Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) {
          enabled = false;
          return null;
        }
        ctx = new Ctor();
        return ctx;
      } catch (err) {
        enabled = false;
        return null;
      }
    };

    return {
      get enabled() { return enabled; },
      set enabled(value) { enabled = Boolean(value); },
      play(kind) {
        if (!enabled) return;
        const ac = context();
        if (!ac) return;
        const [from, to, wave, length] = TONES[kind] || TONES.ui;
        try {
          const now = ac.currentTime;
          const osc = ac.createOscillator();
          const gain = ac.createGain();
          osc.type = wave;
          osc.frequency.setValueAtTime(from, now);
          if (to !== from) osc.frequency.exponentialRampToValueAtTime(to, now + length * 0.6);
          gain.gain.setValueAtTime(0.0001, now);
          gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + length);
          osc.connect(gain).connect(ac.destination);
          osc.start(now);
          osc.stop(now + length + 0.02);
        } catch (err) {
          enabled = false;
        }
      }
    };
  })();

  /* --------------------------------------------- 06 VALIDATION */

  /**
   * Reusable field validator.
   * @param {{value: string}} field any object exposing a `value`
   * @param {{min?:number,max?:number,pattern?:RegExp,patternMessage?:string,
   *          required?:boolean,emptyMessage?:string,minMessage?:string,maxMessage?:string}} rules
   * @returns {{ok:boolean,message:string}}
   */
  function validateField(field, rules) {
    const raw = String(field.value ?? '').trim();
    if (raw === '') {
      return { ok: false, message: rules.emptyMessage || 'This field is required.' };
    }
    if (rules.min && raw.length < rules.min) {
      return { ok: false, message: rules.minMessage || `Use at least ${rules.min} characters — you have ${raw.length}.` };
    }
    if (rules.max && raw.length > rules.max) {
      return { ok: false, message: rules.maxMessage || `Keep it to ${rules.max} characters or fewer.` };
    }
    if (rules.pattern && !rules.pattern.test(raw)) {
      return { ok: false, message: rules.patternMessage || 'That character is not allowed here.' };
    }
    return { ok: true, message: '' };
  }

  function paintFieldError(input, errorNode, message) {
    if (!errorNode) return;
    if (message) {
      errorNode.textContent = message;
      errorNode.hidden = false;
    } else {
      errorNode.textContent = '';
      errorNode.hidden = true;
    }
    if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
  }

  /* ------------------------------------------- 07 TIMER FACTORY */

  /**
   * Per-question countdown. Owns an interval handle inside the closure and
   * reads/writes the shared `state.timeLeft`, so pause genuinely freezes the
   * clock instead of merely hiding it.
   */
  function createTimer({ onTick, onExpire }) {
    let id = null;
    let held = false;

    const halt = () => {
      if (id !== null) {
        clearInterval(id);
        id = null;
      }
    };

    const beat = () => {
      if (state.timeLeft <= 1) {
        state.timeLeft = 0;
        halt();
        onTick(0);
        onExpire();
        return;
      }
      state.timeLeft -= 1;
      onTick(state.timeLeft);
    };

    return {
      start() {
        halt();
        held = false;
        id = setInterval(beat, 1000);
      },
      pause() {
        if (held) return;
        halt();
        held = true;
      },
      resume() {
        if (!held) return;
        held = false;
        id = setInterval(beat, 1000);
      },
      stop() {
        halt();
        held = false;
      },
      get isHeld() { return held; }
    };
  }

  /* ---------------------------------- 08 AUTO-ADVANCE FACTORY */

  /** Cancellable delayed callback — used when the clock runs out. */
  function createAutoAdvance(callback, delay) {
    let id = null;
    const cancel = () => {
      if (id !== null) {
        clearTimeout(id);
        id = null;
      }
    };
    return {
      schedule() {
        cancel();
        id = setTimeout(() => {
          id = null;
          callback();
        }, delay);
      },
      cancel,
      get isPending() { return id !== null; }
    };
  }

  /* ------------------------------------- 09 MEMOISED SHUFFLER */

  /**
   * Fisher–Yates behind a closure-held Map cache. Keyed by the quiz signature,
   * so "retry same set" reproduces byte-identical ordering while a brand new
   * configuration produces a fresh one.
   */
  function createShuffler() {
    const cache = new Map();
    return function shuffled(key, list) {
      if (cache.has(key)) return cache.get(key);
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const swap = out[i];
        out[i] = out[j];
        out[j] = swap;
      }
      cache.set(key, out);
      while (cache.size > 24) cache.delete(cache.keys().next().value);
      return out;
    };
  }

  /* ------------------------------------------- 10 BANK LOADER */

  /**
   * Validates and normalises an arbitrary question array. Anything malformed is
   * dropped rather than rendered, so a corrupt remote payload cannot break the
   * quiz screen.
   */
  function normaliseBank(raw) {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    const out = [];
    raw.forEach((item, position) => {
      if (!item || typeof item !== 'object') return;
      const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
      const options = Array.isArray(item.options) ? item.options.map((o) => String(o).trim()) : [];
      const answer = Number(item.answer);
      if (!prompt || options.length !== 4 || options.some((o) => !o)) return;
      if (!Number.isInteger(answer) || answer < 0 || answer > 3) return;
      let id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : `q${pad2(position + 1)}`;
      while (seen.has(id)) id = `${id}b`;
      seen.add(id);
      out.push({
        id,
        difficulty: window.QUESTION_TIERS.includes(item.difficulty) ? item.difficulty : 'easy',
        topic: TOPIC_META[item.topic] ? item.topic : 'js',
        prompt,
        options,
        answer,
        explanation: typeof item.explanation === 'string' && item.explanation.trim()
          ? item.explanation.trim()
          : 'No explanation was supplied for this question.'
      });
    });
    return out;
  }

  const embeddedBank = () => normaliseBank(window.QUESTION_BANK);

  /**
   * Tries the optional remote bank over HTTP(S), then falls back to the inline
   * one. Under file:// the browser blocks the request outright, so the embedded
   * bank is used directly and no failure toast interrupts a local demo.
   */
  async function loadBank() {
    if (window.location.protocol === 'file:') return embeddedBank();
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const guard = controller ? setTimeout(() => controller.abort(), REMOTE_FETCH_TIMEOUT_MS) : null;
    try {
      const response = await fetch(REMOTE_BANK_URL, {
        signal: controller ? controller.signal : undefined,
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const remote = normaliseBank(await response.json());
      if (!remote.length) throw new Error('empty payload');
      return remote;
    } catch (err) {
      if (!loadBank.reported) {
        loadBank.reported = true;
        toast('REMOTE BANK UNAVAILABLE — USING THE EMBEDDED BANK', 'warn', 'OFFLINE');
      }
      return embeddedBank();
    } finally {
      if (guard) clearTimeout(guard);
    }
  }
  loadBank.reported = false;

  /* ---------------------------------------------------- 11 STATE */

  const state = {
    phase: 'setup',
    config: { handle: '', difficulties: [], topics: [], count: '10' },
    questions: [],
    index: 0,
    answers: [],
    flagged: [],
    startedAt: 0,
    timeLeft: SECONDS_PER_QUESTION,
    paused: false,
    results: null,
    renderedIndex: -1,
    quitArmed: false,
    clearArmed: false,
    currentRunId: null
  };

  /* ------------------------------------------ 12 ELEMENT REFS */

  const dom = {
    html: document.documentElement,
    main: $('#main'),

    setupTitle: $('#setup-title'),
    setupForm: $('#setup-form'),
    handle: $('#handle'),
    handleError: $('#handle-error'),
    difficultyChips: $('#difficulty-chips'),
    difficultyError: $('#difficulty-error'),
    topicChips: $('#topic-chips'),
    topicError: $('#topic-error'),
    count: $('#count'),
    preview: $('#config-preview'),
    poolNote: $('#pool-note'),
    start: $('#btn-start'),
    legend: $('#topic-legend'),

    screenSetup: $('#screen-setup'),
    screenLoading: $('#screen-loading'),
    screenQuiz: $('#screen-quiz'),
    screenResults: $('#screen-results'),
    screenBoard: $('#screen-board'),
    screenFault: $('#screen-fault'),
    faultText: $('#fault-text'),
    faultRetry: $('#btn-fault-retry'),
    faultSetup: $('#btn-fault-setup'),

    loadingNote: $('#loading-note'),

    clock: $('#clock'),
    clockDigits: $('#clock-digits'),
    timerbar: $('#timerbar'),
    timerbarFill: $('#timerbar-fill'),
    pause: $('#btn-pause'),
    sound: $('#btn-sound'),
    theme: $('#btn-theme'),

    navgrid: $('#navgrid'),
    railTally: $('#rail-tally'),
    progress: $('#progress'),
    qTopic: $('#q-topic'),
    qTier: $('#q-tier'),
    qClock: $('#q-clock'),
    questionText: $('#question-text'),
    options: $('#options'),
    feedback: $('#feedback'),
    feedbackFlag: $('#feedback-flag'),
    feedbackLine: $('#feedback-line'),
    feedbackText: $('#feedback-text'),
    confirm: $('#btn-confirm'),
    next: $('#btn-next'),
    actionsMeta: $('#actions-meta'),
    flag: $('#btn-flag'),
    flagText: $('#btn-flag-text'),
    quit: $('#btn-quit'),

    scoreNum: $('#score-num'),
    scoreTotal: $('#score-total'),
    scoreSr: $('#score-sr'),
    scoreMeta: $('#score-meta'),
    ringFill: $('#ring-fill'),
    ringValue: $('#ring-value'),
    gradeCell: $('.scoreboard__cell--grade'),
    gradeBand: $('#grade-band'),
    gradeRange: $('#grade-range'),
    gradeCopy: $('#grade-copy'),
    statstrip: $('#statstrip'),
    avgNote: $('#avg-note'),
    topicBars: $('#topic-bars'),
    review: $('#review'),
    reviewList: $('#review-list'),
    reviewTitle: $('#review-title'),
    retry: $('#btn-retry'),
    newQuiz: $('#btn-newquiz'),
    reviewJump: $('#btn-review-jump'),
    exportReport: $('#btn-export-report'),
    print: $('#btn-print'),

    boardCount: $('#board-count'),
    boardRows: $('#board-rows'),
    boardTable: $('#board-table-wrap'),
    boardEmpty: $('#board-empty'),
    boardEmptyBack: $('#btn-empty-back'),
    exportScores: $('#btn-export-scores'),
    importScores: $('#btn-import-scores'),
    fileImport: $('#file-import'),
    clearScores: $('#btn-clear-scores'),
    clearConfirm: $('#clear-confirm'),
    clearYes: $('#btn-clear-yes'),
    clearNo: $('#btn-clear-no'),

    overlay: $('#pause-overlay'),
    pauseDialog: $('#pause-dialog'),
    pauseQ: $('#pause-q'),
    pauseT: $('#pause-t'),
    pauseU: $('#pause-u'),
    resume: $('#btn-resume'),
    pauseQuit: $('#btn-pause-quit'),

    live: $('#live-region')
  };

  /* --------------------------------------------- 13 RENDERING */

  function showScreens(map) {
    Object.entries(map).forEach(([selector, shouldShow]) => {
      const node = $(selector);
      if (node) node.hidden = !shouldShow;
    });
  }

  function renderPhase() {
    showScreens({
      '#screen-setup': state.phase === 'setup',
      '#screen-loading': state.phase === 'loading',
      '#screen-quiz': state.phase === 'quiz',
      '#screen-results': state.phase === 'results',
      '#screen-board': state.phase === 'setup' || state.phase === 'results',
      '#screen-fault': state.phase === 'fault'
    });
    dom.pause.hidden = state.phase !== 'quiz';
    dom.clock.hidden = state.phase !== 'quiz';
    dom.timerbar.hidden = state.phase !== 'quiz';
    document.body.classList.toggle('is-locked', state.paused);
  }

  function buildSetupControls() {
    const tiers = window.QUESTION_TIERS || ['easy', 'medium', 'hard', 'expert'];
    const topics = Object.keys(TOPIC_META);
    const bank = embeddedBank();

    const chipGroup = (values, counts, name) => {
      const frag = document.createDocumentFragment();
      values.forEach((value, i) => {
        const label = make('label', 'chip-check');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.name = name;
        input.value = value;
        input.checked = true;
        if (i === 0) {
          input.setAttribute('aria-required', 'true');
          input.setAttribute('aria-describedby', `${name}-error`);
        }
        const box = make('span', 'chip-check__box');
        box.appendChild(make('span', null, window.DIFFICULTY_META && name === 'difficulty'
          ? window.DIFFICULTY_META[value].label
          : TOPIC_META[value].label));
        box.appendChild(make('span', 'chip-check__count', `(${counts[value] || 0})`));
        label.appendChild(input);
        label.appendChild(box);
        frag.appendChild(label);
      });
      return frag;
    };

    const tierCounts = countBy(bank, (q) => q.difficulty);
    const topicCounts = countBy(bank, (q) => q.topic);

    dom.difficultyChips.replaceChildren(chipGroup(tiers, tierCounts, 'difficulty'));
    dom.topicChips.replaceChildren(chipGroup(topics, topicCounts, 'topic'));

    const legendFrag = document.createDocumentFragment();
    topics.forEach((topic) => {
      const item = make('li');
      const left = make('span', 'legend__name');
      const strong = make('b', null, TOPIC_META[topic].label);
      left.appendChild(strong);
      left.appendChild(make('span', null, ` · ${TOPIC_META[topic].blurb}`));
      item.appendChild(left);
      item.appendChild(make('span', 'legend__count', `${topicCounts[topic] || 0} Q`));
      legendFrag.appendChild(item);
    });
    dom.legend.replaceChildren(legendFrag);
  }

  function countBy(list, keyFn) {
    return list.reduce((acc, item) => {
      const key = keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
  }

  function readConfig() {
    return {
      handle: dom.handle.value.trim(),
      difficulties: $$('input[name="difficulty"]', dom.difficultyChips)
        .filter((i) => i.checked)
        .map((i) => i.value),
      topics: $$('input[name="topic"]', dom.topicChips)
        .filter((i) => i.checked)
        .map((i) => i.value),
      count: dom.count.value
    };
  }

  function tierSignature(config) {
    if (config.difficulties.length === (window.QUESTION_TIERS || []).length) return 'all';
    return config.difficulties.join('+') || 'none';
  }

  function renderSetup() {
    const config = readConfig();
    const bank = embeddedBank();
    const pool = bank.filter(
      (q) => config.difficulties.includes(q.difficulty) && config.topics.includes(q.topic)
    );
    const wanted = config.count === 'all' ? pool.length : Math.min(Number(config.count), pool.length);
    const tierLabel = tierSignature(config) === 'all'
      ? 'All tiers'
      : config.difficulties.map((t) => (window.DIFFICULTY_META[t] || {}).label || t).join('+') || 'No tiers';

    const minutes = (wanted * SECONDS_PER_QUESTION) / 60;
    dom.preview.textContent =
      `${plural(wanted, 'QUESTION', 'QUESTIONS')} · ` +
      `${Number.isInteger(minutes) ? minutes : minutes.toFixed(1)} MINUTES · ` +
      `${tierLabel.toUpperCase()}`;

    const requested = config.count === 'all' ? pool.length : Number(config.count);
    const shortfall = requested > pool.length;
    if (shortfall && wanted > 0) {
      dom.poolNote.textContent =
        `ONLY ${pool.length} OF ${requested} REQUESTED QUESTIONS MATCH THESE FILTERS — THE RUN WILL BE SHORT.`;
      dom.poolNote.hidden = false;
    } else if (shortfall) {
      dom.poolNote.textContent = 'NO QUESTIONS MATCH THESE FILTERS — PICK AT LEAST ONE TOPIC AND TIER.';
      dom.poolNote.hidden = false;
    } else {
      dom.poolNote.hidden = true;
      dom.poolNote.textContent = '';
    }

    dom.start.disabled = wanted === 0;
    state.config = config;
  }

  function validateSetup() {
    const name = validateField(dom.handle, {
      ...NAME_RULES,
      emptyMessage: 'Enter a handle so the leaderboard knows who ran this.'
    });
    paintFieldError(dom.handle, dom.handleError, name.message);

    const diffInputs = $$('input[name="difficulty"]', dom.difficultyChips);
    const topics = $$('input[name="topic"]', dom.topicChips);
    const diffOk = diffInputs.some((i) => i.checked);
    paintFieldError(diffInputs[0], dom.difficultyError, diffOk ? '' : 'Pick at least one difficulty tier.');
    const topicOk = topics.some((i) => i.checked);
    paintFieldError(topics[0], dom.topicError, topicOk ? '' : 'Pick at least one topic.');

    if (!name.ok) {
      dom.handle.focus();
      return false;
    }
    if (!diffOk) {
      diffInputs[0].focus();
      return false;
    }
    if (!topicOk) {
      topics[0].focus();
      return false;
    }
    return true;
  }

  const shuffle = createShuffler();

  /**
   * Filters, then interleaves tier by tier so a mixed quiz ramps instead of
   * dumping every easy question first. Shuffling happens inside each tier, and
   * the memoised shuffler keeps the ordering stable for a given signature.
   */
  function pickQuestions(bank, config) {
    const pool = bank.filter(
      (q) => config.difficulties.includes(q.difficulty) && config.topics.includes(q.topic)
    );
    const wanted = config.count === 'all' ? pool.length : Math.min(Number(config.count), pool.length);
    const signature = `${tierSignature(config)}|${config.topics.slice().sort().join('+')}`;
    const tiers = (window.QUESTION_TIERS || []).filter((t) => config.difficulties.includes(t));
    const groups = tiers.map((tier) => shuffle(`${signature}|${tier}`, pool.filter((q) => q.difficulty === tier)));
    const ordered = [];
    const longest = groups.reduce((max, g) => Math.max(max, g.length), 0);
    for (let i = 0; i < longest; i += 1) {
      groups.forEach((group) => {
        if (group[i]) ordered.push(group[i]);
      });
    }
    return ordered.slice(0, wanted);
  }

  function buildNavDots(count) {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < count; i += 1) {
      const item = document.createElement('li');
      const dot = make('button', 'navdot');
      dot.type = 'button';
      dot.dataset.index = String(i);
      dot.appendChild(make('span', 'navdot__num', pad2(i + 1)));
      const flagMark = make('span', 'navdot__flag', '\u2691');
      flagMark.hidden = true;
      dot.appendChild(flagMark);
      item.appendChild(dot);
      frag.appendChild(item);
    }
    dom.navgrid.replaceChildren(frag);
  }

  function answerStateLabel(i) {
    const answer = state.answers[i];
    if (!answer) return 'not answered';
    if (answer.timedOut) return 'not answered, time expired';
    if (!answer.confirmed) return 'selection made, not confirmed';
    return answer.correct ? 'answered, correct' : 'answered, incorrect';
  }

  function renderNav() {
    const total = state.questions.length;
    const dots = $$('.navdot', dom.navgrid);
    let answered = 0;
    dots.forEach((dot, i) => {
      const answer = state.answers[i];
      const isAnswered = Boolean(answer && answer.confirmed && !answer.timedOut);
      if (isAnswered) answered += 1;
      dot.dataset.correct = isAnswered ? String(answer.correct) : '';
      dot.dataset.state = state.flagged[i] ? 'flagged' : (isAnswered ? 'answered' : 'open');
      if (i === state.index) dot.setAttribute('aria-current', 'step');
      else dot.removeAttribute('aria-current');
      const flagged = state.flagged[i] ? ', flagged for review' : '';
      dot.setAttribute('aria-label', `Question ${i + 1} of ${total}, ${answerStateLabel(i)}${flagged}`);
      const num = $('.navdot__num', dot);
      if (num) num.textContent = pad2(i + 1);
      const mark = $('.navdot__flag', dot);
      if (mark) mark.hidden = !state.flagged[i];
    });
    dom.railTally.textContent = `${answered} of ${total} answered`;
  }

  function buildOptions(question) {
    const frag = document.createDocumentFragment();
    question.options.forEach((text, i) => {
      const button = make('button', 'option');
      button.type = 'button';
      button.setAttribute('role', 'radio');
      button.setAttribute('aria-checked', 'false');
      button.dataset.optionIndex = String(i);
      button.tabIndex = i === 0 ? 0 : -1;
      button.appendChild(make('span', 'option__letter', LETTERS[i]));
      button.appendChild(make('span', 'option__text', text));
      button.appendChild(make('span', 'option__mark', ''));
      frag.appendChild(button);
    });
    dom.options.replaceChildren(frag);
  }

  function syncOptions(question) {
    const answer = state.answers[state.index];
    $$('.option', dom.options).forEach((button, i) => {
      const mark = $('.option__mark', button);
      const chosen = answer.selected === i;
      button.classList.toggle('is-correct', Boolean(answer.confirmed && i === question.answer));
      button.classList.toggle('is-wrong', Boolean(answer.confirmed && chosen && !answer.correct));
      button.classList.toggle('is-locked', answer.confirmed);
      button.setAttribute('aria-checked', String(chosen));
      button.tabIndex = answer.confirmed
        ? -1
        : (chosen || (answer.selected === null && i === 0) ? 0 : -1);
      button.disabled = answer.confirmed;
      if (mark) {
        mark.textContent = !answer.confirmed
          ? ''
          : (i === question.answer ? 'Correct' : (chosen ? 'Incorrect' : ''));
      }
    });
  }

  function paintTimer() {
    const pct = Math.max(0, Math.min(100, (state.timeLeft / SECONDS_PER_QUESTION) * 100));
    const low = state.timeLeft <= 10;
    dom.timerbarFill.style.setProperty('--fill', `${pct}%`);
    dom.timerbar.setAttribute('aria-valuenow', String(state.timeLeft));
    dom.timerbar.setAttribute('aria-valuetext', `${state.timeLeft} seconds remaining`);
    const text = formatClock(state.timeLeft);
    dom.clockDigits.textContent = text;
    dom.qClock.textContent = text;
    dom.clock.classList.toggle('is-low', low);
    dom.qClock.classList.toggle('is-low', low);
    dom.timerbar.classList.toggle('is-low', low);
  }

  function lockTimerBar() {
    dom.timerbar.classList.add('is-locked');
    dom.timerbar.setAttribute('aria-valuetext', 'Answer locked');
  }

  function unlockTimerBar() {
    dom.timerbar.classList.remove('is-locked');
  }

  function updateFlagButton() {
    const on = state.flagged[state.index];
    dom.flag.setAttribute('aria-pressed', String(on));
    dom.flagText.textContent = on ? 'Flagged' : 'Flag';
  }

  function unansweredCount() {
    return state.answers.filter((a) => !a.confirmed || a.timedOut).length;
  }

  function flaggedCount() {
    return state.flagged.filter(Boolean).length;
  }

  function updateActionRow() {
    const answer = state.answers[state.index];
    const last = state.index === state.questions.length - 1;
    dom.confirm.hidden = answer.confirmed;
    dom.confirm.disabled = answer.selected === null;
    dom.next.hidden = !answer.confirmed;
    dom.next.textContent = last ? 'Finish quiz' : 'Next question';
    const left = unansweredCount();
    dom.actionsMeta.textContent = answer.confirmed
      ? `${left} unanswered · ${plural(flaggedCount(), 'flag', 'flags')} raised`
      : `${left} unanswered · press Enter to confirm`;
  }

  function renderQuestion({ announceQuestion = true, moveFocus = true } = {}) {
    const question = state.questions[state.index];
    if (!question) {
      finishQuiz();
      return;
    }
    const total = state.questions.length;
    dom.progress.textContent = `Q${pad2(state.index + 1)} / ${total}`;
    dom.qTopic.textContent = TOPIC_META[question.topic].label;
    dom.qTier.textContent = window.DIFFICULTY_META[question.difficulty].label;
    dom.qTier.dataset.tier = question.difficulty;
    dom.questionText.textContent = question.prompt;

    if (state.renderedIndex !== state.index) {
      state.renderedIndex = state.index;
      dom.feedback.hidden = true;
      dom.feedback.removeAttribute('data-state');
      buildOptions(question);
    }
    syncOptions(question);
    renderNav();
    updateFlagButton();
    updateActionRow();
    paintTimer();

    if (announceQuestion) {
      const answer = state.answers[state.index];
      announce(`Question ${state.index + 1} of ${total}. ${TOPIC_META[question.topic].label}, ${window.DIFFICULTY_META[question.difficulty].label}.${answer.confirmed ? ' Answer already locked.' : ''}`);
    }
    if (moveFocus) dom.questionText.focus();
  }

  /* --------------------------------------------- 14 QUIZ FLOW */

  const timer = createTimer({ onTick: paintTimer, onExpire: handleExpiry });
  const autoAdvance = createAutoAdvance(() => advance(), AUTO_ADVANCE_MS);
  const hydrateCache = new Map();

  /**
   * Yields one frame before an explanation is painted, and memoises the payload
   * per question so revisiting a question never pays the cost twice. Stands in
   * for a real async explanation fetch.
   */
  function hydrate(question) {
    if (hydrateCache.has(question.id)) return Promise.resolve(hydrateCache.get(question.id));
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => {
        const payload = {
          id: question.id,
          words: question.explanation.trim().split(/\s+/).filter(Boolean).length,
          chars: question.explanation.length
        };
        hydrateCache.set(question.id, payload);
        resolve(payload);
      });
    });
  }

  function announce(text) {
    if (!dom.live) return;
    dom.live.textContent = '';
    setTimeout(() => {
      dom.live.textContent = text;
    }, 40);
  }

  function beginQuestion() {
    state.timeLeft = SECONDS_PER_QUESTION;
    state.paused = false;
    unlockTimerBar();
    timer.start();
    paintTimer();
  }

  function selectOption(optionIndex, { focus = false } = {}) {
    if (state.phase !== 'quiz' || state.paused) return;
    const answer = state.answers[state.index];
    if (!answer || answer.confirmed) return;
    if (optionIndex < 0 || optionIndex > 3) return;
    answer.selected = optionIndex;
    const question = state.questions[state.index];
    syncOptions(question);
    updateActionRow();
    const button = $(`.option[data-option-index="${optionIndex}"]`, dom.options);
    if (focus && button) button.focus();
  }

  function moveSelection(delta) {
    const answer = state.answers[state.index];
    if (!answer || answer.confirmed) return;
    const from = answer.selected === null ? (delta > 0 ? -1 : 4) : answer.selected;
    const next = (from + delta + 4) % 4;
    selectOption(next, { focus: true });
  }

  async function confirmAnswer() {
    if (state.phase !== 'quiz' || state.paused) return;
    const question = state.questions[state.index];
    const answer = state.answers[state.index];
    if (!question || !answer || answer.confirmed || answer.selected === null) return;

    answer.confirmed = true;
    answer.correct = answer.selected === question.answer;
    answer.elapsedMs = (SECONDS_PER_QUESTION - state.timeLeft) * 1000;

    timer.stop();
    lockTimerBar();

    const next = state.questions[state.index + 1] || null;
    await Promise.all([hydrate(question), next ? hydrate(next) : Promise.resolve()]);

    syncOptions(question);
    renderFeedback(question, answer);
    renderNav();
    updateActionRow();
    playSound(answer.correct ? 'correct' : 'wrong');

    announce(`${answer.correct ? 'Correct.' : 'Incorrect.'} The right answer was ${LETTERS[question.answer]}. The explanation is now on screen.`);
    dom.next.focus();
  }

  function renderFeedback(question, answer) {
    const correctLetter = LETTERS[question.answer];
    const key = answer.timedOut ? 'open' : (answer.correct ? 'correct' : 'wrong');
    dom.feedback.dataset.state = key;
    dom.feedbackFlag.textContent = answer.timedOut
      ? 'Unanswered · time expired'
      : (answer.correct ? 'Correct' : 'Incorrect');
    dom.feedbackLine.textContent = answer.timedOut
      ? `No answer recorded. The correct answer was ${correctLetter} — ${question.options[question.answer]}`
      : `You chose ${LETTERS[answer.selected]} — ${question.options[answer.selected]}. The correct answer was ${correctLetter} — ${question.options[question.answer]}`;
    dom.feedbackText.textContent = question.explanation;
    dom.feedback.hidden = false;
  }

  function handleExpiry() {
    if (state.phase !== 'quiz') return;
    const answer = state.answers[state.index];
    if (!answer || answer.confirmed) return;
    answer.confirmed = true;
    answer.timedOut = true;
    answer.correct = false;
    answer.selected = null;
    answer.elapsedMs = SECONDS_PER_QUESTION * 1000;
    state.flagged[state.index] = true;

    renderNav();
    updateFlagButton();
    lockTimerBar();
    playSound('wrong');
    toast(`TIME EXPIRED ON Q${pad2(state.index + 1)} — FLAGGED AND MOVING ON`, 'warn', 'TIMER');
    announce(`Time expired on question ${state.index + 1} of ${state.questions.length}. Marked unanswered and flagged for review.`);
    autoAdvance.schedule();
  }

  function advance() {
    autoAdvance.cancel();
    if (state.index >= state.questions.length - 1) {
      finishQuiz();
      return;
    }
    state.index += 1;
    beginQuestion();
    renderQuestion();
  }

  function jumpTo(index) {
    if (state.phase !== 'quiz' || state.paused) return;
    if (!state.questions[index]) return;
    autoAdvance.cancel();
    state.index = index;
    if (state.answers[index].confirmed) {
      timer.stop();
      lockTimerBar();
    } else {
      beginQuestion();
    }
    renderQuestion();
    playSound('ui');
  }

  function toggleFlag() {
    if (state.phase !== 'quiz' || state.paused) return;
    state.flagged[state.index] = !state.flagged[state.index];
    updateFlagButton();
    renderNav();
    const on = state.flagged[state.index];
    toast(on ? `Q${pad2(state.index + 1)} FLAGGED FOR REVIEW` : `Q${pad2(state.index + 1)} FLAG REMOVED`, on ? 'warn' : 'info', 'FLAG');
    announce(on ? 'Question flagged for review.' : 'Flag removed.');
  }

  function armButton(button, key, armedLabel) {
    if (state[key]) {
      state[key] = false;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = armedLabel.idle;
      return false;
    }
    state[key] = true;
    button.setAttribute('aria-pressed', 'true');
    button.textContent = armedLabel.armed;
    setTimeout(() => {
      if (!state[key]) return;
      state[key] = false;
      button.setAttribute('aria-pressed', 'false');
      button.textContent = armedLabel.idle;
    }, ARM_WINDOW_MS);
    return true;
  }

  function playSound(kind) {
    sfx.play(kind);
  }

  /* pause dialog */

  function openPause() {
    if (state.phase !== 'quiz' || state.paused) return;
    state.paused = true;
    timer.pause();
    autoAdvance.cancel();
    dom.pause.setAttribute('aria-pressed', 'true');
    dom.pauseQ.textContent = `${state.index + 1} / ${state.questions.length}`;
    dom.pauseT.textContent = formatClock(state.timeLeft);
    dom.pauseU.textContent = String(unansweredCount());
    dom.overlay.hidden = false;
    renderPhase();
    dom.resume.focus();
    announce('Quiz paused. The clock is stopped.');
  }

  function closePause({ focusBack = true } = {}) {
    if (!state.paused) return;
    state.paused = false;
    dom.pause.setAttribute('aria-pressed', 'false');
    dom.overlay.hidden = true;
    renderPhase();
    timer.resume();
    announce('Quiz resumed.');
    if (focusBack) dom.pause.focus();
  }

  function togglePause() {
    if (state.paused) closePause();
    else openPause();
  }

  /* launch */

  async function launch(config) {
    if (state.phase === 'loading') return;
    state.phase = 'loading';
    renderPhase();
    const began = Date.now();

    dom.loadingNote.textContent = 'Trying the remote bank first…';
    const bank = await loadBank();

    if (!bank.length) {
      showFault('The question bank came back empty. Both the remote copy and js/questions.js failed validation, so there is nothing to ask.');
      return;
    }

    dom.loadingNote.textContent = 'Filtering tiers and topics…';
    const questions = pickQuestions(bank, config);
    if (!questions.length) {
      showFault('No questions matched the tiers and topics you selected. Widen the filters and start again.');
      return;
    }

    dom.loadingNote.textContent = 'Shuffling the order…';
    const remaining = BUILD_MIN_MS - (Date.now() - began);
    if (remaining > 0) await wait(remaining);

    state.questions = questions;
    state.index = 0;
    state.answers = questions.map(() => ({
      selected: null, confirmed: false, correct: false, elapsedMs: 0, timedOut: false
    }));
    state.flagged = questions.map(() => false);
    state.results = null;
    state.renderedIndex = -1;
    state.startedAt = Date.now();
    state.phase = 'quiz';
    state.config = config;

    buildNavDots(questions.length);
    renderPhase();
    beginQuestion();
    renderQuestion();
    announce(`Quiz started. ${questions.length} questions, ${SECONDS_PER_QUESTION} seconds each.`);
    playSound('ui');
  }

  function showFault(message) {
    autoAdvance.cancel();
    timer.stop();
    state.paused = false;
    state.phase = 'fault';
    dom.faultText.textContent = message;
    renderPhase();
    dom.overlay.hidden = true;
    toast('THE QUIZ COULD NOT START — SEE THE FAULT SCREEN', 'error', 'FAULT');
    dom.faultSetup.focus();
  }

  function showSetup() {
    autoAdvance.cancel();
    timer.stop();
    state.paused = false;
    state.phase = 'setup';
    dom.overlay.hidden = true;
    renderSetup();
    renderPhase();
    dom.setupTitle.focus();
    announce('Back to setup.');
  }

  async function handleStart(event) {
    if (event) event.preventDefault();
    if (state.phase === 'loading') return;
    if (!validateSetup()) {
      playSound('wrong');
      return;
    }
    playSound('ui');
    await launch(readConfig());
  }

  /* ------------------------------------------------ 15 RESULTS */

  function computeResults() {
    const total = state.questions.length;
    const topics = new Map();
    let correct = 0;
    let incorrect = 0;
    let unanswered = 0;
    let elapsedMs = 0;

    state.questions.forEach((question, i) => {
      const answer = state.answers[i];
      const attempted = answer.confirmed && !answer.timedOut;
      if (attempted) {
        if (answer.correct) correct += 1;
        else incorrect += 1;
      } else {
        unanswered += 1;
      }
      elapsedMs += answer.elapsedMs;
      const bucket = topics.get(question.topic) || { topic: question.topic, total: 0, correct: 0 };
      bucket.total += 1;
      if (answer.correct) bucket.correct += 1;
      topics.set(question.topic, bucket);
    });

    const percentage = total ? Math.round((correct / total) * 100) : 0;
    const attempted = correct + incorrect;
    const grade = GRADE_BANDS.find((band) => percentage >= band.min) || GRADE_BANDS[GRADE_BANDS.length - 1];

    return {
      total,
      correct,
      incorrect,
      unanswered,
      flagged: flaggedCount(),
      percentage,
      accuracy: attempted ? Math.round((correct / attempted) * 100) : 0,
      attempted,
      elapsedMs,
      avgMs: total ? Math.round(elapsedMs / total) : 0,
      grade,
      startedAt: state.startedAt,
      finishedAt: Date.now(),
      topics: Array.from(topics.values()).map((t) => ({
        ...t,
        percentage: t.total ? Math.round((t.correct / t.total) * 100) : 0
      }))
    };
  }

  function buildStat(label, value, tone) {
    const item = document.createElement('li');
    item.appendChild(make('p', 'micro micro--dim', label));
    const strong = make('p', 'stat__value', value);
    if (tone) strong.dataset.tone = tone;
    item.appendChild(strong);
    return item;
  }

  function renderStatStrip(results) {
    const frag = document.createDocumentFragment();
    frag.appendChild(buildStat('Correct', String(results.correct), 'cyan'));
    frag.appendChild(buildStat('Incorrect', String(results.incorrect), results.incorrect ? 'clay' : null));
    frag.appendChild(buildStat('Unanswered', String(results.unanswered), results.unanswered ? 'gold' : null));
    frag.appendChild(buildStat('Flagged', String(results.flagged)));
    frag.appendChild(buildStat('Time used', formatClock(Math.round(results.elapsedMs / 1000))));
    frag.appendChild(buildStat('Accuracy', `${results.accuracy}%`, 'gold'));
    dom.statstrip.replaceChildren(frag);
    dom.avgNote.textContent =
      `AVERAGE ${formatSeconds(results.avgMs)} PER QUESTION · ${SECONDS_PER_QUESTION}s ALLOWED EACH · TIER ${state.config.difficulties.map((t) => window.DIFFICULTY_META[t].label).join(' + ')}`;
  }

  function barTone(pct) {
    if (pct >= 80) return 'cyan';
    if (pct >= 50) return 'paper';
    if (pct >= 25) return 'gold';
    return 'clay';
  }

  function renderTopicBars(results) {
    const frag = document.createDocumentFragment();
    results.topics
      .slice()
      .sort((a, b) => a.percentage - b.percentage || a.topic.localeCompare(b.topic))
      .forEach((entry) => {
        const item = make('li', 'bar');
        item.dataset.tone = barTone(entry.percentage);

        const label = make('span', 'bar__label');
        label.appendChild(make('span', null, TOPIC_META[entry.topic].label));
        label.appendChild(make('span', 'bar__sub', `${entry.correct}/${entry.total} correct`));
        item.appendChild(label);

        const track = make('span', 'bar__track');
        const fill = make('span', 'bar__fill');
        fill.style.setProperty('--pct', `${entry.percentage}%`);
        track.appendChild(fill);
        item.appendChild(track);

        item.appendChild(make('span', 'bar__value', `${entry.percentage}%`));
        frag.appendChild(item);
      });
    dom.topicBars.replaceChildren(frag);
  }

  function reviewStateFor(answer) {
    if (answer.timedOut) return { key: 'open', label: 'Unanswered' };
    if (!answer.confirmed) return { key: 'open', label: 'Not confirmed' };
    return answer.correct ? { key: 'correct', label: 'Correct' } : { key: 'wrong', label: 'Incorrect' };
  }

  function renderReviewList() {
    const frag = document.createDocumentFragment();
    state.questions.forEach((question, i) => {
      const answer = state.answers[i];
      const verdict = reviewStateFor(answer);
      const item = make('li', 'review__item');
      item.dataset.state = verdict.key;

      const head = make('p', 'review__head');
      head.appendChild(make('span', 'review__id', `Q${pad2(i + 1)}`));
      head.appendChild(make('span', null, TOPIC_META[question.topic].label));
      const tier = make('span', 'chip chip--tier', window.DIFFICULTY_META[question.difficulty].label);
      tier.dataset.tier = question.difficulty;
      head.appendChild(tier);
      head.appendChild(make('span', null, formatSeconds(answer.elapsedMs)));
      if (state.flagged[i]) {
        head.appendChild(make('span', 'review__flag', '\u2691 Flagged'));
      }
      head.appendChild(make('span', 'review__state', verdict.label));
      item.appendChild(head);

      item.appendChild(make('h4', 'review__prompt', question.prompt));

      const answers = make('p', 'review__answers');
      const yours = make('span', 'review__answer');
      yours.dataset.tone = verdict.key;
      yours.appendChild(make('b', null, answer.selected === null ? '\u2014' : LETTERS[answer.selected]));
      yours.appendChild(document.createTextNode(
        answer.selected === null ? '  you left this blank' : `  ${question.options[answer.selected]}`
      ));
      answers.appendChild(yours);

      const right = make('span', 'review__answer');
      right.dataset.tone = 'correct';
      right.appendChild(make('b', null, LETTERS[question.answer]));
      right.appendChild(document.createTextNode(`  ${question.options[question.answer]}`));
      answers.appendChild(right);
      item.appendChild(answers);

      const why = make('div', 'review__why');
      why.appendChild(make('b', null, 'Why'));
      why.appendChild(make('span', null, question.explanation));
      item.appendChild(why);

      frag.appendChild(item);
    });
    dom.reviewList.replaceChildren(frag);
  }

  function renderResults() {
    const results = state.results;
    const total = state.questions.length;

    dom.scoreTotal.textContent = String(total);
    dom.scoreSr.textContent = `of ${total}`;
    dom.scoreMeta.textContent =
      `${state.config.handle} · WEB FUNDAMENTALS · ` +
      `${state.config.difficulties.map((t) => window.DIFFICULTY_META[t].label).join('+').toUpperCase()} · ` +
      new Date(results.finishedAt).toLocaleString();

    dom.gradeCell.dataset.band = results.grade.band;
    dom.gradeBand.textContent = results.grade.band;
    dom.gradeRange.textContent = `${results.grade.range} · ${results.percentage}%`;
    dom.gradeCopy.textContent = results.grade.copy;

    renderStatStrip(results);
    renderTopicBars(results);
    renderReviewList();
    animateScore(results);
  }

  /** Count-up for the score line, the ring and the ring's percentage. */
  function animateScore(results) {
    const target = results.correct;
    const pct = results.percentage;
    const offsetFull = RING_CIRCUMFERENCE;

    const paint = (score, percent) => {
      dom.scoreNum.textContent = String(score);
      dom.ringValue.textContent = `${percent}%`;
      dom.ringFill.style.strokeDashoffset = String(offsetFull * (1 - percent / 100));
    };

    if (prefersReducedMotion()) {
      paint(target, pct);
      return;
    }

    const startedAt = window.performance ? performance.now() : Date.now();
    const duration = 900;
    const step = (now) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      paint(Math.round(target * eased), Math.round(pct * eased));
      if (progress < 1) window.requestAnimationFrame(step);
    };
    window.requestAnimationFrame(step);
  }

  function finishQuiz() {
    autoAdvance.cancel();
    timer.stop();
    state.paused = false;
    dom.overlay.hidden = true;
    state.results = computeResults();
    saveRun();
    state.phase = 'results';
    renderPhase();
    renderResults();
    renderBoard();
    if (prefersReducedMotion()) window.scrollTo(0, 0);
    else window.scrollTo({ top: 0, behavior: 'smooth' });
    announce(`Quiz complete. ${state.results.correct} of ${state.results.total} correct. Grade band ${state.results.grade.band}.`);
    playSound(state.results.percentage >= 60 ? 'correct' : 'wrong');
  }

  /* ------------------------------ 16 REPORT + DOWNLOADS */

  function buildReport() {
    const results = state.results;
    return {
      app: 'quiz-arena',
      schema: 1,
      generatedAt: new Date(results.finishedAt).toISOString(),
      handle: state.config.handle,
      subject: 'Web Development Fundamentals',
      timer: { mode: 'per-question', secondsPerQuestion: SECONDS_PER_QUESTION },
      requested: {
        count: state.config.count,
        difficulties: state.config.difficulties,
        topics: state.config.topics
      },
      score: {
        correct: results.correct,
        total: results.total,
        percentage: results.percentage,
        accuracyOnAttempted: results.accuracy,
        grade: results.grade.band,
        gradeRange: results.grade.range
      },
      stats: {
        incorrect: results.incorrect,
        unanswered: results.unanswered,
        flagged: results.flagged,
        elapsedMs: results.elapsedMs,
        averageMsPerQuestion: results.avgMs
      },
      topicBreakdown: results.topics.map((t) => ({
        topic: t.topic,
        label: TOPIC_META[t.topic].label,
        correct: t.correct,
        total: t.total,
        percentage: t.percentage
      })),
      questions: state.questions.map((question, i) => {
        const answer = state.answers[i];
        return {
          position: i + 1,
          id: question.id,
          difficulty: question.difficulty,
          topic: question.topic,
          prompt: question.prompt,
          options: question.options,
          correctIndex: question.answer,
          correctLetter: LETTERS[question.answer],
          chosenIndex: answer.selected,
          chosenLetter: answer.selected === null ? null : LETTERS[answer.selected],
          correct: answer.correct,
          unanswered: answer.timedOut || !answer.confirmed,
          timedOut: answer.timedOut,
          flagged: state.flagged[i],
          secondsUsed: Math.round(answer.elapsedMs / 1000),
          explanation: question.explanation
        };
      })
    };
  }

  function slugify(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 24) || 'anonymous';
  }

  function downloadJson(filename, payload) {
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.rel = 'noopener';
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (err) {
      return false;
    }
  }

  function exportReport() {
    if (!state.results) {
      toast('NO RESULTS TO EXPORT YET — FINISH A QUIZ FIRST', 'error', 'EXPORT');
      return;
    }
    const report = buildReport();
    const ok = downloadJson(`quiz-arena-report-${slugify(state.config.handle)}-${Date.now()}.json`, report);
    toast(
      ok ? 'REPORT EXPORTED AS JSON' : 'EXPORT FAILED — THE BROWSER BLOCKED THE DOWNLOAD',
      ok ? 'ok' : 'error',
      'REPORT'
    );
  }

  /* ------------------------------------------- 17 LEADERBOARD */

  const boardFormat = (() => {
    try {
      return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (err) {
      return { format: (value) => value.slice(0, 10) };
    }
  })();

  function safeHandle(value) {
    const clean = String(value ?? '').trim().slice(0, 24);
    return NAME_RULES.pattern.test(clean) ? clean : '';
  }

  function validEntry(entry) {
    if (!entry || typeof entry !== 'object') return false;
    if (!safeHandle(entry.handle)) return false;
    const score = Number(entry.score);
    const total = Number(entry.total);
    if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) return false;
    if (score < 0 || score > total) return false;
    if (typeof entry.date !== 'string' || Number.isNaN(Date.parse(entry.date))) return false;
    return true;
  }

  function readScoreFile() {
    const raw = storage.get(STORAGE_KEYS.scores);
    if (raw === null) return [];
    try {
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : parsed && parsed.entries;
      if (!Array.isArray(list)) throw new TypeError('entries missing');
      return list.filter(validEntry).slice(0, MAX_BOARD_ENTRIES);
    } catch (err) {
      storage.remove(STORAGE_KEYS.scores);
      toast('SAVED SCORES WERE CORRUPT — THE LEDGER HAS BEEN RESET', 'error', 'STORAGE');
      return [];
    }
  }

  function writeScoreFile(entries) {
    const ok = storage.set(STORAGE_KEYS.scores, JSON.stringify({ version: 1, entries }));
    if (!ok) toast('COULD NOT SAVE — LOCAL STORAGE IS UNAVAILABLE', 'error', 'STORAGE');
    return ok;
  }

  function saveRun() {
    const results = state.results;
    if (!results) return;
    const id = `r-${results.finishedAt}-${Math.floor(Math.random() * 1e6)}`;
    state.currentRunId = id;
    const entry = {
      id,
      handle: safeHandle(state.config.handle) || 'anonymous',
      score: results.correct,
      total: results.total,
      percentage: results.percentage,
      difficulty: state.config.difficulties.join('+'),
      date: new Date(results.finishedAt).toISOString()
    };
    const next = [entry, ...readScoreFile()].slice(0, MAX_BOARD_ENTRIES);
    if (writeScoreFile(next)) toast(`${entry.handle.toUpperCase()} LOGGED AT ${results.correct}/${results.total}`, 'ok', 'LEDGER');
  }

  function renderBoard() {
    const entries = readScoreFile();
    const rows = entries.slice(0, MAX_BOARD_ROWS);
    dom.boardEmpty.hidden = rows.length > 0;
    dom.boardTable.hidden = rows.length === 0;
    dom.boardCount.textContent = `${plural(entries.length, 'RUN', 'RUNS')} SAVED · NEWEST FIRST · TOP ${MAX_BOARD_ROWS}`;

    const frag = document.createDocumentFragment();
    rows.forEach((entry, i) => {
      const row = document.createElement('tr');
      if (entry.id === state.currentRunId) row.dataset.current = 'true';
      row.appendChild(make('td', 'board__rank', pad2(i + 1)));
      const handle = make('td', 'board__handle', entry.handle);
      if (entry.id === state.currentRunId) {
        handle.appendChild(make('span', 'board__now', 'this run'));
      }
      row.appendChild(handle);
      row.appendChild(make('td', null, `${entry.score} / ${entry.total} · ${entry.percentage}%`));
      row.appendChild(make('td', null, String(entry.difficulty || 'mixed').toUpperCase()));
      row.appendChild(make('td', null, boardFormat.format(new Date(entry.date))));
      frag.appendChild(row);
    });
    dom.boardRows.replaceChildren(frag);
  }

  /** Exposed on window (see the brief) — writes the whole ledger to a file. */
  function exportAllScores() {
    const entries = readScoreFile();
    if (!entries.length) {
      toast('NOTHING TO EXPORT — THE LEDGER IS EMPTY', 'warn', 'EXPORT');
      return false;
    }
    const ok = downloadJson('quiz-arena-scores.json', {
      app: 'quiz-arena',
      schema: 1,
      exportedAt: new Date().toISOString(),
      entries
    });
    toast(
      ok ? `${plural(entries.length, 'RUN', 'RUNS')} EXPORTED` : 'EXPORT FAILED — THE BROWSER BLOCKED THE DOWNLOAD',
      ok ? 'ok' : 'error',
      'LEDGER'
    );
    return ok;
  }

  /**
   * Exposed on window (see the brief) — merges a JSON payload into the ledger.
   * Accepts either `{entries:[…]}` or a bare array. Returns true on success.
   */
  function importScores(rawText) {
    if (typeof rawText !== 'string' || !rawText.trim()) {
      toast('IMPORT ABORTED — NOTHING TO READ', 'error', 'IMPORT');
      return false;
    }
    let payload;
    try {
      payload = JSON.parse(rawText);
    } catch (err) {
      toast('IMPORT FAILED — THAT FILE IS NOT VALID JSON', 'error', 'IMPORT');
      return false;
    }
    const incoming = Array.isArray(payload) ? payload : payload && payload.entries;
    if (!Array.isArray(incoming)) {
      toast('IMPORT FAILED — NO "entries" ARRAY IN THAT FILE', 'error', 'IMPORT');
      return false;
    }
    const clean = incoming.filter(validEntry).map((entry) => ({
      id: `i-${Date.parse(entry.date)}-${entry.handle}-${entry.score}`,
      handle: safeHandle(entry.handle),
      score: Number(entry.score),
      total: Number(entry.total),
      percentage: Math.round((Number(entry.score) / Number(entry.total)) * 100),
      difficulty: String(entry.difficulty || 'mixed'),
      date: new Date(entry.date).toISOString()
    }));
    if (!clean.length) {
      toast('IMPORT FAILED — NO READABLE RUNS IN THAT FILE', 'error', 'IMPORT');
      return false;
    }
    const existing = readScoreFile();
    const seen = new Set(existing.map((entry) => entry.id));
    const merged = existing.concat(clean.filter((entry) => {
      if (seen.has(entry.id)) return false;
      seen.add(entry.id);
      return true;
    }));
    const next = merged
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, MAX_BOARD_ENTRIES);
    if (!writeScoreFile(next)) return false;
    renderBoard();
    toast(`${clean.length} RUN(S) IMPORTED`, 'ok', 'LEDGER');
    return true;
  }

  function handleImportFile(file) {
    if (!file) {
      toast('NO FILE SELECTED', 'warn', 'IMPORT');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      importScores(String(reader.result ?? ''));
    };
    reader.onerror = () => toast('IMPORT FAILED — THE FILE COULD NOT BE READ', 'error', 'IMPORT');
    try {
      reader.readAsText(file);
    } catch (err) {
      toast('IMPORT FAILED — THE FILE COULD NOT BE OPENED', 'error', 'IMPORT');
    }
  }

  function clearScores() {
    if (state.clearArmed) {
      const removed = readScoreFile().length;
      state.clearArmed = false;
      storage.remove(STORAGE_KEYS.scores);
      state.currentRunId = null;
      renderBoard();
      dom.clearConfirm.hidden = true;
      dom.clearScores.setAttribute('aria-pressed', 'false');
      dom.clearScores.textContent = 'Clear scores';
      toast(`${plural(removed, 'RUN', 'RUNS')} DELETED`, 'warn', 'LEDGER');
      return;
    }
    if (!readScoreFile().length) {
      toast('THE LEDGER IS ALREADY EMPTY', 'info', 'LEDGER');
      return;
    }
    dom.clearConfirm.hidden = false;
    dom.clearScores.setAttribute('aria-pressed', 'true');
    dom.clearScores.textContent = 'Confirm delete';
    state.clearArmed = true;
    setTimeout(() => {
      if (!state.clearArmed) return;
      state.clearArmed = false;
      dom.clearConfirm.hidden = true;
      dom.clearScores.setAttribute('aria-pressed', 'false');
      dom.clearScores.textContent = 'Clear scores';
    }, ARM_WINDOW_MS);
    dom.clearYes.focus();
  }

  function cancelClear() {
    state.clearArmed = false;
    dom.clearConfirm.hidden = true;
    dom.clearScores.setAttribute('aria-pressed', 'false');
    dom.clearScores.textContent = 'Clear scores';
  }

  /* ------------------------------- 18 PREFERENCES (theme/sound) */

  const prefs = (() => {
    const raw = storage.get(STORAGE_KEYS.prefs);
    if (!raw) return { theme: 'ink', sound: true };
    try {
      const parsed = JSON.parse(raw);
      return {
        theme: parsed && parsed.theme === 'paper' ? 'paper' : 'ink',
        sound: parsed ? parsed.sound !== false : true
      };
    } catch (err) {
      storage.remove(STORAGE_KEYS.prefs);
      return { theme: 'ink', sound: true };
    }
  })();

  function applyTheme(theme) {
    prefs.theme = theme;
    dom.html.dataset.theme = theme;
    dom.theme.setAttribute('aria-pressed', String(theme === 'paper'));
    dom.theme.setAttribute('aria-label', theme === 'paper' ? 'Switch to ink theme' : 'Switch to paper theme');
  }

  function applySound(on) {
    prefs.sound = on;
    sfx.enabled = on;
    dom.sound.setAttribute('aria-pressed', String(on));
    dom.sound.setAttribute('aria-label', on ? 'Sound effects: on' : 'Sound effects: off');
  }

  function savePrefs() {
    storage.set(STORAGE_KEYS.prefs, JSON.stringify({ theme: prefs.theme, sound: prefs.sound }));
  }

  /* ---------------------------------------- 19 WIRING (DELEGATION) */

  const focusablesIn = (root) =>
    $$('a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])', root);

  function trapFocus(root, event) {
    if (event.key !== 'Tab') return;
    const nodes = focusablesIn(root);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* Options: ONE delegated click listener for all four rows. */
  dom.options.addEventListener('click', (event) => {
    const button = event.target.closest('[data-option-index]');
    if (!button || !dom.options.contains(button)) return;
    selectOption(Number(button.dataset.optionIndex));
    playSound('tick');
  });

  /* Options: ONE delegated keydown implementing the radiogroup contract. */
  dom.options.addEventListener('keydown', (event) => {
    const button = event.target.closest('[data-option-index]');
    if (!button || !dom.options.contains(button)) return;
    const key = event.key;

    if (key === 'ArrowDown' || key === 'ArrowRight') {
      event.preventDefault();
      moveSelection(1);
      return;
    }
    if (key === 'ArrowUp' || key === 'ArrowLeft') {
      event.preventDefault();
      moveSelection(-1);
      return;
    }
    if (key === 'Home' || key === 'End') {
      event.preventDefault();
      selectOption(key === 'Home' ? 0 : 3, { focus: true });
      return;
    }
    if (key === 'Enter') {
      event.preventDefault();
      confirmAnswer();
      return;
    }
    if (key === ' ' || key === 'Spacebar') {
      event.preventDefault();
      selectOption(Number(button.dataset.optionIndex));
      playSound('tick');
      return;
    }
    const letter = LETTERS.indexOf(key.toUpperCase());
    if (letter > -1) {
      event.preventDefault();
      selectOption(letter, { focus: true });
      playSound('tick');
    }
  });

  /* Navigator: ONE delegated listener for every dot. */
  dom.navgrid.addEventListener('click', (event) => {
    const dot = event.target.closest('.navdot');
    if (!dot || !dom.navgrid.contains(dot)) return;
    jumpTo(Number(dot.dataset.index));
  });

  dom.setupForm.addEventListener('submit', handleStart);
  dom.start.addEventListener('click', handleStart);

  dom.handle.addEventListener('input', () => {
    if (dom.handle.getAttribute('aria-invalid') === 'true') {
      paintFieldError(dom.handle, dom.handleError, validateField(dom.handle, NAME_RULES).message);
    }
  });
  dom.handle.addEventListener('blur', () => {
    if (!dom.handle.value.trim()) return;
    paintFieldError(dom.handle, dom.handleError, validateField(dom.handle, NAME_RULES).message);
  });

  dom.difficultyChips.addEventListener('change', () => {
    renderSetup();
    paintFieldError($('input', dom.difficultyChips), dom.difficultyError,
      $$('input[name="difficulty"]', dom.difficultyChips).some((i) => i.checked) ? '' : 'Pick at least one difficulty tier.');
  });
  dom.topicChips.addEventListener('change', () => {
    renderSetup();
    paintFieldError($('input', dom.topicChips), dom.topicError,
      $$('input[name="topic"]', dom.topicChips).some((i) => i.checked) ? '' : 'Pick at least one topic.');
  });
  dom.count.addEventListener('change', renderSetup);

  dom.confirm.addEventListener('click', confirmAnswer);
  dom.next.addEventListener('click', () => {
    playSound('ui');
    advance();
  });
  dom.flag.addEventListener('click', toggleFlag);
  dom.pause.addEventListener('click', togglePause);
  dom.resume.addEventListener('click', () => closePause());
  dom.pauseQuit.addEventListener('click', () => {
    closePause({ focusBack: false });
    finishQuiz();
  });

  dom.quit.addEventListener('click', () => {
    const armed = armButton(dom.quit, 'quitArmed', {
      idle: 'End quiz now',
      armed: 'Confirm — end quiz'
    });
    if (!armed) {
      playSound('ui');
      finishQuiz();
      return;
    }
    playSound('tick');
    toast('PRESS AGAIN TO END THE QUIZ EARLY', 'warn', 'QUIT');
  });

  dom.overlay.addEventListener('click', (event) => {
    if (event.target === dom.overlay) closePause({ focusBack: false });
  });
  dom.overlay.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closePause();
      return;
    }
    trapFocus(dom.pauseDialog, event);
  });

  dom.retry.addEventListener('click', () => {
    playSound('ui');
    launch(state.config);
  });
  dom.newQuiz.addEventListener('click', showSetup);
  dom.boardEmptyBack.addEventListener('click', showSetup);
  dom.reviewJump.addEventListener('click', () => {
    dom.reviewTitle.focus();
    dom.review.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'start'
    });
    announce('Jumped to the full answer review.');
  });
  dom.exportReport.addEventListener('click', exportReport);
  dom.print.addEventListener('click', () => {
    toast('PRINT DIALOG OPENING — CHROME IS HIDDEN AND THE REPORT PRINTS IN INK ON WHITE', 'info', 'PRINT');
    window.print();
  });

  dom.faultRetry.addEventListener('click', async () => {
    state.phase = 'loading';
    renderPhase();
    dom.loadingNote.textContent = 'Re-reading the question bank…';
    const bank = await loadBank();
    renderSetup();
    renderBoard();
    showSetup();
    toast(
      bank.length ? `${bank.length} QUESTIONS AVAILABLE — PICK A SET AND START` : 'THE BANK IS STILL EMPTY',
      bank.length ? 'ok' : 'error',
      'RELOAD'
    );
    dom.start.focus();
  });
  dom.faultSetup.addEventListener('click', showSetup);

  dom.exportScores.addEventListener('click', exportAllScores);
  dom.importScores.addEventListener('click', () => {
    if (typeof dom.fileImport.click !== 'function') {
      toast('FILE PICKER UNAVAILABLE IN THIS BROWSER', 'error', 'IMPORT');
      return;
    }
    dom.fileImport.click();
  });
  dom.fileImport.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    handleImportFile(file);
    event.target.value = '';
  });
  dom.clearScores.addEventListener('click', clearScores);
  dom.clearYes.addEventListener('click', clearScores);
  dom.clearNo.addEventListener('click', () => {
    cancelClear();
    dom.clearScores.focus();
  });

  dom.sound.addEventListener('click', () => {
    const next = !sfx.enabled;
    applySound(next);
    savePrefs();
    if (next) playSound('ui');
    toast(next ? 'SOUND EFFECTS ON' : 'SOUND EFFECTS OFF', 'info', 'AUDIO');
  });
  dom.theme.addEventListener('click', () => {
    applyTheme(prefs.theme === 'paper' ? 'ink' : 'paper');
    savePrefs();
    toast(prefs.theme === 'paper' ? 'PAPER THEME — LIGHT ON INK' : 'INK THEME — DARK ON PAPER', 'info', 'THEME');
  });

  /* Global keyboard map, quiz phase only. */
  document.addEventListener('keydown', (event) => {
    if (state.phase !== 'quiz') return;
    const target = event.target;
    if (target instanceof HTMLElement && target.closest('input, select, textarea')) return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const key = event.key.toLowerCase();
    if (key === 'p') {
      event.preventDefault();
      togglePause();
      return;
    }
    if (state.paused) return;
    if (key === 'f') {
      event.preventDefault();
      toggleFlag();
    }
  });

  function reportFault(message) {
    try {
      toast(`RUNTIME FAULT — ${String(message).slice(0, 110).toUpperCase()}`, 'error', 'FAULT');
    } catch (err) {
      /* nothing left to fall back on */
    }
  }

  window.addEventListener('error', (event) => {
    reportFault(event && event.message ? event.message : 'unexpected error');
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event && event.reason;
    reportFault(reason && reason.message ? reason.message : reason || 'unhandled rejection');
  });

  /* Reveal-on-scroll. Never leaves content invisible if the API is missing. */
  function setupReveals() {
    const nodes = $$('[data-reveal]');
    const showAll = () => nodes.forEach((node) => node.classList.add('is-visible'));
    if (typeof window.IntersectionObserver !== 'function') {
      showAll();
      return;
    }
    const observer = new window.IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    nodes.forEach((node) => observer.observe(node));
    setTimeout(showAll, 1500);
  }

  /* --------------------------------------------------- 20 BOOT */

  applyTheme(prefs.theme);
  applySound(prefs.sound);
  buildSetupControls();
  renderSetup();
  renderBoard();
  renderPhase();
  setupReveals();

  const bootBank = embeddedBank();
  if (!bootBank.length) {
    showFault('No usable questions were found in js/questions.js. Every entry was rejected during validation — check the console for a syntax error in that file.');
    toast('QUESTION BANK EMPTY OR INVALID', 'error', 'BOOT');
  }

  window.QuizArena = { exportAllScores, importScores, buildReport };
})();