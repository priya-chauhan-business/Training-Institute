(function () {
  const state = {
    supabase: null,
    config: window.HOSPERA_CHAT_CONFIG || null,
    session: null,
    conversations: [],
    currentConversation: null,
    currentMessages: [],
    channels: [],
    refreshTimer: null,
    latestKnownMessageAt: null,
    initializedConversationSnapshot: false,
    notificationPermissionAttempted: false,
    nodes: {}
  };

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

  function createClient() {
    if (window.__hosperaAdminSupabase) return window.__hosperaAdminSupabase;
    window.__hosperaAdminSupabase = window.supabase.createClient(state.config.supabaseUrl, state.config.supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: true
      }
    });
    return window.__hosperaAdminSupabase;
  }

  function node(id) {
    return document.getElementById(id);
  }

  function setStatus(message, tone) {
    state.nodes.authStatus.textContent = message || "";
    state.nodes.authStatus.style.color = tone === "error" ? "#b33a2f" : "rgba(13, 23, 36, 0.66)";
  }

  function setThreadStatus(message, tone) {
    state.nodes.threadStatus.textContent = message || "";
    state.nodes.threadStatus.style.color = tone === "error" ? "#b33a2f" : "rgba(13, 23, 36, 0.66)";
  }

  function formatTimestamp(value) {
    if (!value) return "";
    return new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      minute: "2-digit",
      day: "numeric",
      month: "short"
    }).format(new Date(value));
  }

  function conversationMeta(conversation) {
    const pieces = [];
    if (conversation.visitor_phone) pieces.push(conversation.visitor_phone);
    if (conversation.visitor_email) pieces.push(conversation.visitor_email);
    if (conversation.source_page) pieces.push(conversation.source_page);
    return pieces.join(" • ");
  }

  function authEmail() {
    return state.session && state.session.user ? state.session.user.email || "" : "";
  }

  function isAnonymousSession(session) {
    if (!session || !session.user) return false;
    return Boolean(session.user.is_anonymous || session.user.app_metadata?.provider === "anonymous");
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("admin-sw.js?v=20260619b").catch(() => {});
  }

  async function unregisterLegacyWorkers() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.update()));
    } catch (error) {
      console.error("Hospera admin service worker refresh failed.", error);
    }
  }

  function cacheNodes() {
    state.nodes.setupNotice = node("adminSetupNotice");
    state.nodes.authCard = node("adminAuthCard");
    state.nodes.authForm = node("adminAuthForm");
    state.nodes.authEmail = node("adminEmail");
    state.nodes.authPassword = node("adminPassword");
    state.nodes.magicLinkButton = node("adminMagicLink");
    state.nodes.authStatus = node("adminAuthStatus");
    state.nodes.shell = node("adminShell");
    state.nodes.sessionChip = node("adminSessionChip");
    state.nodes.enableAlerts = node("adminEnableAlerts");
    state.nodes.signOut = node("adminSignOut");
    state.nodes.conversationList = node("conversationList");
    state.nodes.emptyState = node("emptyState");
    state.nodes.threadPane = node("threadPane");
    state.nodes.threadName = node("threadName");
    state.nodes.threadMeta = node("threadMeta");
    state.nodes.threadStatusSelect = node("threadStatusSelect");
    state.nodes.messageList = node("messageList");
    state.nodes.replyForm = node("replyForm");
    state.nodes.replyMessage = node("replyMessage");
    state.nodes.threadStatus = node("threadStatus");
  }

  function showSetupNotice() {
    state.nodes.setupNotice.classList.remove("hidden");
    state.nodes.authCard.classList.add("hidden");
    state.nodes.shell.classList.add("hidden");
  }

  function showAuthCard() {
    state.nodes.setupNotice.classList.add("hidden");
    state.nodes.authCard.classList.remove("hidden");
    state.nodes.shell.classList.add("hidden");
    state.nodes.sessionChip.textContent = "Signed out";
    state.nodes.enableAlerts.classList.add("hidden");
  }

  function showAppShell() {
    state.nodes.setupNotice.classList.add("hidden");
    state.nodes.authCard.classList.add("hidden");
    state.nodes.shell.classList.remove("hidden");
    state.nodes.sessionChip.textContent = authEmail() || "Signed in";
    state.nodes.enableAlerts.classList.remove("hidden");
  }

  function updateAlertButton() {
    if (!("Notification" in window)) {
      state.nodes.enableAlerts.textContent = "Alerts Unsupported";
      state.nodes.enableAlerts.disabled = true;
      return;
    }

    if (Notification.permission === "granted") {
      state.nodes.enableAlerts.textContent = "Alerts Enabled";
      state.nodes.enableAlerts.disabled = true;
    } else if (Notification.permission === "denied") {
      state.nodes.enableAlerts.textContent = "Alerts Blocked";
      state.nodes.enableAlerts.disabled = true;
    } else {
      state.nodes.enableAlerts.textContent = "Enable Alerts";
      state.nodes.enableAlerts.disabled = false;
    }
  }

  async function notifyNewVisitorMessages(nextConversations) {
    const previousMap = new Map(state.conversations.map((conversation) => [conversation.id, conversation]));

    if (!state.initializedConversationSnapshot) {
      state.initializedConversationSnapshot = true;
      return;
    }

    for (const conversation of nextConversations) {
      if (conversation.last_sender_type !== "visitor" || !conversation.last_message_at) continue;

      const previous = previousMap.get(conversation.id);
      if (previous && previous.last_message_at === conversation.last_message_at) continue;

      const title = `${conversation.visitor_name || "Visitor"} sent a new message`;
      const body = conversation.last_message_preview || "Open Hospera Admin Inbox to reply.";

      try {
        if ("serviceWorker" in navigator) {
          const registration = await navigator.serviceWorker.getRegistration();
          if (registration && typeof registration.showNotification === "function" && Notification.permission === "granted") {
            await registration.showNotification(title, {
              body,
              tag: `hospera-chat-${conversation.id}`,
              renotify: true,
              data: {
                url: `${window.location.origin}${window.location.pathname}#conversation-${conversation.id}`
              }
            });
          } else if ("Notification" in window && Notification.permission === "granted") {
            new Notification(title, { body, tag: `hospera-chat-${conversation.id}` });
          }
        } else if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, { body, tag: `hospera-chat-${conversation.id}` });
        }
      } catch (error) {
        console.error("Hospera admin notification failed.", error);
      }
    }
  }

  function renderConversations() {
    const list = state.nodes.conversationList;
    list.innerHTML = "";

    if (!state.conversations.length) {
      const empty = document.createElement("p");
      empty.className = "admin-pane-copy";
      empty.textContent = "No visitor chats yet.";
      list.appendChild(empty);
      return;
    }

    state.conversations.forEach((conversation) => {
      const button = document.createElement("button");
      const needsReply = conversation.last_sender_type === "visitor";
      button.className = `admin-conversation-item${state.currentConversation && state.currentConversation.id === conversation.id ? " active" : ""}${
        needsReply ? " needs-reply" : ""
      }`;
      button.type = "button";

      button.innerHTML = `
        <div class="admin-conversation-top">
          <h3 class="admin-conversation-name">${conversation.visitor_name || "Website Visitor"}</h3>
          <span class="admin-conversation-badge">${(conversation.status || "new").replace(/_/g, " ")}</span>
        </div>
        <p class="admin-conversation-meta">${conversationMeta(conversation)}</p>
        <p class="admin-conversation-preview">${conversation.last_message_preview || "No messages yet"}</p>
        <p class="admin-conversation-meta">${formatTimestamp(conversation.last_message_at || conversation.created_at)}</p>
      `;

      button.addEventListener("click", () => {
        selectConversation(conversation.id);
      });

      list.appendChild(button);
    });
  }

  function createMessageNode(message) {
    const item = document.createElement("div");
    item.className = `admin-message ${message.sender_type === "admin" ? "admin" : "visitor"}`;

    const bubble = document.createElement("div");
    bubble.className = "admin-message-bubble";
    bubble.textContent = message.body;

    const meta = document.createElement("div");
    meta.className = "admin-message-meta";
    meta.textContent = `${message.sender_name || (message.sender_type === "admin" ? "Hospera Team" : "Visitor")} • ${formatTimestamp(
      message.created_at
    )}`;

    item.appendChild(bubble);
    item.appendChild(meta);
    return item;
  }

  function renderCurrentConversation() {
    if (!state.currentConversation) {
      state.nodes.emptyState.classList.remove("hidden");
      state.nodes.threadPane.classList.add("hidden");
      return;
    }

    state.nodes.emptyState.classList.add("hidden");
    state.nodes.threadPane.classList.remove("hidden");
    state.nodes.threadName.textContent = state.currentConversation.visitor_name || "Website Visitor";
    state.nodes.threadMeta.textContent = conversationMeta(state.currentConversation);
    state.nodes.threadStatusSelect.value = state.currentConversation.status || "new";
    state.nodes.messageList.innerHTML = "";
    state.currentMessages.forEach((message) => {
      state.nodes.messageList.appendChild(createMessageNode(message));
    });
    state.nodes.messageList.scrollTop = state.nodes.messageList.scrollHeight;
  }

  async function loadConversations() {
    const { data, error } = await state.supabase
      .from("chat_conversations")
      .select("*")
      .order("last_message_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) throw error;
    const nextConversations = data || [];
    await notifyNewVisitorMessages(nextConversations);
    state.conversations = nextConversations;
    renderConversations();

    if (!state.currentConversation && state.conversations.length) {
      await selectConversation(state.conversations[0].id);
    } else if (state.currentConversation) {
      const refreshed = state.conversations.find((item) => item.id === state.currentConversation.id);
      if (refreshed) {
        state.currentConversation = refreshed;
        renderCurrentConversation();
      }
    }
  }

  function startPolling() {
    stopPolling();
    state.refreshTimer = window.setInterval(async () => {
      if (!state.session) return;
      try {
        await loadConversations();
        if (state.currentConversation) {
          await loadMessages(state.currentConversation.id);
          renderCurrentConversation();
        }
      } catch (error) {
        console.error("Hospera admin polling refresh failed.", error);
      }
    }, 5000);
  }

  function stopPolling() {
    if (state.refreshTimer) {
      window.clearInterval(state.refreshTimer);
      state.refreshTimer = null;
    }
  }

  async function loadMessages(conversationId) {
    const { data, error } = await state.supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) throw error;
    state.currentMessages = data || [];
  }

  async function selectConversation(conversationId) {
    const conversation = state.conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    state.currentConversation = conversation;
    await loadMessages(conversation.id);
    renderConversations();
    renderCurrentConversation();
    setThreadStatus("");
  }

  async function signInWithPassword(event) {
    event.preventDefault();
    const email = state.nodes.authEmail.value.trim();
    const password = state.nodes.authPassword.value;
    if (!email || !password) {
      setStatus("Please enter both email and password.", "error");
      return;
    }

    setStatus("Signing in...");
    const { error } = await state.supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      setStatus(error.message || "Sign in failed.", "error");
      return;
    }

    setStatus("Sign in successful.");
  }

  async function sendMagicLink() {
    const email = state.nodes.authEmail.value.trim();
    if (!email) {
      setStatus("Enter your email first, then request a magic link.", "error");
      return;
    }

    setStatus("Sending magic link...");
    const { error } = await state.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: new URL("admin.html", window.location.href).href
      }
    });

    if (error) {
      setStatus(error.message || "Magic link could not be sent.", "error");
      return;
    }

    setStatus("Magic link sent. Open your email on this iPhone and tap the link.");
  }

  async function handleReply(event) {
    event.preventDefault();
    if (!state.currentConversation) return;

    const body = state.nodes.replyMessage.value.trim();
    if (!body) return;

    setThreadStatus("Sending reply...");
    const senderName = authEmail() || "Hospera Team";

    const insertResult = await state.supabase.from("chat_messages").insert({
      conversation_id: state.currentConversation.id,
      sender_type: "admin",
      sender_auth_id: state.session.user.id,
      sender_name: senderName,
      body
    });

    if (insertResult.error) {
      setThreadStatus(insertResult.error.message || "Reply could not be sent.", "error");
      return;
    }

    const updateResult = await state.supabase
      .from("chat_conversations")
      .update({
        status: state.currentConversation.status === "closed" ? "in_progress" : state.currentConversation.status || "in_progress"
      })
      .eq("id", state.currentConversation.id);

    if (updateResult.error) {
      setThreadStatus("Reply sent, but the conversation status was not updated.", "error");
    } else {
      setThreadStatus("Reply sent.");
    }

    state.nodes.replyMessage.value = "";
  }

  async function updateConversationStatus() {
    if (!state.currentConversation) return;
    const nextStatus = state.nodes.threadStatusSelect.value;
    setThreadStatus("Updating status...");
    const { error } = await state.supabase
      .from("chat_conversations")
      .update({ status: nextStatus })
      .eq("id", state.currentConversation.id);

    if (error) {
      setThreadStatus(error.message || "Status update failed.", "error");
      return;
    }

    state.currentConversation.status = nextStatus;
    renderConversations();
    renderCurrentConversation();
    setThreadStatus("Status updated.");
  }

  function bindAppEvents() {
    state.nodes.authForm.addEventListener("submit", signInWithPassword);
    state.nodes.magicLinkButton.addEventListener("click", sendMagicLink);
    state.nodes.enableAlerts.addEventListener("click", async () => {
      if (!("Notification" in window)) {
        setStatus("Browser alerts are not supported on this device.", "error");
        updateAlertButton();
        return;
      }

      try {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setStatus("Alerts are enabled for new visitor messages.");
        } else {
          setStatus("Alerts were not enabled on this device.", "error");
        }
      } catch (error) {
        setStatus("Alert permission could not be requested.", "error");
      }

      updateAlertButton();
    });
    state.nodes.signOut.addEventListener("click", async () => {
      await state.supabase.auth.signOut();
      showAuthCard();
      setStatus("You have been signed out.");
    });
    state.nodes.replyForm.addEventListener("submit", handleReply);
    state.nodes.threadStatusSelect.addEventListener("change", updateConversationStatus);
  }

  async function resetChannels() {
    state.channels.forEach((channel) => state.supabase.removeChannel(channel));
    state.channels = [];
  }

  async function subscribeRealtime() {
    await resetChannels();

    const conversationsChannel = state.supabase
      .channel("hospera-admin-conversations")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_conversations" }, async () => {
        await loadConversations();
      })
      .subscribe();

    const messagesChannel = state.supabase
      .channel("hospera-admin-messages")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages" }, async (payload) => {
        if (state.currentConversation && payload.new.conversation_id === state.currentConversation.id) {
          await loadMessages(state.currentConversation.id);
          renderCurrentConversation();
        }
        await loadConversations();
      })
      .subscribe();

    state.channels.push(conversationsChannel, messagesChannel);
  }

  async function handleSession(session) {
    state.session = session;

    if (!session) {
      await resetChannels();
      stopPolling();
      state.conversations = [];
      state.currentConversation = null;
      state.currentMessages = [];
      showAuthCard();
      setStatus("Sign in with your team account to open the live inbox.");
      return;
    }

    if (isAnonymousSession(session)) {
      await state.supabase.auth.signOut();
      showAuthCard();
      setStatus("Please sign in with your Hospera team account to open the admin inbox.");
      return;
    }

    try {
      showAppShell();
      await loadConversations();
      await subscribeRealtime();
      startPolling();
      updateAlertButton();
    } catch (error) {
      await state.supabase.auth.signOut();
      showAuthCard();
      setStatus("This account is not authorised for the Hospera admin inbox yet.", "error");
    }
  }

  async function boot() {
    cacheNodes();
    registerServiceWorker();
    await unregisterLegacyWorkers();

    if (!hasValidConfig(state.config) || typeof window.supabase === "undefined") {
      showSetupNotice();
      return;
    }

    state.supabase = createClient();
    bindAppEvents();
    setStatus("Sign in with your team account to open the live inbox.");
    updateAlertButton();
    showAuthCard();

    state.supabase.auth.onAuthStateChange(async (_event, session) => {
      await handleSession(session);
    });

    await state.supabase.auth.signOut();
  }

  document.addEventListener("DOMContentLoaded", () => {
    boot().catch((error) => {
      console.error("Hospera admin app could not start.", error);
    });
  });
})();
