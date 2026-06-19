# Hospera Live Chat Setup

This folder now contains the code for:

- live visitor chat on the public website
- a private `admin.html` inbox for your team
- an iPhone-friendly PWA admin app using `Add to Home Screen`

## 1. Create a free Supabase project

Create a free project at [Supabase](https://supabase.com/).

## 2. Enable anonymous sign-ins

In your Supabase dashboard:

- go to `Authentication`
- enable `Anonymous Sign-Ins`

This is what lets a normal website visitor start a live chat without making an account.

Reference:
- [Supabase Anonymous Sign-Ins](https://supabase.com/docs/guides/auth/auth-anonymous)

## 3. Run the SQL

Open the Supabase SQL editor and run:

- [chat-setup.sql](./chat-setup.sql)

This creates:

- `chat_admins`
- `chat_conversations`
- `chat_messages`
- row level security rules
- conversation update triggers

## 4. Add your admin team accounts

Inside Supabase:

- go to `Authentication > Users`
- create email/password users for your team

Then add those same email addresses into the `chat_admins` table.

Example:

```sql
insert into public.chat_admins (email, display_name)
values
  ('admin@hosperainstitute.com', 'Hospera Admissions'),
  ('teammember@hosperainstitute.com', 'Team Member')
on conflict (email)
do update
set is_active = true;
```

## 5. Paste your Supabase keys into the site

Open:

- [chat-config.js](./chat-config.js)

Replace:

- `https://YOUR_PROJECT_ID.supabase.co`
- `YOUR_SUPABASE_ANON_KEY`

with your real project URL and anon key from `Project Settings > API`.

## 6. Publish the updated site

Push this `Google Analytics` folder version to GitHub Pages.

After publishing:

- public website visitors get the live chat widget
- your team uses [admin.html](./admin.html)

## 7. Install the admin app on iPhone

On iPhone:

1. Open your live `admin.html` URL in Safari
2. Tap `Share`
3. Tap `Add to Home Screen`

That installs it like an app icon on the phone.

## Notes

- Live updates work while the admin app is open.
- This is a free real-time setup, not a native iPhone `.ipa`.
- If you later want Android packaging or native iPhone packaging, this structure can be upgraded.
