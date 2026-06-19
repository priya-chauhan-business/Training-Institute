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
  appsScriptUrl: "https://script.google.com/macros/s/AKfycbz9u5HoQJLcl8g6T6vUCVBOecQZ4JeK2wuwl6fFqMpZ_4dfyJ92iObesa3Lg-H5vM0/exec",
  adminEmail: "admin@hosperainstitute.com",
  whatsappNumber: "447838798186",
  whatsappDisplayNumber: "+44 7838 798186"
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

function formToPayload(form) {
  const payload = new URLSearchParams();
  const formData = new FormData(form);

  formData.forEach((value, key) => {
    payload.append(key, value);
  });

  payload.append("form_type", form.dataset.formType || "Website enquiry");
  payload.append("admin_email", hosperaTrackingConfig.adminEmail);
  payload.append("recipient_email", hosperaTrackingConfig.adminEmail);
  payload.append("notify_email", hosperaTrackingConfig.adminEmail);
  payload.append("email_subject", `New Hospera ${form.dataset.formType || "Website enquiry"}`);
  payload.append("send_email", "true");
  payload.append("submitted_at", new Date().toISOString());
  payload.append("source_url", window.location.href);
  payload.append("page_title", document.title);

  return payload;
}

async function submitLeadForm(form) {
  const submitButton = getFormSubmitButton(form);
  const formType = form.dataset.formType || "Website enquiry";

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.dataset.originalText = submitButton.dataset.originalText || submitButton.textContent;
    submitButton.textContent = "Sending...";
  }

  setFormStatus(form, "Sending your enquiry...", "success");

  try {
    await fetch(hosperaTrackingConfig.appsScriptUrl, {
      method: "POST",
      mode: "no-cors",
      body: formToPayload(form)
    });

    setFormStatus(form, "Thank you. Your details have been submitted successfully.", "success");
    trackGaEvent("form_submit", {
      event_category: "lead",
      form_name: formType
    });
    trackLead("form_submission", formType);
    trackMetaEvent("Contact", {
      content_category: "form_submission",
      content_name: formType
    });
    form.reset();
  } catch (error) {
    setFormStatus(form, "Sorry, something went wrong. Please try again or contact us directly.", "error");
    trackGaEvent("form_submit_error", {
      event_category: "lead",
      form_name: formType
    });
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = submitButton.dataset.originalText || "Submit";
    }
  }
}

function bindLeadForms() {
  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitLeadForm(form);
    });
  });
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

function buildWhatsAppHref(message) {
  const cleanMessage = message.trim();
  const defaultMessage = "Hello Hospera Institute, I would like to know more about your hospitality programs.";
  const finalMessage = cleanMessage || defaultMessage;
  return `https://wa.me/${hosperaTrackingConfig.whatsappNumber}?text=${encodeURIComponent(finalMessage)}`;
}

function createFloatingContactWidget() {
  if (document.querySelector("[data-floating-contact-widget]")) return;

  const widget = document.createElement("div");
  widget.className = "floating-contact-widget";
  widget.setAttribute("data-floating-contact-widget", "");

  widget.innerHTML = `
    <div class="floating-contact-panel" data-chat-panel hidden>
      <div class="floating-contact-panel-header">
        <div>
          <p class="floating-contact-eyebrow">WhatsApp Support</p>
          <h3 class="floating-contact-title">Chat with Hospera</h3>
        </div>
        <button class="floating-contact-close" type="button" aria-label="Close chat panel" data-chat-close>&times;</button>
      </div>
      <p class="floating-contact-copy">
        Type your message here and we will open WhatsApp with it ready to send to our team on ${hosperaTrackingConfig.whatsappDisplayNumber}.
      </p>
      <textarea
        class="floating-contact-textarea"
        rows="4"
        placeholder="Hi, I would like to know more about courses, admissions, or batch availability."
        aria-label="Type your message for Hospera on WhatsApp"
        data-chat-message
      ></textarea>
      <div class="floating-contact-panel-footer">
        <span class="floating-contact-note">Replies continue in WhatsApp</span>
        <button class="floating-contact-send" type="button" data-chat-send>Send on WhatsApp</button>
      </div>
    </div>
    <div class="floating-contact-actions">
      <a class="floating-contact-action enquiry" href="contact.html#submit-enquiry" data-widget-enquiry>Submit Enquiry</a>
      <button class="floating-contact-action whatsapp" type="button" aria-expanded="false" data-chat-toggle>Chat Now</button>
    </div>
  `;

  document.body.appendChild(widget);

  const chatPanel = widget.querySelector("[data-chat-panel]");
  const messageField = widget.querySelector("[data-chat-message]");
  const chatToggle = widget.querySelector("[data-chat-toggle]");
  const chatClose = widget.querySelector("[data-chat-close]");
  const chatSend = widget.querySelector("[data-chat-send]");
  const enquiryLink = widget.querySelector("[data-widget-enquiry]");
  const enquiryTarget = document.getElementById("submit-enquiry");

  const openChatPanel = () => {
    chatPanel.hidden = false;
    chatToggle.setAttribute("aria-expanded", "true");
    widget.classList.add("chat-open");
    trackGaEvent("floating_chat_open", {
      event_category: "lead",
      event_label: "Floating chat"
    });
    window.setTimeout(() => {
      messageField.focus();
    }, 60);
  };

  const closeChatPanel = () => {
    chatPanel.hidden = true;
    chatToggle.setAttribute("aria-expanded", "false");
    widget.classList.remove("chat-open");
  };

  chatToggle.addEventListener("click", () => {
    if (chatPanel.hidden) {
      openChatPanel();
    } else {
      closeChatPanel();
    }
  });

  chatClose.addEventListener("click", closeChatPanel);

  chatSend.addEventListener("click", () => {
    const whatsappHref = buildWhatsAppHref(messageField.value);
    trackGaEvent("floating_whatsapp_click", {
      event_category: "lead",
      event_label: "Floating chat send"
    });
    trackContact("whatsapp", "Floating chat send");
    window.open(whatsappHref, "_blank", "noopener");
  });

  enquiryLink.addEventListener("click", (event) => {
    trackGaEvent("floating_enquiry_click", {
      event_category: "lead",
      event_label: "Submit enquiry"
    });
    trackLead("floating_enquiry", "Submit enquiry");

    if (!isContactPage() || !enquiryTarget) return;

    event.preventDefault();
    closeChatPanel();
    enquiryTarget.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof window.history.replaceState === "function") {
      window.history.replaceState(null, "", "#submit-enquiry");
    }
  });

  document.addEventListener("click", (event) => {
    if (chatPanel.hidden) return;
    if (widget.contains(event.target)) return;
    closeChatPanel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !chatPanel.hidden) {
      closeChatPanel();
    }
  });
}

function startHosperaEnhancements() {
  try {
    createFloatingContactWidget();
    bindLeadForms();
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
}

startHosperaEnhancements();
