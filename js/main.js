(() => {
  "use strict";

  const desktopMenus = [...document.querySelectorAll(".desktop-nav details")];
  const mobileMenu = document.querySelector(".mobile-menu");

  desktopMenus.forEach((menu) => {
    menu.addEventListener("toggle", () => {
      if (!menu.open) return;

      desktopMenus.forEach((otherMenu) => {
        if (otherMenu !== menu) otherMenu.open = false;
      });
    });
  });

  document.addEventListener("click", (event) => {
    desktopMenus.forEach((menu) => {
      if (!menu.contains(event.target)) menu.open = false;
    });
  });

  mobileMenu?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.open = false;
    });
  });

  const newsletterForm = document.querySelector("#newsletter-form");
  const newsletterStatus = document.querySelector("#newsletter-status");

  newsletterForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    const formData = new FormData(newsletterForm);
    const email = String(formData.get("email") || "").trim();

    if (!email) return;

    if (newsletterStatus) {
      newsletterStatus.textContent = "Thanks — you’re on the list.";
    }
    newsletterForm.reset();
  });

  /* ---- Contact links ---------------------------------------------------
     The address is assembled here rather than written into any page, so no
     page ever ships it in its HTML for a harvester to regex out. The two
     halves are encoded separately -- neither decodes to something an
     address pattern matches on its own.

     To publish a different address (an alias, say), change these two lines
     and nothing else: btoa("hello") and btoa("heutalab.com") in any browser
     console give you the replacements.

     Links opt in with class="mailme". A .mail-text span inside one means
     show the address as the link text too; without it only the href is
     rewritten and the label is left alone. With JavaScript off, the links
     fall back to the href the markup carries -- which is why none of them
     is a mailto: in the source. */

  const MAIL_USER = "Z2xlbm4ubWFsY29sbQ==";
  const MAIL_HOST = "dHV0YW5vdGEuY29t";

  const address = atob(MAIL_USER) + String.fromCharCode(64) + atob(MAIL_HOST);

  document.querySelectorAll("a.mailme").forEach((link) => {
    link.href = "mailto:" + address;
    const slot = link.querySelector(".mail-text");
    if (slot) slot.textContent = address;
  });


  document.querySelectorAll('.socials a[href="#"]').forEach((link) => {
    link.addEventListener("click", (event) => event.preventDefault());
  });

  /* ---- The one moving picture ------------------------------------------
     A silent screen recording standing in for a screenshot. It repeats, so
     it has to be stoppable, and it only starts once it is actually on
     screen -- the file is two megabytes and most visitors never scroll to
     it. Anyone who has asked their machine for less motion keeps the poster
     frame until they press Play, and with JavaScript off, so does everyone:
     the markup carries no autoplay. */

  document.querySelectorAll("[data-motion]").forEach((holder) => {
    const video = holder.querySelector("video");
    const toggle = holder.querySelector("[data-motion-toggle]");
    if (!video || !toggle) return;

    const relabel = () => {
      const playing = !video.paused;
      toggle.textContent = playing ? "Pause" : "Play";
      toggle.setAttribute("aria-label", playing ? "Pause the loop" : "Play the loop");
    };

    toggle.addEventListener("click", () => {
      if (video.paused) video.play().catch(relabel);
      else video.pause();
    });
    video.addEventListener("play", relabel);
    video.addEventListener("pause", relabel);
    relabel();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const watcher = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        watcher.disconnect();
        video.play().catch(relabel);
      });
    }, { threshold: 0.4 });
    watcher.observe(video);
  });

  /* ---- Timed pictures --------------------------------------------------
     A picture that changes on a clock, with a countdown on it. Which one is
     showing is worked out from the time rather than stored anywhere, so
     every visitor sees the same picture and the same time left. The
     pictures are numbered files in one folder (01.jpg, 02.jpg ...); the
     markup says how many there are and how often to move on:

       <div class="timed-pic" data-timed-pic data-folder="/img/daily/"
            data-count="30" data-every="1d" data-start="2026-10-01T00:00Z">
         <img src="/img/daily/01.jpg" alt="..." width="1200" height="800" />
       </div>

     data-every is a number and s, m, h or d: "30s", "10m", "1h", "1d".
     data-start is when picture 01 first shows. Every change lands a whole
     number of periods after it, so it also sets the time of day a daily
     picture turns over: "2026-10-01T00:00+01:00" is midnight UK summer
     time (and 11pm in winter -- a fixed offset does not follow the clocks).
     data-ext defaults to jpg. After the last picture it starts again at 01.

     With JavaScript off, the img's own src shows and there is no timer.
     Anyone who has asked for less motion gets a countdown that moves once
     a minute instead of every second. */

  const UNIT = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 };
  const pad = (n) => String(n).padStart(2, "0");
  const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const timeLeft = (secs) => {
    if (calm) secs = Math.ceil(secs / 60) * 60;
    const d = Math.floor(secs / 86400);
    const h = Math.floor(secs / 3600) % 24;
    const m = Math.floor(secs / 60) % 60;
    if (d) return `${d}d ${h}h`;
    if (calm) return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
    return h ? `${h}:${pad(m)}:${pad(secs % 60)}` : `${m}:${pad(secs % 60)}`;
  };

  document.querySelectorAll("[data-timed-pic]").forEach((holder) => {
    const img = holder.querySelector("img");
    const count = parseInt(holder.dataset.count, 10);
    const every = /^(\d+(?:\.\d+)?)\s*([smhd])$/.exec(holder.dataset.every || "1d");
    const period = every ? Number(every[1]) * UNIT[every[2]] : 0;
    const start = Date.parse(holder.dataset.start || "2026-01-01T00:00Z");
    if (!img || !(count > 0) || !(period > 0) || Number.isNaN(start)) return;

    const folder = holder.dataset.folder || "";
    const ext = holder.dataset.ext || "jpg";
    const digits = Math.max(2, String(count).length);
    const fileFor = (k) =>
      `${folder}${String((((k % count) + count) % count) + 1).padStart(digits, "0")}.${ext}`;

    const timer = document.createElement("span");
    timer.className = "timed-pic-timer";
    timer.setAttribute("role", "timer");
    holder.append(timer);

    const step = calm ? 6e4 : 1e3;
    let shown = null;
    let wait = 0;

    const tick = () => {
      clearTimeout(wait);
      const now = Date.now();
      const k = Math.floor((now - start) / period);
      if (k !== shown) {
        img.src = fileFor(k);
        new Image().src = fileFor(k + 1); // fetched now, so the change is instant
        shown = k;
      }
      const ms = start + (k + 1) * period - now;
      timer.textContent = `Next picture in ${timeLeft(Math.ceil(ms / 1000))}`;
      /* Wake when the shown figure next changes, not on a fixed beat, so
         the seconds never skip or stick. */
      wait = setTimeout(tick, ms % step || step);
    };

    tick();
    /* Background tabs slow timers right down; catch up on return. */
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) tick();
    });
  });
})();
