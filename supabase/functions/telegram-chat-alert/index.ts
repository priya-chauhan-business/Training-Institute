import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type ChatMessageRecord = {
  conversation_id?: string;
  sender_type?: string;
  body?: string;
  sender_name?: string;
};

type ConversationRecord = {
  id: string;
  visitor_name: string | null;
  visitor_phone: string | null;
  visitor_email: string | null;
  source_page: string | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const telegramBotToken = Deno.env.get("TELEGRAM_BOT_TOKEN") ?? "";
const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID") ?? "";
const adminUrl = Deno.env.get("HOSPERA_ADMIN_URL") ?? "";
const webhookSecret = Deno.env.get("HOSPERA_WEBHOOK_SECRET") ?? "";

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function buildTelegramText(conversation: ConversationRecord, body: string) {
  const lines = [
    "New Hospera website chat message",
    "",
    `Visitor: ${conversation.visitor_name || "Website Visitor"}`,
    `Phone: ${conversation.visitor_phone || "-"}`,
    `Email: ${conversation.visitor_email || "-"}`,
    `Page: ${conversation.source_page || "-"}`,
    "",
    `Message: ${body || "-"}`
  ];

  return lines.join("\n");
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!supabaseUrl || !serviceRoleKey || !telegramBotToken || !telegramChatId || !adminUrl || !webhookSecret) {
    return json({ error: "Missing required environment variables" }, 500);
  }

  const incomingSecret = request.headers.get("x-hospera-webhook-secret");
  if (!incomingSecret || incomingSecret !== webhookSecret) {
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: { record?: ChatMessageRecord };
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON payload" }, 400);
  }

  const record = payload.record;
  if (!record?.conversation_id || record.sender_type !== "visitor") {
    return json({ ok: true, skipped: true });
  }

  const { data: conversation, error: conversationError } = await supabase
    .from("chat_conversations")
    .select("id, visitor_name, visitor_phone, visitor_email, source_page")
    .eq("id", record.conversation_id)
    .maybeSingle<ConversationRecord>();

  if (conversationError || !conversation) {
    return json(
      {
        error: "Conversation not found",
        details: conversationError?.message || null
      },
      404
    );
  }

  const openUrl = `${adminUrl}#conversation-${conversation.id}`;
  const telegramPayload = {
    chat_id: telegramChatId,
    text: buildTelegramText(conversation, record.body || ""),
    reply_markup: {
      inline_keyboard: [[{ text: "Open Admin Inbox", url: openUrl }]]
    }
  };

  const telegramResponse = await fetch(`https://api.telegram.org/bot${telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(telegramPayload)
  });

  if (!telegramResponse.ok) {
    const details = await telegramResponse.text();
    return json({ error: "Telegram send failed", details }, 502);
  }

  return json({ ok: true });
});
