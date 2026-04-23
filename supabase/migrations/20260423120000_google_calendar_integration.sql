create extension if not exists pgcrypto;

create table if not exists public.google_integrations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  google_sub text not null,
  google_email text,
  scopes text,
  access_token text not null,
  refresh_token text,
  access_token_expires_at timestamptz,
  connected_at timestamptz not null default now(),
  last_error text
);

alter table public.google_integrations enable row level security;

revoke all on table public.google_integrations from anon;
revoke all on table public.google_integrations from authenticated;

create table if not exists public.google_calendar_selections (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  calendar_id text not null,
  summary text,
  background_color text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (user_id, calendar_id)
);

alter table public.google_calendar_selections enable row level security;

drop policy if exists "Users can read their own selected calendars" on public.google_calendar_selections;
create policy "Users can read their own selected calendars"
  on public.google_calendar_selections
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own selected calendars" on public.google_calendar_selections;
create policy "Users can insert their own selected calendars"
  on public.google_calendar_selections
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own selected calendars" on public.google_calendar_selections;
create policy "Users can update their own selected calendars"
  on public.google_calendar_selections
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own selected calendars" on public.google_calendar_selections;
create policy "Users can delete their own selected calendars"
  on public.google_calendar_selections
  for delete
  to authenticated
  using (auth.uid() = user_id);

create or replace view public.google_integration_status as
select
  gi.user_id,
  true as connected,
  gi.google_email,
  gi.scopes,
  gi.connected_at,
  coalesce(gi.last_error = 'needs_reconnect', false) as needs_reconnect
from public.google_integrations gi
where gi.user_id = auth.uid();

grant select on public.google_integration_status to authenticated;
