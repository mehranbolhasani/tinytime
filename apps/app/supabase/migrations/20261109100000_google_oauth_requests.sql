-- Short-lived, single-use OAuth requests. Holds the PKCE verifier server-side
-- and binds the flow to the user who started it. Service role only.
create table if not exists public.google_oauth_requests (
  state text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  code_verifier text not null,
  app_origin text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes')
);

create index if not exists google_oauth_requests_user_id_idx
  on public.google_oauth_requests (user_id);

alter table public.google_oauth_requests enable row level security;
-- No policies on purpose: only the service role (Edge Functions) may touch this table.
revoke all on public.google_oauth_requests from anon, authenticated;
