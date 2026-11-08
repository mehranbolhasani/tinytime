-- Enforces the CONTEXT.md invariant: at most one running entry per user.
-- Precondition: no user currently has more than one row with stopped_at IS NULL.
create unique index if not exists time_entries_one_running_per_user
  on public.time_entries (user_id)
  where stopped_at is null;
