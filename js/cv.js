/* ===================================================================
   /cv/ -- the scroll behaviour
   -------------------------------------------------------------------
   Four small jobs, all of them progressive: the page is complete and
   readable with this file blocked. main.js still handles the nav.

     1. reveal    sections arrive as you reach them
     2. spy       the rail marks the section you are in
     3. count     the four figures on the cover count up once
     4. progress  a hairline of coral across the top

   Everything checks prefers-reduced-motion first and, where it can,
   simply skips to the finished state rather than animating to it.
   =================================================================== */

(() => {
  "use strict";

  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const root = document.documentElement;

  /* The stylesheet only hides revealables under .cv-js, so this class is
     the contract: set it, and you have promised to un-hide them below. */
  root.classList.add("cv-js");

  /* ---- 1. Reveal ---------------------------------------------------- */

  const revealables = [...document.querySelectorAll("[data-reveal]")];

  const show = (el) => el.classList.add("is-in");

  if (!("IntersectionObserver" in window) || reduced) {
    revealables.forEach(show);
  } else {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          show(entry.target);
          revealObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    revealables.forEach((el) => {
      /* Anything already on screen at load is shown outright -- a fade
         you never see the start of just reads as a flicker. */
      if (el.getBoundingClientRect().top < window.innerHeight * 0.9) show(el);
      else revealObserver.observe(el);
    });
  }

  /* Timeline dots fill in as their post arrives, and stay filled. */
  const posts = [...document.querySelectorAll(".tl-item")];

  if ("IntersectionObserver" in window && posts.length) {
    const dotObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-here");
          dotObserver.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -20% 0px", threshold: 0.12 }
    );
    posts.forEach((post) => dotObserver.observe(post));
  } else {
    posts.forEach((post) => post.classList.add("is-here"));
  }

  /* ---- 2. Rail scroll-spy -------------------------------------------- */

  const links = [...document.querySelectorAll(".cv-nav a")];
  const sections = links
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);

  if (sections.length) {
    let current = null;

    const mark = (section) => {
      if (section === current) return;
      current = section;
      links.forEach((link) => {
        const isHere = link.getAttribute("href") === `#${section.id}`;
        link.setAttribute("aria-current", isHere ? "true" : "false");
      });
    };

    const spy = () => {
      /* The section whose top has most recently passed the reading line,
         a third of the way down the viewport. Last one wins, so the
         bottom of the page lands on the last section rather than sticking
         on whichever one happens to be tallest. */
      const line = window.innerHeight * 0.34;
      let found = sections[0];
      sections.forEach((section) => {
        if (section.getBoundingClientRect().top <= line) found = section;
      });
      mark(found);
    };

    spy();
    addEventListener("scroll", spy, { passive: true });
    addEventListener("resize", spy, { passive: true });
  }

  /* ---- 3. Count up ---------------------------------------------------- */

  const figures = [...document.querySelectorAll("[data-count]")];

  const settle = (el) => {
    el.textContent = el.dataset.count;
  };

  const countUp = (el) => {
    const target = Number(el.dataset.count);
    if (!Number.isFinite(target)) return settle(el);

    const duration = 1100;
    const start = performance.now();

    const step = (now) => {
      const t = Math.min((now - start) / duration, 1);
      /* easeOutCubic: fast off the mark, then lands rather than stops. */
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);

    /* rAF stops in a background tab, which can leave a figure frozen part
       way up. Belt and braces: settle it on the clock regardless. */
    setTimeout(() => settle(el), duration + 120);
  };

  if (reduced || !("IntersectionObserver" in window)) {
    figures.forEach(settle);
  } else {
    figures.forEach((el) => (el.textContent = "0"));
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          countUp(entry.target);
          countObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.6 }
    );
    figures.forEach((el) => countObserver.observe(el));
  }

  /* ---- 4. Reading progress -------------------------------------------- */

  const bar = document.querySelector(".reading-progress b");

  if (bar) {
    let queued = false;

    const draw = () => {
      queued = false;
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? window.scrollY / scrollable : 0;
      bar.style.width = `${Math.min(Math.max(ratio, 0), 1) * 100}%`;
    };

    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(draw);
    };

    draw();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll, { passive: true });
  }
})();
