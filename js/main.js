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

  const testimonials = [
    {
      quote:
        "HeutaLab has become an essential part of how we teach, plan and support our learners.",
      name: "Rebecca T.",
      role: "Year 6 Teacher",
      school: "International School",
      initials: "RT",
    },
    {
      quote:
        "The resources are practical, beautifully clear and easy to put straight into a lesson.",
      name: "Daniel M.",
      role: "Digital Learning Lead",
      school: "Primary Academy",
      initials: "DM",
    },
    {
      quote:
        "It gives parents a calm, useful way to understand the digital world their children are growing up in.",
      name: "Sofia L.",
      role: "Parent Workshop Attendee",
      school: "Community Programme",
      initials: "SL",
    },
  ];

  const quote = document.querySelector("#testimonial-quote");
  const name = document.querySelector("#testimonial-name");
  const role = document.querySelector("#testimonial-role");
  const avatar = document.querySelector("#testimonial-avatar");
  const slideDots = [...document.querySelectorAll("[data-slide]")];
  let activeTestimonial = 0;

  const showTestimonial = (index) => {
    activeTestimonial = (index + testimonials.length) % testimonials.length;
    const testimonial = testimonials[activeTestimonial];

    if (quote) quote.textContent = testimonial.quote;
    if (name) name.textContent = testimonial.name;
    if (role) {
      role.replaceChildren(
        document.createTextNode(testimonial.role),
        document.createElement("br"),
        document.createTextNode(testimonial.school),
      );
    }
    if (avatar) avatar.textContent = testimonial.initials;

    slideDots.forEach((dot, dotIndex) => {
      dot.classList.toggle("selected", dotIndex === activeTestimonial);
    });
  };

  document.querySelector('[data-carousel="prev"]')?.addEventListener("click", () => {
    showTestimonial(activeTestimonial - 1);
  });

  document.querySelector('[data-carousel="next"]')?.addEventListener("click", () => {
    showTestimonial(activeTestimonial + 1);
  });

  slideDots.forEach((dot) => {
    dot.addEventListener("click", () => {
      showTestimonial(Number(dot.dataset.slide));
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
