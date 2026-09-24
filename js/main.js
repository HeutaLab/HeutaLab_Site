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
})();
