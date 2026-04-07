document.addEventListener("DOMContentLoaded", () => {
  const siteHeader = document.getElementById("siteHeader");
  const navToggle = document.getElementById("navToggle");
  const navMenu = document.getElementById("navMenu");
  const navLinks = document.querySelectorAll(".nav-menu a");
  const revealItems = document.querySelectorAll(".reveal");
  const contactForm = document.getElementById("contactForm");
  const formMessage = document.getElementById("formMessage");
  const copyrightText = document.getElementById("copyrightText");

  const updateHeader = () => {
    if (!siteHeader) return;
    if (window.scrollY > 16) {
      siteHeader.classList.add("scrolled");
    } else {
      siteHeader.classList.remove("scrolled");
    }
  };

  updateHeader();
  window.addEventListener("scroll", updateHeader);

  if (navToggle && navMenu) {
    navToggle.addEventListener("click", () => {
      const isOpen = navMenu.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", String(isOpen));
      document.body.classList.toggle("menu-open", isOpen);
    });

    navLinks.forEach((link) => {
      link.addEventListener("click", () => {
        navMenu.classList.remove("open");
        document.body.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });

    document.addEventListener("click", (event) => {
      const clickedInsideMenu = navMenu.contains(event.target);
      const clickedToggle = navToggle.contains(event.target);

      if (!clickedInsideMenu && !clickedToggle && navMenu.classList.contains("open")) {
        navMenu.classList.remove("open");
        document.body.classList.remove("menu-open");
        navToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  if (revealItems.length) {
    const observer = new IntersectionObserver(
      (entries, obs) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("active");
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  if (contactForm) {
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();

      const name = document.getElementById("name").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const email = document.getElementById("email").value.trim();
      const interest = document.getElementById("interest").value.trim();
      const message = document.getElementById("message").value.trim();

      const phoneRegex = /^[0-9+\-\s]{10,15}$/;
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!name || !phone || !email || !interest) {
        showMessage("Please fill in all required fields.", "#c93636");
        return;
      }

      if (!phoneRegex.test(phone)) {
        showMessage("Please enter a valid phone number.", "#c93636");
        return;
      }

      if (!emailRegex.test(email)) {
        showMessage("Please enter a valid email address.", "#c93636");
        return;
      }

      const whatsappNumber = "919999999999";
      const whatsappText =
        `Hi Hospera, I want to enquire about admission.%0A%0A` +
        `Name: ${encodeURIComponent(name)}%0A` +
        `Phone: ${encodeURIComponent(phone)}%0A` +
        `Email: ${encodeURIComponent(email)}%0A` +
        `Interested In: ${encodeURIComponent(interest)}%0A` +
        `Message: ${encodeURIComponent(message)}`;

      showMessage("Thank you! Redirecting to WhatsApp...", "#16a34a");

      setTimeout(() => {
        window.open(`https://wa.me/${whatsappNumber}?text=${whatsappText}`, "_blank");
        contactForm.reset();
      }, 700);
    });
  }

  function showMessage(message, color) {
    if (!formMessage) return;
    formMessage.textContent = message;
    formMessage.style.color = color;
  }

  if (copyrightText) {
    copyrightText.textContent = `© ${new Date().getFullYear()} Hospera. All rights reserved.`;
  }
});
