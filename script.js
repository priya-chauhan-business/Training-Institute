const header = document.querySelector(".site-header");
const navToggle = document.getElementById("navToggle");
const navMenu = document.getElementById("navMenu");

function syncHeader() {
  if (!header) return;
  header.classList.toggle("scrolled", window.scrollY > 18);
}

syncHeader();
window.addEventListener("scroll", syncHeader, { passive: true });

if (navToggle && navMenu && header) {
  navToggle.addEventListener("click", () => {
    const isOpen = navMenu.classList.toggle("open");
    header.classList.toggle("menu-open", isOpen);
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });

  navMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      navMenu.classList.remove("open");
      header.classList.remove("menu-open");
      navToggle.setAttribute("aria-expanded", "false");
    });
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll("[data-reveal]").forEach((node) => revealObserver.observe(node));

const yearTarget = document.getElementById("currentYear");
if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

const backgroundVideos = document.querySelectorAll(".hero-video");
const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

function syncBackgroundVideos() {
  backgroundVideos.forEach((video) => {
    if (reducedMotionQuery.matches) {
      video.pause();
      return;
    }

    const playAttempt = video.play();
    if (playAttempt && typeof playAttempt.catch === "function") {
      playAttempt.catch(() => {});
    }
  });
}

if (backgroundVideos.length) {
  syncBackgroundVideos();

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", syncBackgroundVideos);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(syncBackgroundVideos);
  }
}
