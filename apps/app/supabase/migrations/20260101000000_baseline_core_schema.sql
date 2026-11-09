-- Baseline: the core tables as they existed before migrations were tracked in this repo.
-- Reconstructed from the live schema (supabase db dump, 2026-11-09).
--
-- Production already has all of this. Mark it as applied there, so it never runs on prod:
--   supabase migration repair --status applied 20260101000000
-- It only runs on fresh databases (local `supabase start`, CI, preview branches).

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  hourly_rate numeric(10, 2),
  created_at timestamptz default now(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects (id) on delete set null,
  description text,
  started_at timestamptz not null,
  stopped_at timestamptz,
  duration_seconds integer,
  created_at timestamptz default now(),
  user_id uuid default auth.uid() references auth.users (id) on delete cascade
);

alter table public.projects enable row level security;
alter table public.time_entries enable row level security;

create policy "projects_select_own" on public.projects
  for select using (user_id = auth.uid());
create policy "projects_insert_own" on public.projects
  for insert with check (user_id = auth.uid());
create policy "projects_update_own" on public.projects
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "projects_delete_own" on public.projects
  for delete using (user_id = auth.uid());

create policy "entries_select_own" on public.time_entries
  for select using (user_id = auth.uid());
create policy "entries_insert_own" on public.time_entries
  for insert with check (user_id = auth.uid());
create policy "entries_update_own" on public.time_entries
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "entries_delete_own" on public.time_entries
  for delete using (user_id = auth.uid());
