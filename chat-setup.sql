begin;

create extension if not exists pgcrypto;

create table if not exists public.chat_admins (
  email text primary key,
  display_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  visitor_auth_id uuid not null,
  visitor_name text not null,
  visitor_phone text not null,
  visitor_email text,
  source_page text,
  source_url text,
  status text not null default 'new' check (status in ('new', 'in_progress', 'closed')),
  last_message_preview text,
  last_message_at timestamptz,
  last_sender_type text check (last_sender_type in ('visitor', 'admin', 'system')),
  admin_last_read_at timestamptz,
  unread_count integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.chat_conversations add column if not exists admin_last_read_at timestamptz;
alter table public.chat_conversations add column if not exists unread_count integer not null default 0;

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_type text not null check (sender_type in ('visitor', 'admin', 'system')),
  sender_auth_id uuid,
  sender_name text not null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists chat_conversations_last_message_at_idx on public.chat_conversations (last_message_at desc nulls last, created_at desc);
create index if not exists chat_conversations_visitor_auth_id_idx on public.chat_conversations (visitor_auth_id);
create index if not exists chat_messages_conversation_id_idx on public.chat_messages (conversation_id, created_at);

create or replace function public.touch_chat_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.sync_chat_conversation_from_message()
returns trigger
language plpgsql
as $$
begin
  update public.chat_conversations
  set
    last_message_preview = left(new.body, 180),
    last_message_at = new.created_at,
    last_sender_type = new.sender_type,
    unread_count = case
      when new.sender_type = 'visitor' then coalesce(unread_count, 0) + 1
      when new.sender_type = 'admin' then 0
      else coalesce(unread_count, 0)
    end,
    admin_last_read_at = case
      when new.sender_type = 'admin' then new.created_at
      else admin_last_read_at
    end,
    status = case
      when new.sender_type = 'visitor' then 'new'
      when status = 'closed' and new.sender_type = 'admin' then 'in_progress'
      else status
    end,
    updated_at = timezone('utc', now())
  where id = new.conversation_id;

  return new;
end;
$$;

drop trigger if exists chat_conversations_touch_updated_at on public.chat_conversations;
create trigger chat_conversations_touch_updated_at
before update on public.chat_conversations
for each row
execute procedure public.touch_chat_updated_at();

drop trigger if exists chat_messages_sync_conversation on public.chat_messages;
create trigger chat_messages_sync_conversation
after insert on public.chat_messages
for each row
execute procedure public.sync_chat_conversation_from_message();

create or replace function public.is_chat_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false;
$$;

alter table public.chat_admins enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;

drop policy if exists "Visitors can create their own conversations" on public.chat_conversations;
create policy "Visitors can create their own conversations"
on public.chat_conversations
for insert
to authenticated
with check (
  auth.uid() = visitor_auth_id
  and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = true
);

drop policy if exists "Visitors can read their own conversations" on public.chat_conversations;
create policy "Visitors can read their own conversations"
on public.chat_conversations
for select
to authenticated
using (auth.uid() = visitor_auth_id);

drop policy if exists "Visitors can update their own conversations" on public.chat_conversations;
create policy "Visitors can update their own conversations"
on public.chat_conversations
for update
to authenticated
using (auth.uid() = visitor_auth_id)
with check (auth.uid() = visitor_auth_id);

drop policy if exists "Admins can manage conversations" on public.chat_conversations;
create policy "Admins can manage conversations"
on public.chat_conversations
for all
to authenticated
using (public.is_chat_admin())
with check (public.is_chat_admin());

drop policy if exists "Visitors can create their own messages" on public.chat_messages;
create policy "Visitors can create their own messages"
on public.chat_messages
for insert
to authenticated
with check (
  sender_type = 'visitor'
  and sender_auth_id = auth.uid()
  and exists (
    select 1
    from public.chat_conversations
    where id = conversation_id
      and visitor_auth_id = auth.uid()
  )
);

drop policy if exists "Visitors can read their own messages" on public.chat_messages;
create policy "Visitors can read their own messages"
on public.chat_messages
for select
to authenticated
using (
  exists (
    select 1
    from public.chat_conversations
    where id = conversation_id
      and visitor_auth_id = auth.uid()
  )
);

drop policy if exists "Admins can manage messages" on public.chat_messages;
create policy "Admins can manage messages"
on public.chat_messages
for all
to authenticated
using (public.is_chat_admin())
with check (public.is_chat_admin());

revoke all on public.chat_admins from anon, authenticated;
grant select, insert, update, delete on public.chat_conversations to authenticated;
grant select, insert on public.chat_messages to authenticated;

comment on table public.chat_admins is 'Optional allow-list table for Hospera admin accounts. Current live access uses non-anonymous authenticated users.';
comment on table public.chat_conversations is 'One website visitor conversation per anonymous-auth visitor session.';
comment on table public.chat_messages is 'Chat messages exchanged between the website visitor and Hospera admin team.';

insert into public.chat_admins (email, display_name)
values
  ('admin@hosperainstitute.com', 'Hospera Admissions')
on conflict (email)
do update
set display_name = excluded.display_name,
    is_active = true;

commit;
