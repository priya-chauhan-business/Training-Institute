# Hospera Telegram Chat Alerts

This connects new visitor messages from the Hospera website chat to Telegram, so your team gets an instant alert even when the admin page is not open.

## What this does

- A visitor sends a message on the website.
- Supabase triggers an Edge Function.
- The Edge Function sends a Telegram message to your team or group.
- The Telegram alert includes a button that opens `admin.html` directly to that conversation.

## 1. Create a Telegram bot

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot`.
3. Give the bot a name, for example `Hospera Chat Alerts`.
4. Give it a username, for example `hospera_chat_alerts_bot`.
5. Copy the bot token that BotFather gives you.

## 2. Get your Telegram chat ID

1. Send any message to your new bot from the phone/account that should receive alerts.
2. Open this URL in your browser, replacing `YOUR_BOT_TOKEN`:

```text
https://api.telegram.org/botYOUR_BOT_TOKEN/getUpdates
```

3. Find `"chat":{"id":...}` in the response.
4. Copy that numeric `id`.

If you want alerts in a Telegram group:

1. Add the bot to the Telegram group.
2. Send a message in that group.
3. Open `getUpdates` again and copy the group chat ID.

## 3. Deploy the Supabase Edge Function

From your local project folder:

```bash
supabase login
supabase link --project-ref rgvpjkzkvictyuwaneva
supabase functions deploy telegram-chat-alert
```

## 4. Add the function secrets

Run these commands and replace the values:

```bash
supabase secrets set TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN
supabase secrets set TELEGRAM_CHAT_ID=YOUR_CHAT_ID
supabase secrets set HOSPERA_ADMIN_URL=https://YOUR-DOMAIN/admin.html
supabase secrets set HOSPERA_WEBHOOK_SECRET=YOUR_RANDOM_SECRET
supabase secrets set SUPABASE_URL=https://rgvpjkzkvictyuwaneva.supabase.co
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

For `HOSPERA_WEBHOOK_SECRET`, use a long random value.

## 5. Create the database webhook

In Supabase:

1. Open `Database`.
2. Open `Webhooks`.
3. Click `Create a new webhook`.
4. Set:
   - Name: `telegram-chat-alert`
   - Table: `public.chat_messages`
   - Events: `Insert`
   - Type: `HTTP Request`
   - Method: `POST`
   - URL:

```text
https://rgvpjkzkvictyuwaneva.functions.supabase.co/telegram-chat-alert
```

5. Add header:

```text
x-hospera-webhook-secret: YOUR_RANDOM_SECRET
```

6. Save the webhook.

## 6. Important note

The function only sends Telegram alerts for new `visitor` messages. Admin replies do not create Telegram alerts.

## Official docs

- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [Supabase Function Secrets](https://supabase.com/docs/guides/functions/secrets)
- [Supabase Database Webhooks](https://supabase.com/docs/guides/database/webhooks)
- [Telegram Bot API](https://core.telegram.org/bots/api)
