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

if ("IntersectionObserver" in window) {
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
} else {
  document.querySelectorAll("[data-reveal]").forEach((node) => node.classList.add("visible"));
}

const yearTarget = document.getElementById("currentYear");
if (yearTarget) {
  yearTarget.textContent = new Date().getFullYear();
}

const backgroundVideos = document.querySelectorAll(".hero-video, .cta-video, .enroll-video, video[autoplay]");
const reducedMotionQuery =
  typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : { matches: false };

function syncBackgroundVideos() {
  backgroundVideos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");

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
  window.addEventListener("load", syncBackgroundVideos, { once: true });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) syncBackgroundVideos();
  });

  ["touchstart", "pointerdown", "scroll"].forEach((eventName) => {
    window.addEventListener(eventName, syncBackgroundVideos, { once: true, passive: true });
  });

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", syncBackgroundVideos);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(syncBackgroundVideos);
  }
}

const hosperaTrackingConfig = {
  gaMeasurementId: "G-JBYTLDRZH2",
  metaPixelId: "META_PIXEL_ID_PLACEHOLDER",
  adminEmail: "admin@hosperainstitute.com",
  visitorAutoReply: "Thanks for your interest. Our team will get back to you shortly.",
  trackerSyncUrl: "https://script.google.com/macros/s/AKfycbwAiCcHoAY7ugMRjkq1Q4EZmmvQ4becMdSKJJGsWk9Sd1ETv4-RygcKamBqzLut-rwHPw/exec"
};

function loadHosperaAnalytics() {
  const { gaMeasurementId, metaPixelId } = hosperaTrackingConfig;

  if (gaMeasurementId) {
    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };

    const gaScript = document.createElement("script");
    gaScript.async = true;
    gaScript.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaMeasurementId)}`;
    const scriptParent = document.head || document.body;
    if (scriptParent) {
      scriptParent.appendChild(gaScript);
    }

    window.gtag("js", new Date());
    window.gtag("config", gaMeasurementId, { send_page_view: false });
    window.gtag("event", "page_view", {
      page_title: document.title,
      page_location: window.location.href,
      page_path: window.location.pathname
    });
  }

  if (metaPixelId && metaPixelId !== "META_PIXEL_ID_PLACEHOLDER") {
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = true;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    window.fbq("init", metaPixelId);
    window.fbq("track", "PageView");
  }
}

function trackGaEvent(eventName, params = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", eventName, {
    ...params,
    page_title: document.title,
    page_location: window.location.href
  });
}

function trackMetaEvent(eventName, params = {}) {
  if (typeof window.fbq !== "function") return;
  window.fbq("track", eventName, {
    ...params,
    content_name: params.content_name || document.title
  });
}

function trackLead(method, label) {
  trackGaEvent("generate_lead", {
    event_category: "lead",
    method,
    event_label: label || method
  });
  trackMetaEvent("Lead", {
    content_category: "lead",
    content_name: label || method
  });
}

function trackContact(method, label) {
  trackGaEvent("contact_click", {
    event_category: "lead",
    method,
    event_label: label || method
  });
  trackLead(method, label);
  trackMetaEvent("Contact", {
    content_category: "contact",
    content_name: label || method
  });
}

function getFormSubmitButton(form) {
  if (form.id) {
    return document.querySelector(`[form="${form.id}"][type="submit"]`);
  }
  return form.querySelector('[type="submit"]');
}

function setFormStatus(form, message, status) {
  const formShell = form.closest(".form-shell");
  const statusNode = formShell ? formShell.querySelector(".form-status") : null;
  if (!statusNode) return;
  statusNode.textContent = message;
  statusNode.className = `form-status ${status}`;
}

function hasValidTrackerSyncUrl() {
  const { trackerSyncUrl } = hosperaTrackingConfig;
  return Boolean(trackerSyncUrl && !trackerSyncUrl.includes("YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL"));
}

function generateTrackerId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

function normalizeFieldValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function getPageLabel() {
  const currentPage = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  const pageMap = {
    "contact.html": "Contact page",
    "careers.html": "Careers page",
    "apply.html": "Apply page",
    "index.html": "Home page"
  };
  return pageMap[currentPage] || document.title;
}

function buildLeadTrackerPayload(form) {
  const formData = new FormData(form);
  const trackerTarget = form.dataset.trackerTarget || "enquiry";
  const formType = form.dataset.formType || "Website enquiry";
  const interest =
    normalizeFieldValue(formData.get("interested_program")) ||
    normalizeFieldValue(formData.get("enquiry_type")) ||
    formType;
  const message = normalizeFieldValue(formData.get("message")) || normalizeFieldValue(formData.get("career_goal"));
  const city = normalizeFieldValue(formData.get("city"));

  return {
    event_type: "lead_submission",
    tracker_target: trackerTarget,
    external_id: generateTrackerId(trackerTarget === "apply_now" ? "APP" : "ENQ"),
    submitted_at: new Date().toISOString(),
    full_name: normalizeFieldValue(formData.get("name")),
    phone: normalizeFieldValue(formData.get("phone")),
    email: normalizeFieldValue(formData.get("email")),
    city,
    message,
    interest,
    source_channel: "Website Form",
    source_page: normalizeFieldValue(formData.get("source_page")) || getPageLabel(),
    source_url: window.location.href,
    form_type: formType,
    highest_qualification: normalizeFieldValue(formData.get("highest_qualification")),
    interested_program: normalizeFieldValue(formData.get("interested_program")),
    career_goal: normalizeFieldValue(formData.get("career_goal"))
  };
}

function sendTrackerPayload(payload) {
  if (!hasValidTrackerSyncUrl() || !payload) return Promise.resolve(false);

  const endpoint = hosperaTrackingConfig.trackerSyncUrl;
  const body = JSON.stringify(payload);

  try {
    if (navigator && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "text/plain;charset=UTF-8" });
      const sent = navigator.sendBeacon(endpoint, blob);
      return Promise.resolve(sent);
    }
  } catch (error) {
    console.warn("Tracker sync beacon failed.", error);
  }

  try {
    return fetch(endpoint, {
      method: "POST",
      mode: "no-cors",
      keepalive: true,
      headers: {
        "Content-Type": "text/plain;charset=UTF-8"
      },
      body
    })
      .then(() => true)
      .catch(() => false);
  } catch (error) {
    console.warn("Tracker sync request could not be sent.", error);
    return Promise.resolve(false);
  }
}

function bindLeadForms() {
  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      if (form.dataset.forwarding === "true") {
        delete form.dataset.forwarding;
        return;
      }

      event.preventDefault();

      const formType = form.dataset.formType || "Website enquiry";
      const submitButton = getFormSubmitButton(form);

      if (submitButton) {
        submitButton.disabled = true;
        submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
        submitButton.textContent = "Sending...";
      }

      setFormStatus(form, "Sending your enquiry...", "success");
      await Promise.race([
        sendTrackerPayload(buildLeadTrackerPayload(form)),
        new Promise((resolve) => window.setTimeout(resolve, 800))
      ]);
      trackGaEvent("form_submit", {
        event_category: "lead",
        form_name: formType
      });
      trackLead("form_submission", formType);
      trackMetaEvent("Contact", {
        content_category: "form_submission",
        content_name: formType
      });

      form.dataset.forwarding = "true";
      form.submit();
    });
  });
}

window.HosperaTrackerSync = {
  send: sendTrackerPayload,
  hasValidConfig: hasValidTrackerSyncUrl
};

function showSubmittedMessage() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("submitted") !== "1") return;

  const form = document.querySelector("[data-lead-form]");
  if (!form) return;

  setFormStatus(form, hosperaTrackingConfig.visitorAutoReply, "success");

  if (typeof window.history.replaceState === "function") {
    const cleanUrl = `${window.location.pathname}${window.location.hash || ""}`;
    window.history.replaceState({}, document.title, cleanUrl);
  }
}

function bindLeadClickTracking() {
  document.addEventListener("click", (event) => {
    const link = event.target && typeof event.target.closest === "function" ? event.target.closest("a[href]") : null;
    if (!link) return;

    const href = (link.getAttribute("href") || "").toLowerCase();
    const label = link.getAttribute("aria-label") || link.textContent.trim() || href;
    const socialPlatform = link.dataset.socialPlatform;

    if (socialPlatform) {
      trackGaEvent("social_click", {
        event_category: "lead",
        social_platform: socialPlatform,
        event_label: label
      });
      if (socialPlatform !== "whatsapp") {
        trackLead(`social_${socialPlatform}`, label);
      }
    }

    if (href.startsWith("tel:")) {
      trackGaEvent("phone_click", {
        event_category: "lead",
        event_label: label
      });
      trackContact("phone", label);
    } else if (href.startsWith("mailto:")) {
      trackGaEvent("email_click", {
        event_category: "lead",
        event_label: label
      });
      trackContact("email", label);
    } else if (href.includes("wa.me") || href.includes("whatsapp")) {
      trackGaEvent("whatsapp_click", {
        event_category: "lead",
        event_label: label
      });
      trackContact("whatsapp", label);
    }
  });
}

function isContactPage() {
  const currentPage = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
  return currentPage === "contact.html";
}

function createFloatingContactWidget() {
  if (document.querySelector("[data-floating-contact-widget]")) return;

  const widget = document.createElement("div");
  widget.className = "floating-contact-widget";
  widget.setAttribute("data-floating-contact-widget", "");

  widget.innerHTML = `
    <a class="floating-contact-action enquiry" href="contact.html#submit-enquiry" data-widget-enquiry>Submit Enquiry</a>
  `;

  document.body.appendChild(widget);

  const enquiryLink = widget.querySelector("[data-widget-enquiry]");
  const enquiryTarget = document.getElementById("submit-enquiry");

  enquiryLink.addEventListener("click", (event) => {
    trackGaEvent("floating_enquiry_click", {
      event_category: "lead",
      event_label: "Submit enquiry"
    });
    trackLead("floating_enquiry", "Submit enquiry");

    if (!isContactPage() || !enquiryTarget) return;

    event.preventDefault();
    enquiryTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof window.history.replaceState === "function") {
      window.history.replaceState(null, "", "#submit-enquiry");
    }
  });
}

function loadHosperaScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "true") {
        resolve();
        return;
      }

      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error(`Could not load ${src}`)), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener(
      "load",
      () => {
        script.dataset.loaded = "true";
        resolve();
      },
      { once: true }
    );
    script.addEventListener("error", () => reject(new Error(`Could not load ${src}`)), { once: true });
    (document.head || document.body).appendChild(script);
  });
}

function hasValidLiveChatConfig(config) {
  return Boolean(
    config &&
      config.enabled &&
      config.supabaseUrl &&
      config.supabaseAnonKey &&
      !config.supabaseUrl.includes("YOUR_PROJECT_ID") &&
      !config.supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")
  );
}

async function startHosperaLiveChat() {
  try {
    await loadHosperaScript("chat-config.js");
    if (!hasValidLiveChatConfig(window.HOSPERA_CHAT_CONFIG)) return;

    if (typeof window.supabase === "undefined") {
      await loadHosperaScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    }

    await loadHosperaScript("chat-client.js");

    if (window.HosperaChatClient && typeof window.HosperaChatClient.boot === "function") {
      await window.HosperaChatClient.boot(window.HOSPERA_CHAT_CONFIG);
    }
  } catch (error) {
    console.error("Hospera live chat could not start.", error);
  }
}

function startHosperaEnhancements() {
  try {
    createFloatingContactWidget();
    bindLeadForms();
    showSubmittedMessage();
    bindLeadClickTracking();
  } catch (error) {
    console.error("Hospera form tracking could not start.", error);
  }

  const startAnalytics = () => {
    try {
      loadHosperaAnalytics();
    } catch (error) {
      console.error("Hospera analytics could not start.", error);
    }
  };

  if (document.readyState === "complete") {
    window.setTimeout(startAnalytics, 0);
  } else {
    window.addEventListener("load", () => window.setTimeout(startAnalytics, 0), { once: true });
  }

  window.setTimeout(() => {
    startHosperaLiveChat();
  }, 0);
}

startHosperaEnhancements();
