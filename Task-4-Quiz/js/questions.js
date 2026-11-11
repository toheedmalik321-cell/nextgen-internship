/* =============================================================================
   QUIZ ARENA — Embedded question bank
   Web Development Fundamentals · 20 questions · 4 difficulty tiers

   Plain script (NOT an ES module) so the app runs from file:// with no build
   step. Loaded before js/app.js and exposed as window.QUESTION_BANK.

   Shape of one entry:
   {
     id:         'q01'                     stable identifier, used in the report
     difficulty: 'easy' | 'medium' | 'hard' | 'expert'
     topic:      'html' | 'css' | 'js' | 'responsive' | 'a11y' | 'git' | 'devtools'
     prompt:     '…'
     options:    ['…', '…', '…', '…']     always exactly four
     answer:     2                          index into options
     explanation:'2–4 sentences, shown after answering'
   }

   Extending the bank: append an entry with a new `id`, keep four options and an
   `answer` index inside 0–3. Nothing else needs to change — difficulty counts,
   the topic legend, the per-topic breakdown and the review list are all derived.
   ========================================================================== */

window.QUESTION_BANK = [
  /* ---------------------------------------------------------------- EASY -- */
  {
    id: 'q01',
    difficulty: 'easy',
    topic: 'html',
    prompt:
      'Which element should wrap the primary visible content of a page so that assistive technology exposes it as the main landmark?',
    options: ['<div id="main">', '<main>', '<section>', '<article>'],
    answer: 1,
    explanation:
      'The <main> element identifies the dominant content of the document and maps to the ARIA "main" landmark, giving screen reader users a one-keystroke jump past the header and navigation. A <div> has no semantic meaning at all, even with an id — ids only ever act as hooks for CSS, fragments and JavaScript. <section> is a generic thematic grouping with no implicit role, and <article> is for a standalone, distributable composition such as a blog post.'
  },
  {
    id: 'q02',
    difficulty: 'easy',
    topic: 'html',
    prompt: 'What does the lang attribute on the <html> element actually do?',
    options: [
      'Sets the character encoding used to decode the page',
      'Declares the primary human language of the document, which speech synthesizers use to pick a voice and pronunciation rules',
      'Declares the fallback font for any text a custom webfont cannot render',
      'Tells the browser which language to machine-translate the content into'
    ],
    answer: 1,
    explanation:
      'lang declares the document\u2019s primary human language and is inherited by descendants until a nested element overrides it, so assistive technology can choose an appropriate voice, pronunciation and casing behaviour. It has nothing to do with encoding, which is declared by <meta charset> in the first 1024 bytes. Screen readers also apply language-specific rules for things such as how a mixed-case word or an acronym is spoken.'
  },
  {
    id: 'q03',
    difficulty: 'easy',
    topic: 'css',
    prompt:
      'Which declaration gives a flex container a single row of children that wraps onto new lines when they run out of room?',
    options: [
      'display: flex; flex-wrap: nowrap;',
      'display: flex; flex-flow: row wrap;',
      'display: grid; grid-auto-flow: row;',
      'display: flex; align-content: center;'
    ],
    answer: 1,
    explanation:
      'flex-flow is a shorthand for flex-direction and flex-wrap, so flex-flow: row wrap sets the main axis to horizontal and allows wrapping onto additional lines. flex-wrap already defaults to nowrap, which is why the first option can never wrap. align-content only aligns the wrapped lines inside the container\u2019s cross axis — it cannot create a wrap in the first place.'
  },
  {
    id: 'q04',
    difficulty: 'easy',
    topic: 'js',
    prompt: 'What does Array.prototype.map return?',
    options: [
      'It mutates the array in place and returns undefined',
      'A brand-new array of the same length, where each element is the result of the callback',
      'The same array reference, sorted in ascending order',
      'An object whose keys are the original indices'
    ],
    answer: 1,
    explanation:
      'map is non-mutating: it calls the callback for every element and returns a new array of the same length, leaving the source array untouched — which is exactly why it is safe to use on data you still need. It is not a mutating method, so no in-place result and no undefined return. This also means chaining is safe, but it allocates a new array on every call, which matters on hot paths such as render loops.'
  },
  {
    id: 'q05',
    difficulty: 'easy',
    topic: 'js',
    prompt:
      'A script calls document.querySelector(\'.card\') on a page that contains no element with that class. What comes back?',
    options: ['An empty <div> placeholder', 'undefined', 'null', 'An empty array'],
    answer: 2,
    explanation:
      'querySelector returns the first matching element, or null when nothing matches — it never fabricates a node and never returns an empty array. The related DOM APIs are consistent: getElementById and getElementsByClassName also return null for a miss, while querySelectorAll returns an empty NodeList rather than null. Because null is falsy, both if (el) guards and the ?? operator handle it correctly.'
  },
  {
    id: 'q06',
    difficulty: 'easy',
    topic: 'git',
    prompt:
      'You have edited three files and run git add on them. Which command records a new commit containing exactly the staged content, using the staged message?',
    options: ['git add -A', 'git commit', 'git push', 'git merge'],
    answer: 1,
    explanation:
      'git commit takes a snapshot of the index and creates a commit object pointing at it, using whatever message is staged. git add -A only stages changes, and importantly it stages the whole tree rather than what you meant. git push uploads commits you have already created, and git merge combines two histories — neither of them writes a new commit from your staged content.'
  },
  {
    id: 'q07',
    difficulty: 'easy',
    topic: 'devtools',
    prompt:
      'You select an element in a page and want to see its box model — content, padding, border and margin. Which DevTools panel does that?',
    options: ['Elements', 'Network', 'Performance', 'Application'],
    answer: 0,
    explanation:
      'The Elements panel shows the DOM tree and, in the Styles pane, the cascade, the computed values and the box model diagram for the selected node. The Network panel records requests and responses, Performance profiles runtime behaviour, and Application inspects storage and caches. The box model diagram is one of the fastest ways to explain why two visually identical elements occupy different widths.'
  },

  /* -------------------------------------------------------------- MEDIUM -- */
  {
    id: 'q08',
    difficulty: 'medium',
    topic: 'css',
    prompt:
      'A sticky header has position: sticky; top: 0, but it scrolls away with the page. What is the most common cause?',
    options: [
      'position: sticky is not supported in current browsers',
      'An ancestor has overflow set to something other than visible, so that ancestor — not the viewport — is now the scroll container',
      'position: sticky only works on elements with display: grid',
      'The sticky element has been removed from the normal document flow'
    ],
    answer: 1,
    explanation:
      'A sticky element offsets itself relative to its nearest scrollport, and an ancestor with overflow: hidden, auto or scroll silently becomes that scroll container, so the header sticks relative to a box that never actually scrolls. The same ancestor will also clip the header if it has overflow: hidden. Sticky positioning is fully supported and keeps the element in flow — unlike position: fixed — it is also constrained by its parent\u2019s box, so it stops sticking once its container scrolls past.'
  },
  {
    id: 'q09',
    difficulty: 'medium',
    topic: 'css',
    prompt:
      'A flex container uses flex-direction: row-reverse. In a left-to-right writing mode, where does main-start sit?',
    options: [
      'At the left edge, because the main axis always begins on the left',
      'At the right edge of the container',
      'At the top edge, because row-reverse switches onto the cross axis',
      'At the inline-start edge, which is always the left edge'
    ],
    answer: 1,
    explanation:
      'row-reverse keeps the main axis horizontal but inverts it, so main-start is the container\u2019s right (inline-end) edge — which is also where justify-content: flex-start packs items. That is the detail people trip over: the flex direction is independent of the writing mode, and inline-start only happens to equal the left edge in left-to-right writing modes. row and column only ever affect the main axis, so neither option reverses anything onto the cross axis.'
  },
  {
    id: 'q10',
    difficulty: 'medium',
    topic: 'js',
    prompt:
      'One listener is attached with element.addEventListener(\'click\', a, true) and another with element.addEventListener(\'click\', b). A click starts on a descendant of element and bubbles up to it. What happens?',
    options: [
      'Both fire, in the order they were registered',
      'a fires during the capture phase on the way down; b fires on the way back up in the bubble phase',
      'b fires first, because listeners without the third argument take priority',
      'Only a fires, because capture listeners implicitly stop propagation'
    ],
    answer: 1,
    explanation:
      'The third argument true puts a listener into the capture phase, which runs from the window down towards the target, while a listener registered without it runs in the bubble phase from the target back up. Registration order only matters between listeners on the same node in the same phase. Note the difference between the two stop methods: stopPropagation() prevents the event reaching later nodes, while stopImmediatePropagation() also skips remaining listeners on the node that is already handling it.'
  },
  {
    id: 'q11',
    difficulty: 'medium',
    topic: 'js',
    prompt: 'Which statement about const is correct?',
    options: [
      'const makes an object or array immutable',
      'const prevents the binding from being reassigned, but the properties of the value it holds can still change',
      'const only declares variables in the global scope',
      'const can be reassigned as long as the value is an object'
    ],
    answer: 1,
    explanation:
      'const locks the binding, not the value: obj.prop = 1 and arr.push(x) both work, because those mutate the existing object rather than replacing the binding. Reassigning the binding itself throws a TypeError. If you need genuinely immutable data, reach for Object.freeze(), which makes properties non-writable, and remember it is shallow.'
  },
  {
    id: 'q12',
    difficulty: 'medium',
    topic: 'js',
    prompt:
      'A single delegated listener is attached to a list, and inside it you call rowEl.closest(\'[data-id]\') after event.target.closest(\'[data-id]\'). What do event.target and event.currentTarget refer to?',
    options: [
      'Both refer to the list the listener is attached to',
      'event.target is the deepest element clicked; event.currentTarget is the element whose listener is currently running',
      'event.target is the listener\u2019s element and event.currentTarget is the clicked element',
      'They are identical for any event that was delegated'
    ],
    answer: 1,
    explanation:
      'target stays fixed as the element the event originated on, while currentTarget changes as the event travels up and down the tree to whichever node is executing the listener. That distinction is the whole mechanism behind event delegation: you start from event.target and walk up with closest() to find the row the user actually meant. This is why currentTarget is only meaningful during dispatch — by the time you read it in a queued microtask or a setTimeout, it is null.'
  },
  {
    id: 'q13',
    difficulty: 'medium',
    topic: 'responsive',
    prompt: 'Which media query expresses the mobile-first approach most directly?',
    options: [
      '@media (min-width: 48rem) { .grid { grid-template-columns: 1fr 1fr; } }',
      '@media (max-width: 48rem) { .grid { grid-template-columns: 1fr; } }',
      '@media (min-width: 768px) and (orientation: landscape) { .grid { display: none; } }',
      '@media (min-device-width: 320px) { .grid { grid-template-columns: 1fr 1fr; } }'
    ],
    answer: 0,
    explanation:
      'Mobile-first means the base styles describe the smallest screen and enhancements are layered on as space appears, which is what a min-width query does — the declaration inside is the enhancement, not the default. max-width queries describe the exception and force you to override, so complexity grows with every breakpoint. min-device-width is deprecated precisely because it is based on physical hardware rather than available CSS space.'
  },
  {
    id: 'q14',
    difficulty: 'medium',
    topic: 'a11y',
    prompt:
      'A form uses <label for="email">Email</label> followed by <input id="email">. What does that pairing give you that a placeholder cannot?',
    options: [
      'A default value for the field',
      'An accessible name that assistive technology announces, plus a larger click target bound to the field',
      'Automatic validation of the address format',
      'A visible helper description rendered beneath the field'
    ],
    answer: 1,
    explanation:
      'label[for] resolves to the control by id, becomes its accessible name, and makes the whole label a click target that focuses the field. Placeholder text is not a reliable accessible name: it disappears as soon as the user types, is frequently skipped or read inconsistently, and fails contrast requirements — it can only ever supplement a real label. Helper text belongs in an element linked by aria-describedby.'
  },

  /* ---------------------------------------------------------------- HARD -- */
  {
    id: 'q15',
    difficulty: 'hard',
    topic: 'html',
    prompt:
      'A form contains <input type="email"> and a submit button, and nothing else. What does the browser do when the user submits an invalid value?',
    options: [
      'It participates in native constraint validation, exposes the failure through input.validity, and blocks implicit submission until the value is valid',
      'It lowercases the value and silently drops any character that is not a-z',
      'It disables the submit button for as long as the value is invalid',
      'It only validates when a pattern attribute is also present'
    ],
    answer: 0,
    explanation:
      'Email inputs take part in constraint validation: the user agent checks a rudimentary pattern, surfaces validity through the ValidityState interface, shows its own bubble and prevents implicit submission until the value passes. Validation runs on submit rather than on every keystroke, so you still have to build your own feedback if you want it live. All of it is trivially bypassable from the console, which is why the same rule must be re-checked on the server.'
  },
  {
    id: 'q16',
    difficulty: 'hard',
    topic: 'css',
    prompt:
      'A grid uses grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) with only two cards in the markup. How does auto-fit differ from auto-fill here?',
    options: [
      'auto-fit collapses the empty tracks so the two cards stretch to fill the row; auto-fill keeps the empty tracks so cards stay at their minimum size',
      'auto-fill collapses the empty tracks and auto-fit keeps them',
      'They are aliases and always produce an identical result',
      'auto-fill only has an effect when grid-auto-rows is also declared'
    ],
    answer: 0,
    explanation:
      'Both create as many tracks with a 200px minimum as will fit, so the difference is what happens to the leftovers. auto-fit collapses the empty tracks, letting the surviving items grow to fill the row — the standard trick for a responsive card grid with no media queries. auto-fill preserves the empty tracks, so cards keep a stable width when there are fewer of them, which matters when you want visual rhythm rather than maximum stretch.'
  },
  {
    id: 'q17',
    difficulty: 'hard',
    topic: 'js',
    prompt:
      'Given this code, what order do the four values appear? async function f() { /*log(1)*/ 1; await null; /*log(3)*/ 3; } /*log("start")*/ "start"; f(); Promise.resolve().then(() => { /*log(2)*/ });',
    options: [
      'start, 1, 2, 3',
      'start, 1, 3, 2',
      'start, 2, 1, 3',
      '2, 1, 3, start'
    ],
    answer: 1,
    explanation:
      'Everything up to the first await runs synchronously, so start and 1 print during the initial pass before the call stack empties. await null yields to the microtask queue even though null is not a promise, and that resumption is queued before the .then callback, so 3 lands ahead of 2. The general rule: nothing after an await ever runs synchronously — the whole remainder of the function becomes a microtask continuation.'
  },
  {
    id: 'q18',
    difficulty: 'hard',
    topic: 'a11y',
    prompt: 'Which statement about ARIA is correct?',
    options: [
      'Adding role="button" to a <div> makes it focusable and operable with the keyboard',
      'Native elements such as <button> need an explicit role before they are exposed to assistive technology',
      'aria-label on a plain <div> is reliably announced by every screen reader and browser combination',
      'role always overrides the native semantics of the element it is placed on'
    ],
    answer: 0,
    explanation:
      'ARIA only edits the accessibility tree — it adds no behaviour whatsoever. A <div role="button"> is announced as a button but still needs tabindex="0" and keyboard handlers before it can be reached or activated, which is why the first rule of ARIA is to use a native element instead. Native elements such as <button> already carry role, focusability and Enter/Space activation for free. And role is a role, not a guarantee: browser and screen reader support for a given role still varies, and several values do exactly nothing.'
  },

  /* -------------------------------------------------------------- EXPERT -- */
  {
    id: 'q19',
    difficulty: 'expert',
    topic: 'js',
    prompt: 'What does [\'10\', \'9\', \'100\'].sort() return, and why?',
    options: [
      '[\'10\', \'100\', \'9\'] — with no comparator the elements are compared as strings, character by character',
      '[\'9\', \'10\', \'100\'] — strings are coerced to numbers before comparison',
      '[\'10\', \'9\', \'100\'] — the array is unchanged because string arrays cannot be sorted',
      '[\'100\', \'10\', \'9\'] — sorting runs from the highest UTF-16 code unit downwards'
    ],
    answer: 0,
    explanation:
      'With no comparator, sort converts each element to a string and compares UTF-16 code units, so \u2018100\u2019 sorts before \u201910\u2019 because the first character decides and 0 precedes 9. Nothing is coerced to a number — a comparator is what makes it numeric, as in (a, b) => a - b. Since ES2019 the algorithm is required to be stable, so a comparator that returns 0 for equivalent elements guarantees they keep their original relative order.'
  },
  {
    id: 'q20',
    difficulty: 'expert',
    topic: 'git',
    prompt:
      'Your branch has three commits you want to fold into one, and then move that commit onto the latest main. Which sequence does that, and what happens to the old commits?',
    options: [
      'git rebase -i main, squash the three into one, then git rebase main — the old commit objects are rewritten and their SHAs are discarded',
      'git merge --squash main, then git push --force — the local history is replaced by a single fresh commit',
      'git reset --hard HEAD~3, then git commit — the three commits are removed and a new one is created',
      'git cherry-pick the three commits in reverse order — main is rewritten and the branch is left detached'
    ],
    answer: 0,
    explanation:
      'git rebase -i main hands you an editable list of the commits sitting on top of main; squash (or fixup) folds them into a single commit, and the second rebase replays that one commit onto the current main. Rebase never edits history in place — it creates new commit objects, so the original three SHAs become unreferenced garbage-collectable objects. That is why you never rebase commits that have been pushed and shared with someone else, whereas git merge --squash is a completely different operation: it stages another branch\u2019s work into your index and discards its commit structure.'
  }
];

/* Metadata derived once at load so the setup screen, the topic legend and the
   results breakdown all agree without recalculating anything later. */
window.QUESTION_TOPICS = ['html', 'css', 'js', 'responsive', 'a11y', 'git', 'devtools'];

window.QUESTION_TIERS = ['easy', 'medium', 'hard', 'expert'];

window.DIFFICULTY_META = {
  easy: { label: 'Easy', chip: 'Foundational' },
  medium: { label: 'Medium', chip: 'Working knowledge' },
  hard: { label: 'Hard', chip: 'Interview depth' },
  expert: { label: 'Expert', chip: 'Edge cases' }
};