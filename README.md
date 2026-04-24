# tinytime

Monorepo for tinytime:
- `apps/app`: the authenticated time-tracker SPA (React + Vite + Supabase)
- `apps/landing`: the public marketing and legal site (Astro static)

## Prerequisites

- Node.js 20+
- npm
- A Supabase project

## Local development

1. Install all workspace dependencies:
   - `npm install`
2. App env file:
   - copy `apps/app/.env.example` to `apps/app/.env`
3. Fill app env values:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_SUPABASE_FUNCTIONS_URL` (optional)
4. Start app:
   - `npm run dev:app`
5. Start landing:
   - `npm run dev:landing`

## Build and lint

- Build app: `npm run build:app`
- Build landing: `npm run build:landing`
- Lint all workspaces: `npm run lint`

## Domain split

- `https://tinytime.work` → landing site (`apps/landing`)
- `https://www.tinytime.work` → redirect to apex
- `https://app.tinytime.work` → app SPA (`apps/app`)

## Supabase auth URL configuration

Set in Supabase Dashboard -> Authentication -> URL Configuration:

- Site URL: `https://app.tinytime.work`
- Additional redirect URLs:
  - `https://app.tinytime.work/**`
  - `http://localhost:5173/**`

## Google OAuth + Calendar verification

The app supports read-only Google Calendar data in the calendar view.

### OAuth client (Google Cloud Console)

- Authorized redirect URI:
  - `https://<your-project-ref>.supabase.co/functions/v1/google-oauth/callback`
- Authorized JavaScript origins:
  - `https://app.tinytime.work`
  - `https://tinytime.work`
- Required scope:
  - `https://www.googleapis.com/auth/calendar.readonly`

### OAuth consent screen

- Homepage: `https://tinytime.work`
- Privacy policy: `https://tinytime.work/privacy`
- Terms of service: `https://tinytime.work/terms`

Verify domain ownership in Google Search Console before submitting verification.

### Supabase edge function secrets

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `OAUTH_STATE_SECRET`

Example:

- `supabase secrets set GOOGLE_CLIENT_ID=...`
- `supabase secrets set GOOGLE_CLIENT_SECRET=...`
- `supabase secrets set GOOGLE_REDIRECT_URI=https://<your-project-ref>.supabase.co/functions/v1/google-oauth/callback`
- `supabase secrets set OAUTH_STATE_SECRET=<random-long-secret>`

### Deploy DB + functions

- Apply migrations (includes `google_integrations`, `google_calendar_selections`, and `google_integration_status`)
- Deploy:
  - `google-oauth`
  - `google-calendar`

## Vercel projects

Create two Vercel projects from this monorepo:

1. `tinytime-landing`
   - Root directory: `apps/landing`
   - Domain: `tinytime.work` (+ `www.tinytime.work` redirect)
2. `tinytime-app`
   - Root directory: `apps/app`
   - Domain: `app.tinytime.work`
   - Env vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_SUPABASE_FUNCTIONS_URL`

DNS:
- `A @ -> 76.76.21.21`
- `CNAME www -> cname.vercel-dns.com`
- `CNAME app -> cname.vercel-dns.com`

## Launch checklist

- `npm run build:landing` and `npm run build:app` pass
- Lighthouse on `tinytime.work` (target: 99+ across categories)
- Security headers check on both domains
- Rich results / JSON-LD validation for homepage
- Verify auth flows on `app.tinytime.work` (magic link + Google + GitHub)
- Submit sitemap: `https://tinytime.work/sitemap-index.xml`
- Submit Google OAuth verification after policy pages are live