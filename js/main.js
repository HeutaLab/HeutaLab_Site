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

  document.querySelectorAll('.socials a[href="#"]').forEach((link) => {
    link.addEventListener("click", (event) => event.preventDefault());
  });
})();
