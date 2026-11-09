-- Hardening for projects and time_entries, based on the 2026-11-09 schema review.
-- Safe to run once. It stops with a clear message if existing data would violate the new rules.

-- 0. Preconditions: refuse to run if existing rows would break the new constraints.
do $$
declare
  orphan_projects integer;
  orphan_entries integer;
  bad_ranges integer;
  bad_durations integer;
  blank_names integer;
begin
  select count(*) into orphan_projects from public.projects where user_id is null;
  select count(*) into orphan_entries from public.time_entries where user_id is null;
  select count(*) into bad_ranges from public.time_entries where stopped_at is not null and stopped_at < started_at;
  select count(*) into bad_durations from public.time_entries where duration_seconds < 0;
  select count(*) into blank_names from public.projects where char_length(btrim(name)) = 0;

  if orphan_projects + orphan_entries + bad_ranges + bad_durations + blank_names > 0 then
    raise exception
      'Hardening precondition failed: % projects and % entries without user_id, % entries stopped before they started, % negative durations, % blank project names. Fix these rows first.',
      orphan_projects, orphan_entries, bad_ranges, bad_durations, blank_names;
  end if;
end $$;

-- 1. Every row must belong to a user (both columns were nullable).
alter table public.projects alter column user_id set not null;
alter table public.time_entries alter column user_id set not null;

-- 2. The hourly rate was removed from the product on purpose.
alter table public.projects drop column if exists hourly_rate;

-- 3. Basic integrity.
alter table public.time_entries
  add constraint time_entries_stop_after_start check (stopped_at is null or stopped_at >= started_at);
alter table public.time_entries
  add constraint time_entries_duration_non_negative check (duration_seconds is null or duration_seconds >= 0);
alter table public.projects
  add constraint projects_name_not_blank check (char_length(btrim(name)) > 0);

-- 4. Indexes for the app's real queries: per-user date ranges, and foreign-key lookups.
--    (Until now the only index on time_entries besides the primary key was the running-entry one.)
create index if not exists time_entries_user_started_idx on public.time_entries (user_id, started_at);
create index if not exists time_entries_project_id_idx on public.time_entries (project_id);
create index if not exists projects_user_id_idx on public.projects (user_id);

-- 5. Policies:
--    - only for signed-in users (they previously applied to every role, including anon),
--    - auth.uid() wrapped in a subquery so Postgres evaluates it once per query, not once per row,
--    - entries may only point at the user's own projects (previously any project id was accepted).
drop policy if exists "projects_select_own" on public.projects;
drop policy if exists "projects_insert_own" on public.projects;
drop policy if exists "projects_update_own" on public.projects;
drop policy if exists "projects_delete_own" on public.projects;

create policy "projects_select_own" on public.projects
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "projects_insert_own" on public.projects
  for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "projects_update_own" on public.projects
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy "projects_delete_own" on public.projects
  for delete to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "entries_select_own" on public.time_entries;
drop policy if exists "entries_insert_own" on public.time_entries;
drop policy if exists "entries_update_own" on public.time_entries;
drop policy if exists "entries_delete_own" on public.time_entries;

create policy "entries_select_own" on public.time_entries
  for select to authenticated
  using (user_id = (select auth.uid()));
create policy "entries_insert_own" on public.time_entries
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (
      time_entries.project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = time_entries.project_id and p.user_id = (select auth.uid())
      )
    )
  );
create policy "entries_update_own" on public.time_entries
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (
      time_entries.project_id is null
      or exists (
        select 1 from public.projects p
        where p.id = time_entries.project_id and p.user_id = (select auth.uid())
      )
    )
  );
create policy "entries_delete_own" on public.time_entries
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- 6. Signed-out visitors never need these. RLS already returned nothing to them; this removes the access entirely.
revoke all on public.projects from anon;
revoke all on public.time_entries from anon;
revoke all on public.google_calendar_selections from anon;
revoke all on public.google_integration_status from anon;
