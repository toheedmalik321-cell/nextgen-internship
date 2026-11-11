/* Plates. Filter, sort, search and the lightbox all read the same state.
   The fetch() of the JSON catalogue is optional: on file:// it is blocked, so
   the inline array further down is used instead. */
(function () {
  'use strict';

  /* =======================================================================
     1. DATA — the fallback source of truth for all sixteen plates
     ===================================================================== */
  let META_URL = 'assets/works/index.json';

  let PLATES = [
    { slug: 'contour-field', title: 'Contour Field', category: 'Geometric', added: 16,
      tags: ['lines', 'ridge', 'iso'],
      description: 'Nested contour lines march across a single ridge, each offset by a fixed interval. Read as a topographic survey of something that does not exist.' },
    { slug: 'strata', title: 'Strata', category: 'Topographic', added: 15,
      tags: ['bands', 'sediment', 'fault'],
      description: 'Horizontal sediment bands stacked at uneven intervals, cut by a slow diagonal fault that displaces every layer it crosses.' },
    { slug: 'topography', title: 'Topography', category: 'Topographic', added: 14,
      tags: ['contours', 'peak', 'rings'],
      description: 'Radial contour rings rising from an off-centre peak. Ring spacing tightens toward the summit, the way real contours do.' },
    { slug: 'moire', title: 'Moire', category: 'Geometric', added: 13,
      tags: ['interference', 'grating', 'optics'],
      description: 'Two fine gratings at a 9.5 unit pitch, one vertical and one horizontal, counter-rotated by thirteen degrees. The beat bands between them are not drawn — they are produced by your eye.' },
    { slug: 'circuit', title: 'Circuit', category: 'Technical', added: 12,
      tags: ['traces', 'pads', 'orthogonal'],
      description: 'Orthogonal copper traces on a two-layer grid, terminating in round pads. Junctions avoid ninety-degree corners except where a pad forces one.' },
    { slug: 'radial-burst', title: 'Radial Burst', category: 'Geometric', added: 11,
      tags: ['rays', 'origin', 'fan'],
      description: 'Rays thrown from an origin that deliberately sits off the centre of the plate, so the composition leans rather than balances.' },
    { slug: 'brutalist-blocks', title: 'Brutalist Blocks', category: 'Geometric', added: 10,
      tags: ['slabs', 'mass', 'concrete'],
      description: 'Offset concrete slabs with hairline borders and one solid acid plane. Mass without shadow — depth is carried entirely by surface value.' },
    { slug: 'orbit', title: 'Orbit', category: 'Geometric', added: 9,
      tags: ['rings', 'satellites', 'apogee'],
      description: 'Five concentric orbital rings drawn as open arcs of differing sweep, each carrying satellite markers. One acid ellipse crosses them all on a tilted axis.' },
    { slug: 'blueprint', title: 'Blueprint', category: 'Technical', added: 8,
      tags: ['drafting', 'dimension', 'titleblock'],
      description: 'A working drawing sheet: fine and major grids, two dimensioned circles with arrowed extension lines, a dashed centreline, and a title block in the lower right.' },
    { slug: 'lattice', title: 'Lattice', category: 'Geometric', added: 7,
      tags: ['grid', 'rotate', 'band'],
      description: 'A forty-five degree lattice of outlined cells, each inset to leave a regular gap, with a diagonal band of cells filled solid acid.' },
    { slug: 'spiral-dash', title: 'Spiral Dash', category: 'Generative', added: 6,
      tags: ['spiral', 'dash', 'ticks'],
      description: 'A dashed Archimedean spiral of twelve turns over radiating tick marks, with a second and third copy at different dash phases to build interference.' },
    { slug: 'waveform', title: 'Waveform', category: 'Generative', added: 5,
      tags: ['sine', 'ribbons', 'amplitude'],
      description: 'Stacked sine ribbons of increasing amplitude and decreasing phase. One band is filled to show where a real signal would carry its energy.' },
    { slug: 'halftone', title: 'Halftone', category: 'Generative', added: 4,
      tags: ['dots', 'ramp', 'print'],
      description: 'A halftone dot field whose radius is driven by a diagonal tonal ramp crossed by two sine wave fields and a hot-spot, stepping cyan through off-white to acid lime.' },
    { slug: 'prism', title: 'Prism', category: 'Technical', added: 3,
      tags: ['dispersion', 'ray', 'spectrum'],
      description: 'One incident ray striking the left face of an outlined prism, splitting into a nine-line fan that disperses through the glass and exits the right face with visible deviation.' },
    { slug: 'vortex', title: 'Vortex', category: 'Generative', added: 2,
      tags: ['pinwheel', 'wedges', 'swirl'],
      description: 'Twenty-four narrow wedges spiralling clockwise around an off-centre core, alternating in opacity so the rotation reads as a pinwheel rather than a starburst.' },
    { slug: 'dot-matrix-face', title: 'Dot Matrix Face', category: 'Figurative', added: 1,
      tags: ['portrait', 'matrix', 'light'],
      description: 'A portrait resolved as a matrix of dots on a fifteen by eleven grid, with dot radius driven by a key light from the upper left, an acid core on the lit cheek and a cyan rim light down the right contour.' }
  ];

  let SRC_ROOT = 'assets/works/';
  let srcFor = function (slug) { return SRC_ROOT + slug + '.svg'; };

  /* The metadata file is the same shape as PLATES but may carry extra keys
     (file, canvas, palette...). normalise() projects it back down to exactly
     the fields the app reads, so a stray key can never break rendering. */
  function normalise(row) {
    return {
      slug: String(row.slug),
      title: String(row.title),
      category: String(row.category),
      added: Number(row.added) || 0,
      tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
      description: String(row.description || '')
    };
  }

  /* =======================================================================
     2. DOM + STATE
     ===================================================================== */
  let $ = function (sel, scope) { return (scope || document).querySelector(sel); };
  let $$ = function (sel, scope) { return Array.prototype.slice.call((scope || document).querySelectorAll(sel)); };

  let el = {
    grid: $('#grid'),
    chips: $('#category-chips'),
    search: $('#plate-search'),
    searchClear: $('#search-clear'),
    sort: $('#plate-sort'),
    summary: $('#gallery-summary'),
    readout: $('#header-readout'),
    skeletons: $('#skeletons'),
    empty: $('#empty'),
    emptyReset: $('#empty-reset'),
    helpOpen: $('#help-open'),
    toTop: $('#to-top'),
    toasts: $('#toasts'),
    modal: $('#modal'),
    modalPanel: $('#modal-panel'),
    modalBody: $('#modal-body'),
    modalIndex: $('#modal-index'),
    modalNav: $('#modal-nav'),
    modalPrev: $('#modal-prev'),
    modalNext: $('#modal-next'),
    filmstrip: $('#filmstrip')
  };

  let state = {
    plates: PLATES.map(normalise),
    source: 'inline',
    category: 'all',
    query: '',
    sort: 'featured',
    view: 'grid',
    visible: [],
    current: null,
    lastFocus: null
  };

  let STORE_KEY = 'ngsh.plates.view.v1';
  let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* =======================================================================
     3. DERIVED DATA
     ===================================================================== */
  function categories() {
    let seen = [];
    state.plates.forEach(function (p) { if (seen.indexOf(p.category) === -1) seen.push(p.category); });
    return seen;
  }

  function matchesQuery(plate, query) {
    if (!query) return true;
    let haystack = (plate.title + ' ' + plate.description + ' ' + plate.tags.join(' ')).toLowerCase();
    return haystack.indexOf(query) !== -1;
  }

  function sortRows(rows) {
    let sorted = rows.slice();
    if (state.sort === 'az') {
      sorted.sort(function (a, b) { return a.title.localeCompare(b.title); });
    } else if (state.sort === 'newest') {
      sorted.sort(function (a, b) { return a.added - b.added; });
    } else {
      sorted.sort(function (a, b) { return b.added - a.added; });
    }
    return sorted;
  }

  function visiblePlates() {
    let query = state.query.trim().toLowerCase();
    return sortRows(state.plates.filter(function (p) {
      if (state.category !== 'all' && p.category !== state.category) return false;
      return matchesQuery(p, query);
    }));
  }

  /* =======================================================================
     4. TILES
     ===================================================================== */
  function buildTile(plate) {
    let li = document.createElement('li');
    li.className = 'tile';
    li.setAttribute('data-slug', plate.slug);
    li.setAttribute('role', 'listitem');

    let button = document.createElement('button');
    button.type = 'button';
    button.className = 'tile__btn';
    button.setAttribute('data-slug', plate.slug);
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-label', 'Open plate ' + plate.title + ' in the lightbox');

    let frame = document.createElement('span');
    frame.className = 'tile__frame';

    let img = document.createElement('img');
    img.className = 'tile__img';
    img.setAttribute('src', srcFor(plate.slug));
    img.setAttribute('alt', plate.title + ' — ' + plate.description);
    img.loading = 'lazy';
    img.decoding = 'async';
    img.width = 1200;
    img.height = 900;

    let sheen = document.createElement('span');
    sheen.className = 'tile__sheen';
    sheen.setAttribute('aria-hidden', 'true');

    let badge = document.createElement('span');
    badge.className = 'tile__badge';
    badge.setAttribute('aria-hidden', 'true');
    badge.textContent = 'View \u2922';

    frame.append(img, sheen);

    let caption = document.createElement('span');
    caption.className = 'tile__caption';
    let title = document.createElement('span');
    title.className = 'tile__title';
    title.textContent = plate.title;
    let meta = document.createElement('span');
    meta.className = 'tile__meta';
    meta.textContent = plate.category;
    caption.append(title, meta);

    button.append(frame, badge, caption);
    li.appendChild(button);
    return li;
  }

  /* =======================================================================
     5. RENDER + FLIP
     The FLIP technique, in four named phases:
       FIRST   — measure every tile's current rect BEFORE the DOM changes
       LAST    — mutate the DOM, then measure the new rects
       INVERT  — apply the inverse transform so each tile appears not to have moved
       PLAY    — on the next frame, release the transform so it animates into place
     ===================================================================== */
  function render() {
    let next = visiblePlates();
    state.visible = next;

    let existing = {};
    $$('.tile', el.grid).forEach(function (node) { existing[node.getAttribute('data-slug')] = node; });

    /* ---- FIRST ---- */
    let first = {};
    Object.keys(existing).forEach(function (slug) {
      let rect = existing[slug].getBoundingClientRect();
      first[slug] = { top: rect.top, left: rect.left };
    });

    /* ---- LAST (mutate, then measure) ---- */
    let wanted = next.map(function (p) { return p.slug; });

    Object.keys(existing).forEach(function (slug) {
      if (wanted.indexOf(slug) !== -1) return;
      let node = existing[slug];
      node.classList.add('is-out');
      window.setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, reduceMotion ? 0 : 200);
    });

    let fragment = document.createDocumentFragment();
    next.forEach(function (plate) {
      let node = existing[plate.slug];
      if (!node) {
        node = buildTile(plate);
      } else {
        node.classList.remove('is-out');
        node.style.transition = '';
        node.style.transform = '';
      }
      fragment.appendChild(node);
    });
    el.grid.appendChild(fragment);

    /* ---- INVERT + PLAY ---- */
    if (!reduceMotion) {
      next.forEach(function (plate) {
        let node = existing[plate.slug];
        if (!node || !first[plate.slug]) return;
        let rect = node.getBoundingClientRect();
        let dx = first[plate.slug].left - rect.left;
        let dy = first[plate.slug].top - rect.top;
        if (!dx && !dy) return;
        node.style.transition = 'none';
        node.style.transform = 'translate(' + dx + 'px, ' + dy + 'px)';
        requestAnimationFrame(function () {
          node.style.transition = 'transform 420ms cubic-bezier(.2,.8,.2,1)';
          node.style.transform = '';
        });
      });
    }

    el.grid.hidden = next.length === 0;
    el.empty.hidden = next.length !== 0;
    el.summary.textContent = next.length === state.plates.length
      ? 'Showing all ' + state.plates.length + ' plates.'
      : 'Showing ' + next.length + ' of ' + state.plates.length + ' plates.';
    el.readout.textContent = next.length + ' / ' + state.plates.length + ' SHOWN';

    renderChips();
  }

  function renderChips() {
    let query = state.query.trim().toLowerCase();

    $$('.chip[data-category]', el.chips).forEach(function (chip) {
      let cat = chip.getAttribute('data-category');
      let count = state.plates.filter(function (p) {
        if (cat !== 'all' && p.category !== cat) return false;
        return matchesQuery(p, query);
      }).length;
      let badge = $('.chip__count', chip);
      if (badge) badge.textContent = String(count);
      let active = cat === state.category;
      chip.classList.toggle('is-active', active);
      chip.setAttribute('aria-pressed', active ? 'true' : 'false');
      chip.disabled = count === 0 && !active;
    });
  }

  function renderCategoryChips() {
    let frag = document.createDocumentFragment();

    let all = document.createElement('button');
    all.type = 'button';
    all.className = 'chip is-active';
    all.setAttribute('data-category', 'all');
    all.setAttribute('aria-pressed', 'true');
    all.appendChild(document.createTextNode('All '));
    let allCount = document.createElement('span');
    allCount.className = 'chip__count';
    allCount.textContent = String(state.plates.length);
    all.appendChild(allCount);
    frag.appendChild(all);

    categories().forEach(function (name) {
      let button = document.createElement('button');
      button.type = 'button';
      button.className = 'chip';
      button.setAttribute('data-category', name);
      button.setAttribute('aria-pressed', 'false');
      button.appendChild(document.createTextNode(name + ' '));
      let badge = document.createElement('span');
      badge.className = 'chip__count';
      badge.textContent = '0';
      button.appendChild(badge);
      frag.appendChild(button);
    });

    el.chips.textContent = '';
    el.chips.appendChild(frag);
  }

  /* =======================================================================
     6. REUSABLE DIALOG — one component, two consumers (lightbox, shortcuts)
     ===================================================================== */
  let FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function openDialog(render_, indexLabel) {
    if (el.modal.hidden) state.lastFocus = document.activeElement;
    el.modalIndex.textContent = indexLabel || '';
    el.modalNav.hidden = false;
    el.modalBody.textContent = '';
    render_();
    el.modal.hidden = false;
    el.modalPanel.scrollTop = 0;
    document.body.classList.add('is-locked');
    let firstFocusable = $(FOCUSABLE, el.modalPanel);
    if (firstFocusable) firstFocusable.focus();
  }

  function closeDialog() {
    if (el.modal.hidden) return;
    el.modal.hidden = true;
    el.modalBody.textContent = '';
    el.filmstrip.textContent = '';
    document.body.classList.remove('is-locked');
    if (state.lastFocus && document.contains(state.lastFocus)) state.lastFocus.focus();
    state.lastFocus = null;
    if (state.current) {
      state.current = null;
      clearHash();
    }
  }

  function buildLightbox(slug) {
    let index = state.visible.findIndex(function (p) { return p.slug === slug; });
    if (index === -1) {
      /* the plate is filtered out — fall back to the whole series */
      state.visible = sortRows(state.plates);
      index = state.visible.findIndex(function (p) { return p.slug === slug; });
    }
    if (index === -1) return;

    let plate = state.visible[index];
    state.current = { slug: slug, index: index };

    openDialog(function () {
      let figure = document.createElement('figure');
      figure.className = 'lightbox-figure';

      let img = document.createElement('img');
      img.setAttribute('src', srcFor(plate.slug));
      img.setAttribute('alt', plate.title + ' — ' + plate.description);
      img.setAttribute('data-role', 'lightbox-image');
      img.addEventListener('pointerdown', onPointerDown);
      img.addEventListener('pointerup', onPointerUp);
      img.addEventListener('pointercancel', function () { swipe.start = null; });

      let info = document.createElement('div');
      info.className = 'plate-info';

      let heading = document.createElement('h2');
      heading.id = 'modal-title';
      heading.textContent = plate.title;

      let meta = document.createElement('p');
      meta.className = 'modal__index';
      meta.textContent = plate.category;

      let body = document.createElement('p');
      body.textContent = plate.description;

      let tags = document.createElement('div');
      tags.className = 'tagrow';
      plate.tags.forEach(function (tag) {
        let chip = document.createElement('span');
        chip.className = 'tag';
        chip.textContent = tag;
        tags.appendChild(chip);
      });

      info.append(heading, meta, body, tags);
      figure.append(img, info);
      el.modalBody.appendChild(figure);
    }, pad(index + 1) + ' / ' + pad(state.visible.length));

    buildFilmstrip(index);
    preloadNeighbours(index);
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  function buildFilmstrip(activeIndex) {
    el.filmstrip.textContent = '';
    state.visible.forEach(function (plate, i) {
      let button = document.createElement('button');
      button.type = 'button';
      button.className = 'filmstrip__item';
      if (i === activeIndex) button.setAttribute('aria-current', 'true');
      button.setAttribute('aria-label', 'Plate ' + (i + 1) + ': ' + plate.title);
      let img = document.createElement('img');
      img.setAttribute('src', srcFor(plate.slug));
      img.setAttribute('alt', '');
      img.loading = 'lazy';
      button.appendChild(img);
      el.filmstrip.appendChild(button);
    });
    let active = el.filmstrip.children[activeIndex];
    if (active && active.scrollIntoView) {
      active.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduceMotion ? 'auto' : 'smooth' });
    }
  }

  /* Closure: preloads the neighbouring plates with Promise.all so paging
     through the lightbox feels instant. Failures are swallowed on purpose —
     a preload is an optimisation, never a requirement. */
  function preloadNeighbours(index) {
    let targets = [index - 1, index + 1]
      .filter(function (i) { return i >= 0 && i < state.visible.length; })
      .map(function (i) { return srcFor(state.visible[i].slug); });
    if (!targets.length) return Promise.resolve([]);
    return Promise.all(targets.map(function (src) {
      return new Promise(function (resolve) {
        let image = new Image();
        image.onload = function () { resolve(src); };
        image.onerror = function () { resolve(null); };
        image.src = src;
      });
    }));
  }

  function step(delta) {
    if (!state.current || !state.visible.length) return;
    let nextIndex = (state.current.index + delta + state.visible.length) % state.visible.length;
    goTo(nextIndex);
  }

  function goTo(index) {
    let plate = state.visible[index];
    if (!plate) return;
    let hadHash = window.location.hash.indexOf('#/plate/') === 0;
    buildLightbox(plate.slug);
    if (hadHash) writeHash(plate.slug);
  }

  /* Closure: the swipe state machine. Lives entirely inside the returned
     handlers so a second pointer on the same image cannot corrupt it. */
  let swipe = { start: null };

  function onPointerDown(event) {
    if (event.pointerType === 'mouse') return;
    swipe.start = { x: event.clientX, y: event.clientY };
  }

  function onPointerUp(event) {
    if (!swipe.start) return;
    let dx = event.clientX - swipe.start.x;
    let dy = event.clientY - swipe.start.y;
    swipe.start = null;
    if (Math.abs(dx) < 48) return;
    if (Math.abs(dx) < Math.abs(dy)) return;
    step(dx < 0 ? 1 : -1);
  }

  function openShortcuts() {
    let rows = [
      ['/', 'Focus the search field'],
      ['?', 'Open this shortcuts panel'],
      ['\u2190  \u2192', 'Previous / next plate in the lightbox'],
      ['Home  End', 'First / last plate'],
      ['Enter  Space', 'Open the focused plate'],
      ['Esc', 'Close the lightbox or this panel'],
      ['1 \u2013 5', 'Jump straight to a category']
    ];
    openDialog(function () {
      let panel = document.createElement('div');
      panel.className = 'keys-panel';
      let heading = document.createElement('h2');
      heading.id = 'modal-title';
      heading.textContent = 'Keyboard';
      let list = document.createElement('ul');
      list.className = 'keys-list';
      rows.forEach(function (row) {
        let item = document.createElement('li');
        let key = document.createElement('kbd');
        key.textContent = row[0];
        let label = document.createElement('span');
        label.textContent = row[1];
        item.append(key, label);
        list.appendChild(item);
      });
      panel.append(heading, list);
      el.modalBody.appendChild(panel);
    }, 'KEYS');
    el.modalNav.hidden = true;
  }

  /* =======================================================================
     7. ROUTING — #/plate/<slug>
     ===================================================================== */
  function writeHash(slug) {
    if (window.history && window.history.replaceState) {
      window.history.replaceState(null, '', '#/plate/' + slug);
    } else {
      window.location.hash = '#/plate/' + slug;
    }
  }

  function clearHash() {
    if (!window.history || !window.history.replaceState) return;
    try {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    } catch (err) {
      /* some browsers refuse to rewrite a file:// URL — harmless */
    }
  }

  function slugFromHash() {
    let match = /^#\/plate\/([\w-]+)$/.exec(window.location.hash || '');
    return match ? match[1] : null;
  }

  function onHashChange() {
    let slug = slugFromHash();
    if (slug) {
      buildLightbox(slug);
    } else {
      closeDialog();
    }
  }

  /* =======================================================================
     8. EVENTS
     ===================================================================== */

  /* One delegated click listener for the entire grid. */
  el.grid.addEventListener('click', function (event) {
    let button = event.target.closest('[data-slug]');
    if (!button || !el.grid.contains(button)) return;
    buildLightbox(button.getAttribute('data-slug'));
    writeHash(button.getAttribute('data-slug'));
  });

  /* Chips: category filters and view toggles, both delegated on their parent. */
  el.chips.addEventListener('click', function (event) {
    let chip = event.target.closest('[data-category]');
    if (!chip || chip.disabled) return;
    state.category = chip.getAttribute('data-category');
    render();
  });

  $$('.viewtoggle__row').forEach(function (row) {
    row.addEventListener('click', function (event) {
      let chip = event.target.closest('[data-view]');
      if (!chip) return;
      state.view = chip.getAttribute('data-view');
      el.grid.setAttribute('data-view', state.view);
      $$('[data-view]', row).forEach(function (node) {
        let active = node === chip;
        node.classList.toggle('is-active', active);
        node.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      try { window.localStorage.setItem(STORE_KEY, state.view); } catch (err) { /* non-fatal */ }
    });
  });

  /* Closure: debounce factory for the search field. */
  let debounce = function (fn, wait) {
    let timer = null;
    let wrapped = function () {
      let args = arguments;
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(function () {
        timer = null;
        fn.apply(null, args);
      }, wait);
    };
    wrapped.cancel = function () {
      if (timer) window.clearTimeout(timer);
      timer = null;
    };
    return wrapped;
  };

  let runSearch = debounce(function (value) {
    state.query = value;
    render();
  }, 180);

  el.search.addEventListener('input', function () {
    el.searchClear.hidden = !el.search.value;
    runSearch(el.search.value);
  });

  el.searchClear.addEventListener('click', function () {
    runSearch.cancel();
    el.search.value = '';
    el.searchClear.hidden = true;
    state.query = '';
    render();
    el.search.focus();
  });

  el.sort.addEventListener('change', function () {
    state.sort = el.sort.value;
    render();
  });

  el.emptyReset.addEventListener('click', function () {
    runSearch.cancel();
    state.category = 'all';
    state.query = '';
    state.sort = 'featured';
    el.search.value = '';
    el.searchClear.hidden = true;
    el.sort.value = 'featured';
    render();
  });

  el.helpOpen.addEventListener('click', openShortcuts);
  el.modalPrev.addEventListener('click', function () { step(-1); });
  el.modalNext.addEventListener('click', function () { step(1); });

  el.modal.addEventListener('click', function (event) {
    if (event.target.closest('[data-close]')) closeDialog();
  });

  el.filmstrip.addEventListener('click', function (event) {
    let item = event.target.closest('.filmstrip__item');
    if (!item) return;
    let index = Array.prototype.indexOf.call(el.filmstrip.children, item);
    if (index !== -1) goTo(index);
  });

  /* One document-level keydown handler covers paging, the focus trap and the
     global shortcuts. */
  document.addEventListener('keydown', function (event) {
    let dialogOpen = !el.modal.hidden;

    if (event.key === 'Escape' && dialogOpen) {
      event.preventDefault();
      closeDialog();
      return;
    }

    if (dialogOpen) {
      if (event.key === 'ArrowLeft' && state.current) { event.preventDefault(); step(-1); return; }
      if (event.key === 'ArrowRight' && state.current) { event.preventDefault(); step(1); return; }
      if (event.key === 'Home' && state.current) { event.preventDefault(); goTo(0); return; }
      if (event.key === 'End' && state.current) { event.preventDefault(); goTo(state.visible.length - 1); return; }

      if (event.key === 'Tab') {
        let focusables = $$(FOCUSABLE, el.modalPanel).filter(function (node) {
          return node.offsetParent !== null;
        });
        if (!focusables.length) return;
        let first = focusables[0];
        let last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
      return;
    }

    let typing = document.activeElement && (
      document.activeElement.tagName === 'INPUT' ||
      document.activeElement.tagName === 'SELECT' ||
      document.activeElement.tagName === 'TEXTAREA'
    );

    if (typing) return;

    if (event.key === '/') {
      event.preventDefault();
      el.search.focus();
      return;
    }

    if (event.key === '?') {
      event.preventDefault();
      openShortcuts();
      return;
    }

    if (/^[1-9]$/.test(event.key)) {
      let names = ['all'].concat(categories());
      let name = names[Number(event.key) - 1];
      if (!name) return;
      event.preventDefault();
      state.category = name;
      render();
    }
  });

  window.addEventListener('hashchange', onHashChange);

  el.toTop.addEventListener('click', function () {
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  });

  /* =======================================================================
     9. TOASTS
     ===================================================================== */
  function toast(message) {
    let node = document.createElement('p');
    node.className = 'toast';
    node.setAttribute('role', 'status');
    node.textContent = message;
    el.toasts.appendChild(node);
    window.setTimeout(function () {
      node.classList.add('is-out');
      window.setTimeout(function () {
        if (node.parentNode) node.parentNode.removeChild(node);
      }, 200);
    }, 3200);
  }

  /* =======================================================================
     10. BOOT
     ===================================================================== */

  /* Closure: simulates the asset load so the skeleton state is real. */
  let settle = function (ms) {
    return new Promise(function (resolve) { window.setTimeout(resolve, ms); });
  };

  /* Try the external metadata file first, fall back to the inline array.
     The fallback is the primary path when the page is opened from file://,
     where fetch() is blocked by the browser's origin rules. */
  function loadMetadata() {
    if (!window.fetch || typeof Response === 'undefined') {
      return Promise.resolve(PLATES.map(normalise));
    }
    return window.fetch(META_URL, { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (payload) {
        let rows = Array.isArray(payload) ? payload : payload.plates;
        if (!Array.isArray(rows) || rows.length !== PLATES.length) {
          throw new Error('unexpected plate count');
        }
        state.source = 'fetch';
        return rows.map(normalise);
      })
      .catch(function () {
        state.source = 'inline';
        return PLATES.map(normalise);
      });
  }

  function showSkeletons() {
    el.skeletons.textContent = '';
    let frag = document.createDocumentFragment();
    for (let i = 0; i < 8; i += 1) {
      let box = document.createElement('div');
      box.className = 'skeleton';
      frag.appendChild(box);
    }
    el.skeletons.appendChild(frag);
  }

  function boot() {
    showSkeletons();

    let savedView = null;
    try { savedView = window.localStorage.getItem(STORE_KEY); } catch (err) { savedView = null; }
    if (['grid', 'comfort', 'mosaic'].indexOf(savedView) !== -1) {
      state.view = savedView;
      el.grid.setAttribute('data-view', savedView);
      $$('[data-view]').forEach(function (node) {
        let active = node.getAttribute('data-view') === savedView;
        node.classList.toggle('is-active', active);
        node.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
    } else {
      el.grid.setAttribute('data-view', state.view);
    }

    renderCategoryChips();

    Promise.all([loadMetadata(), settle(reduceMotion ? 0 : 260)])
      .then(function (results) {
        state.plates = results[0];
        el.skeletons.textContent = '';
        render();

        let slug = slugFromHash();
        if (slug) {
          buildLightbox(slug);
        } else {
          toast('Loaded ' + state.plates.length + ' plates from the ' + state.source + ' source.');
        }
      })
      .catch(function () {
        el.skeletons.textContent = '';
        toast('The plates could not be prepared. Reopen the page to try again.');
      });
  }

  boot();
})();