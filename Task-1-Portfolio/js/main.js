/* Portfolio behaviour. Classic script, no modules, so index.html opens straight
   from disk. Nav, scroll spy, reveal animations and the contact form live here. */
(function () {
  'use strict';

  /* Marks the document as script-enhanced so CSS can start elements hidden.
     Without JavaScript nothing is hidden and nothing is lost. */
  document.documentElement.classList.add('js');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canObserve = 'IntersectionObserver' in window;
  const desktopNav = window.matchMedia('(min-width: 900px)');

  const one = (selector, scope) => (scope || document).querySelector(selector);
  const all = (selector, scope) => Array.from((scope || document).querySelectorAll(selector));

  /* ======================================================================
     1 · CLOCK — live PKT time, updates every second
     ====================================================================== */

  const initClock = () => {
    const heroClock = one('#clock');
    const navClock = one('#nav-clock');
    if (!heroClock && !navClock) return;

    const formatter = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Karachi',
      hourCycle: 'h23',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    const paint = () => {
      const time = formatter.format(new Date());
      if (heroClock) {
        heroClock.textContent = `${time} PKT`;
        heroClock.setAttribute('datetime', `${time}+05:00`);
      }
      if (navClock) navClock.textContent = time;
    };

    paint();
    setInterval(paint, 1000);
  };

  /* ======================================================================
     2 · MOBILE MENU — full-screen overlay, focus trapped, Escape closes
     ====================================================================== */

  const initMenu = () => {
    const header = one('.site-header');
    const toggle = one('#nav-toggle');
    const label = one('.nav-toggle__text');
    if (!header || !toggle || !label) return;

    const isOpen = () => toggle.getAttribute('aria-expanded') === 'true';
    const nav = one('#site-nav');
    if (!nav) return;

    /* Private per-open cache of the focusable set inside the header bar */
    const focusables = (() => {
      let cache = [];
      return {
        build: () => {
          cache = all('a[href], button:not([disabled])', header);
          return cache;
        },
        get: () => cache
      };
    })();

    const setState = (next) => {
      toggle.setAttribute('aria-expanded', String(next));
      header.classList.toggle('is-nav-open', next);
      document.body.classList.toggle('is-nav-locked', next);
      label.textContent = next ? label.dataset.labelClose : label.dataset.labelOpen;
    };

    const open = () => {
      if (desktopNav.matches || isOpen()) return;
      setState(true);
      focusables.build();
      one('.site-nav__link', nav).focus();
    };

    const close = (restoreFocus) => {
      if (!isOpen()) return;
      setState(false);
      if (restoreFocus) toggle.focus();
    };

    toggle.addEventListener('click', () => (isOpen() ? close(true) : open()));

    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
        return;
      }

      if (event.key !== 'Tab') return;

      const items = focusables.get();
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    });

    /* Delegated: any link inside the overlay closes it after navigating */
    nav.addEventListener('click', (event) => {
      if (event.target.closest('a[href^="#"]')) close(true);
    });

    desktopNav.addEventListener('change', (event) => {
      if (event.matches) close(false);
    });
  };

  /* ======================================================================
     3 · ACTIVE NAVIGATION — IntersectionObserver band across the viewport
     ====================================================================== */

  const initActiveNav = () => {
    const links = all('.site-nav__link');
    const sections = links
      .map((link) => document.getElementById(link.getAttribute('href').slice(1)))
      .filter(Boolean);
    if (!sections.length) return;

    const lit = new Set();

    const paint = (id) => {
      links.forEach((link) => {
        if (link.getAttribute('href') === `#${id}`) {
          link.setAttribute('aria-current', 'location');
        } else {
          link.removeAttribute('aria-current');
        }
      });
    };

    const paintTopmostVisible = () => {
      const active = Array.from(lit)
        .map((id) => document.getElementById(id))
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0];
      if (active) paint(active.id);
    };

    if (canObserve) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) lit.add(entry.target.id);
          else lit.delete(entry.target.id);
        });
        paintTopmostVisible();
      }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });

      sections.forEach((section) => observer.observe(section));
    }

    /* The last section can never reach the band on a short page — clamp it */
    const clampToContact = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
      if (atBottom) paint(sections[sections.length - 1].id);
    };

    window.addEventListener('scroll', clampToContact, { passive: true });
    window.addEventListener('resize', clampToContact);
    clampToContact();
  };

  /* ======================================================================
     4 · SCROLL REVEALS — data-reveal elements fade up once
     ====================================================================== */

  const initReveal = () => {
    const items = all('[data-reveal]');
    if (!items.length) return;

    if (!canObserve) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver((entries, self) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        self.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.1 });

    items.forEach((item) => observer.observe(item));
  };

  /* ======================================================================
     5 · SKILL BARS — fill to their level when the section arrives
     ====================================================================== */

  const initSkillBars = () => {
    const section = one('#skills');
    if (!section) return;

    if (!canObserve) {
      section.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver((entries, self) => {
      if (!entries[0].isIntersecting) return;
      section.classList.add('is-visible');
      self.disconnect();
    }, { threshold: 0.2 });

    observer.observe(section);
  };

  /* ======================================================================
     6 · HERO OUTLINE WORD — the stroke follows the cursor
     ====================================================================== */

  const initHeroOutline = () => {
    const title = one('.hero__title');
    if (!title) return;

    const words = all('.hero__word', title);
    const fallback = words.find((word) => word.classList.contains('is-outlined')) || words[0];

    const outline = (word) => {
      words.forEach((item) => item.classList.toggle('is-outlined', item === word));
    };

    title.addEventListener('pointerover', (event) => {
      const word = event.target.closest('.hero__word');
      if (word) outline(word);
    });

    title.addEventListener('pointerleave', () => outline(fallback));
  };

  /* ======================================================================
     7 · CONTACT FORM — client-side validation + simulated async send
     ====================================================================== */

  const initContactForm = () => {
    const form = one('#contact-form');
    const status = one('#cf-status');
    const submit = one('#cf-submit');
    if (!form || !status || !submit) return;

    const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    const fields = [
      {
        input: one('#cf-name'),
        error: one('#cf-name-error'),
        hint: 'Enter a name of at least 2 characters.',
        test: (value) => value.trim().length >= 2
      },
      {
        input: one('#cf-email'),
        error: one('#cf-email-error'),
        hint: 'Enter a valid email address.',
        test: (value) => EMAIL.test(value.trim())
      },
      {
        input: one('#cf-message'),
        error: one('#cf-message-error'),
        hint: 'Write at least 20 characters so there is something to read.',
        test: (value) => value.trim().length >= 20
      }
    ];

    const validate = (field) => {
      const valid = field.test(field.input.value);
      field.input.setAttribute('aria-invalid', String(!valid));
      field.error.textContent = valid ? '' : field.hint;
      return valid;
    };

    /* Delegated: one listener each for typing and for leaving a field */
    form.addEventListener('input', (event) => {
      const field = fields.find((item) => item.input === event.target);
      if (field && field.input.getAttribute('aria-invalid') === 'true') validate(field);
    });

    form.addEventListener('focusout', (event) => {
      const field = fields.find((item) => item.input === event.target);
      if (field && field.input.value.trim()) validate(field);
    });

    form.addEventListener('submit', async (event) => {
      event.preventDefault();

      const results = fields.map(validate);
      if (results.includes(false)) {
        status.dataset.state = 'error';
        status.textContent = 'Not sent — check the highlighted fields.';
        fields[results.indexOf(false)].input.focus();
        return;
      }

      submit.disabled = true;
      submit.textContent = 'Sending…';
      status.dataset.state = 'sending';
      status.textContent = 'Sending…';

      await new Promise((resolve) => setTimeout(resolve, 1400));

      submit.disabled = false;
      submit.textContent = 'Send message';
      status.dataset.state = 'success';
      status.textContent = 'Validated and queued — there is no server behind this form.';

      form.reset();
      fields.forEach((field) => field.input.removeAttribute('aria-invalid'));
    });
  };

  /* ======================================================================
     8 · BACK TO TOP + FOOTER YEAR
     ====================================================================== */

  const initFooter = () => {
    const year = one('#year');
    if (year) year.textContent = String(new Date().getFullYear());

    document.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-scroll-top]');
      if (!trigger) return;
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      const home = one('.wordmark');
      if (home) home.focus({ preventScroll: true });
    });
  };

  /* ======================================================================
     BOOT
     ====================================================================== */

  initClock();
  initMenu();
  initActiveNav();
  initReveal();
  initSkillBars();
  initHeroOutline();
  initContactForm();
  initFooter();
})();