(function () {
  const STORAGE_KEYS = {
    conversationId: "hospera_live_chat_conversation_id",
    profile: "hospera_live_chat_profile"
  };

  const state = {
    booted: false,
    panelOpen: false,
    supabase: null,
    config: null,
    user: null,
    conversation: null,
    messages: [],
    channel: null,
    nodes: {}
  };

  const AUTO_REPLY_MESSAGE = "Thanks for your interest. Our team will get back to you shortly.";

  function hasValidConfig(config) {
    return Boolean(
      config &&
        config.enabled &&
        config.supabaseUrl &&
        config.supabaseAnonKey &&
        !config.supabaseUrl.includes("YOUR_PROJECT_ID") &&
        !config.supabaseAnonKey.includes("YOUR_SUPABASE_ANON_KEY")
    );
  }

  function ensureStylesheet() {
    if (document.querySelector('link[data-hospera-chat-style="true"]')) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "chat-client.css";
    link.setAttribute("data-hospera-chat-style", "true");
    document.head.appendChild(link);
  }

  function removeFallbackWidget() {
    const fallback = document.querySelector("[data-floating-contact-widget]");
    if (fallback) fallback.remove();
  }

  function createSupabaseClient(config) {
    if (window.__hosperaChatSupabase) return window.__hosperaChatSupabase;
    window.__hosperaChatSupabase = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true
      }
    });
    return window.__hosperaChatSupabase;
  }

  async function ensureVisitorAuth() {
    const { data: sessionData } = await state.supabase.auth.getSession();
    if (!sessionData.session) {
      const { error } = await state.supabase.auth.signInAnonymously();
      if (error) throw error;
    }

    const { data: userData, error } = await state.supabase.auth.getUser();
    if (error) throw error;
    state.user = userData.user;
  }

  function readStoredProfile() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.profile) || "{}");
    } catch (error) {
      return {};
    }
  }

  function storeProfile(profile) {
    window.localStorage.setItem(STORAGE_KEYS.profile, JSON.stringify(profile));
  }

  function readStoredConversationId() {
    return window.localStorage.getItem(STORAGE_KEYS.conversationId);
  }

  function storeConversationId(conversationId) {
    window.localStorage.setItem(STORAGE_KEYS.conversationId, conversationId);
  }

  function clearStoredConversation() {
    window.localStorage.removeItem(STORAGE_KEYS.conversationId);
  }

  function isContactPage() {
    const currentPage = (window.location.pathname.split("/").pop() || "index.html").toLowerCase();
    return currentPage === "contact.html";
  }

  function formatTimestamp(value) {
    if (!value) return "";
    const date = new Date(value);
    return new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      day: "numeric",
      month: "short"
    }).format(date);
  }

  function setStatus(message, tone) {
    const node = state.nodes.status;
    if (!node) return;
    node.textContent = message || "";
    node.style.color = tone === "error" ? "#b33a2f" : "rgba(13, 23, 36, 0.62)";
  }

  function syncConversationToTracker(profile, openingMessage) {
    if (!window.HosperaTrackerSync || typeof window.HosperaTrackerSync.send !== "function") return;
    if (!window.HosperaTrackerSync.hasValidConfig || !window.HosperaTrackerSync.hasValidConfig()) return;
    if (!state.conversation) return;

    window.HosperaTrackerSync.send({
      event_type: "live_chat",
      tracker_target: "enquiry",
      external_id: state.conversation.id,
      submitted_at: new Date().toISOString(),
      full_name: profile.name || "",
      phone: profile.phone || "",
      email: profile.email || "",
      city: "",
      message: openingMessage || "",
      interest: "Live Chat",
      source_channel: "Live Chat",
      source_page: state.conversation.source_page || document.title,
      source_url: state.conversation.source_url || window.location.href,
      form_type: "Live Chat"
    });
  }

  function buildWidgetShell() {
    const widget = document.createElement("div");
    widget.className = "hospera-chat-widget";
    widget.setAttribute("data-hospera-live-chat", "true");
    widget.innerHTML = `
      <div class="hospera-chat-panel" data-chat-panel hidden>
        <div class="hospera-chat-panel-head">
          <div class="hospera-chat-head-copy">
            <p class="hospera-chat-eyebrow">Live Admissions Chat</p>
            <h3 class="hospera-chat-title">${state.config.chatTitle}</h3>
            <p class="hospera-chat-subtitle">${state.config.chatSubtitle}</p>
          </div>
          <button class="hospera-chat-close" type="button" aria-label="Close live chat" data-chat-close>&times;</button>
        </div>
        <div class="hospera-chat-body">
          <p class="hospera-chat-status" data-chat-status></p>

          <form class="hospera-chat-prechat" data-chat-prechat>
            <div class="hospera-chat-fields">
              <div class="hospera-chat-field">
                <label for="hospera-chat-name">Full Name</label>
                <input id="hospera-chat-name" name="name" type="text" placeholder="Your name" required />
              </div>
              <div class="hospera-chat-field">
                <label for="hospera-chat-phone">Phone Number</label>
                <input id="hospera-chat-phone" name="phone" type="tel" placeholder="Your phone number" required />
              </div>
              <div class="hospera-chat-field full">
                <label for="hospera-chat-email">Email Address</label>
                <input id="hospera-chat-email" name="email" type="email" placeholder="Your email address" />
              </div>
              <div class="hospera-chat-field full">
                <label for="hospera-chat-message">Your Message</label>
                <textarea id="hospera-chat-message" name="message" placeholder="Tell us what you need help with" required></textarea>
              </div>
            </div>
            <button class="hospera-chat-start" type="submit">Start Live Chat</button>
          </form>

          <div class="hospera-chat-thread" data-chat-thread hidden>
            <p class="hospera-chat-summary" data-chat-summary></p>
            <div class="hospera-chat-transcript" data-chat-transcript></div>
            <form class="hospera-chat-composer" data-chat-composer>
              <textarea name="message" placeholder="Type your reply here" required></textarea>
              <button class="hospera-chat-send" type="submit">Send Message</button>
            </form>
          </div>
        </div>
      </div>

      <div class="hospera-chat-actions">
        <button class="hospera-chat-launcher" type="button" aria-expanded="false" data-chat-toggle>Live Chat</button>
        <a class="hospera-chat-enquiry" href="contact.html#submit-enquiry" data-chat-enquiry>Submit Enquiry</a>
      </div>
    `;

    document.body.appendChild(widget);

    state.nodes.widget = widget;
    state.nodes.panel = widget.querySelector("[data-chat-panel]");
    state.nodes.toggle = widget.querySelector("[data-chat-toggle]");
    state.nodes.close = widget.querySelector("[data-chat-close]");
    state.nodes.enquiry = widget.querySelector("[data-chat-enquiry]");
    state.nodes.status = widget.querySelector("[data-chat-status]");
    state.nodes.prechat = widget.querySelector("[data-chat-prechat]");
    state.nodes.thread = widget.querySelector("[data-chat-thread]");
    state.nodes.summary = widget.querySelector("[data-chat-summary]");
    state.nodes.transcript = widget.querySelector("[data-chat-transcript]");
    state.nodes.composer = widget.querySelector("[data-chat-composer]");
    state.nodes.prechatName = widget.querySelector("#hospera-chat-name");
    state.nodes.prechatPhone = widget.querySelector("#hospera-chat-phone");
    state.nodes.prechatEmail = widget.querySelector("#hospera-chat-email");
    state.nodes.prechatMessage = widget.querySelector("#hospera-chat-message");
  }

  function hydrateProfileFields() {
    const profile = readStoredProfile();
    state.nodes.prechatName.value = profile.name || "";
    state.nodes.prechatPhone.value = profile.phone || "";
    state.nodes.prechatEmail.value = profile.email || "";
  }

  function openPanel() {
    state.panelOpen = true;
    state.nodes.panel.hidden = false;
    state.nodes.toggle.setAttribute("aria-expanded", "true");
    state.nodes.widget.classList.add("is-open");
    if (window.innerWidth <= 640) {
      document.body.classList.add("hospera-chat-open-mobile");
    }
    setStatus(
      state.conversation
        ? "Your chat is live. Keep this window open to see replies instantly."
        : "Start with your name, phone number, and first message."
    );
  }

  function closePanel() {
    state.panelOpen = false;
    state.nodes.panel.hidden = true;
    state.nodes.toggle.setAttribute("aria-expanded", "false");
    state.nodes.widget.classList.remove("is-open");
    document.body.classList.remove("hospera-chat-open-mobile");
  }

  function renderThreadSummary() {
    if (!state.conversation) return;
    const pieces = [];
    if (state.conversation.visitor_name) pieces.push(state.conversation.visitor_name);
    if (state.conversation.visitor_phone) pieces.push(state.conversation.visitor_phone);
    if (state.conversation.status) pieces.push(`Status: ${state.conversation.status.replace(/_/g, " ")}`);
    state.nodes.summary.textContent = pieces.join(" • ");
  }

  function createMessageNode(message) {
    const wrapper = document.createElement("div");
    const senderType = message.sender_type === "admin" ? "admin" : message.sender_type === "system" ? "system" : "visitor";
    wrapper.className = `hospera-chat-message ${senderType}`;

    const bubble = document.createElement("div");
    bubble.className = "hospera-chat-bubble";
    bubble.textContent = message.body;

    const meta = document.createElement("div");
    meta.className = "hospera-chat-meta";
    meta.textContent = `${message.sender_name || (senderType === "admin" ? "Hospera Team" : "You")} • ${formatTimestamp(message.created_at)}`;

    wrapper.appendChild(bubble);
    wrapper.appendChild(meta);
    return wrapper;
  }

  function renderMessages() {
    state.nodes.transcript.innerHTML = "";
    state.messages.forEach((message) => {
      state.nodes.transcript.appendChild(createMessageNode(message));
    });
    state.nodes.transcript.scrollTop = state.nodes.transcript.scrollHeight;
  }

  function toggleChatState() {
    const hasConversation = Boolean(state.conversation);
    state.nodes.prechat.hidden = hasConversation;
    state.nodes.thread.hidden = !hasConversation;
    if (hasConversation) {
      renderThreadSummary();
      renderMessages();
    } else {
      hydrateProfileFields();
    }
  }

  async function loadConversation(conversationId) {
    const { data, error } = await state.supabase
      .from("chat_conversations")
      .select("*")
      .eq("id", conversationId)
      .single();

    if (error) throw error;
    state.conversation = data;
  }

  async function loadMessages() {
    if (!state.conversation) return;

    const { data, error } = await state.supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", state.conversation.id)
      .order("created_at", { ascending: true });

    if (error) throw error;
    state.messages = data || [];
    renderMessages();
  }

  async function createConversation(profile, openingMessage) {
    const { data, error } = await state.supabase
      .from("chat_conversations")
      .insert({
        visitor_auth_id: state.user.id,
        visitor_name: profile.name,
        visitor_phone: profile.phone,
        visitor_email: profile.email || null,
        source_page: document.title,
        source_url: window.location.href,
        status: "new"
      })
      .select("*")
      .single();

    if (error) throw error;

    const messageResult = await state.supabase.from("chat_messages").insert({
      conversation_id: data.id,
      sender_type: "visitor",
      sender_auth_id: state.user.id,
      sender_name: profile.name,
      body: openingMessage
    });

    if (messageResult.error) throw messageResult.error;

    const autoReplyResult = await state.supabase.from("chat_messages").insert({
      conversation_id: data.id,
      sender_type: "system",
      sender_name: "Hospera Team",
      body: AUTO_REPLY_MESSAGE
    });

    if (autoReplyResult.error) throw autoReplyResult.error;

    state.conversation = data;
    storeConversationId(data.id);
    storeProfile(profile);
    await subscribeToRealtime();
    await loadMessages();
    syncConversationToTracker(profile, openingMessage);
  }

  async function sendMessage(body) {
    if (!state.conversation) return;

    const profile = readStoredProfile();
    const { error } = await state.supabase.from("chat_messages").insert({
      conversation_id: state.conversation.id,
      sender_type: "visitor",
      sender_auth_id: state.user.id,
      sender_name: profile.name || "Visitor",
      body
    });

    if (error) throw error;
  }

  async function restoreConversation() {
    const conversationId = readStoredConversationId();
    if (!conversationId) {
      toggleChatState();
      return;
    }

    try {
      await loadConversation(conversationId);
      await subscribeToRealtime();
      await loadMessages();
    } catch (error) {
      clearStoredConversation();
      state.conversation = null;
      state.messages = [];
    }

    toggleChatState();
  }

  async function subscribeToRealtime() {
    if (!state.conversation) return;
    if (state.channel) {
      state.supabase.removeChannel(state.channel);
      state.channel = null;
    }

    state.channel = state.supabase
      .channel(`hospera-chat-${state.conversation.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${state.conversation.id}`
        },
        async () => {
          await loadMessages();
          if (!state.panelOpen) {
            state.nodes.toggle.textContent = "Live Chat • New Reply";
          } else {
            state.nodes.toggle.textContent = "Live Chat";
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_conversations",
          filter: `id=eq.${state.conversation.id}`
        },
        async (payload) => {
          state.conversation = payload.new;
          renderThreadSummary();
        }
      )
      .subscribe();
  }

  function bindEvents() {
    state.nodes.toggle.addEventListener("click", () => {
      if (state.panelOpen) {
        closePanel();
      } else {
        openPanel();
        state.nodes.toggle.textContent = "Live Chat";
      }
    });

    state.nodes.close.addEventListener("click", closePanel);

    state.nodes.enquiry.addEventListener("click", (event) => {
      if (!isContactPage()) return;
      const target = document.getElementById("submit-enquiry");
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      if (typeof window.history.replaceState === "function") {
        window.history.replaceState(null, "", "#submit-enquiry");
      }
    });

    state.nodes.prechat.addEventListener("submit", async (event) => {
      event.preventDefault();
      const form = new FormData(state.nodes.prechat);
      const profile = {
        name: String(form.get("name") || "").trim(),
        phone: String(form.get("phone") || "").trim(),
        email: String(form.get("email") || "").trim()
      };
      const message = String(form.get("message") || "").trim();

      if (!profile.name || !profile.phone || !message) {
        setStatus("Please complete your name, phone number, and first message.", "error");
        return;
      }

      try {
        setStatus("Starting your live chat...");
        await createConversation(profile, message);
        state.nodes.prechatMessage.value = "";
        toggleChatState();
        setStatus(AUTO_REPLY_MESSAGE);
      } catch (error) {
        setStatus("Live chat could not start right now. Please try again.", "error");
      }
    });

    state.nodes.composer.addEventListener("submit", async (event) => {
      event.preventDefault();
      const textarea = state.nodes.composer.querySelector("textarea");
      const message = textarea.value.trim();
      if (!message) return;

      try {
        setStatus("Sending your message...");
        await sendMessage(message);
        textarea.value = "";
        setStatus("Your message has been sent. Stay on this chat to see replies live.");
      } catch (error) {
        setStatus("Your message could not be sent. Please try again.", "error");
      }
    });

    document.addEventListener("click", (event) => {
      if (!state.panelOpen) return;
      if (state.nodes.widget.contains(event.target)) return;
      closePanel();
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && state.panelOpen) {
        closePanel();
      }
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 640) {
        document.body.classList.remove("hospera-chat-open-mobile");
      } else if (state.panelOpen) {
        document.body.classList.add("hospera-chat-open-mobile");
      }
    });
  }

  async function boot(config) {
    if (state.booted) return;
    if (!hasValidConfig(config) || typeof window.supabase === "undefined") return;

    state.booted = true;
    state.config = config;
    ensureStylesheet();
    removeFallbackWidget();
    state.supabase = createSupabaseClient(config);

    try {
      await ensureVisitorAuth();
      buildWidgetShell();
      bindEvents();
      await restoreConversation();
    } catch (error) {
      console.error("Hospera live chat could not start.", error);
      state.booted = false;
    }
  }

  window.HosperaChatClient = {
    boot
  };
})();
