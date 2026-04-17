# tinytime

A small personal time tracker built with React, Vite, and Supabase.

## Prerequisites

- Node.js 20+
- npm
- A Supabase project

## Setup

1. Install dependencies:
   - `npm install`
2. Create your env file:
   - copy `.env.example` to `.env`
3. Fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Start the app:
   - `npm run dev`

## Auth and RLS expectations

This app requires a signed-in Supabase user for mutations (create/update/delete).

- The app now uses magic-link sign-in on startup.
- If no session exists, you will see a login screen and cannot access the main app yet.
- After login, the app routes render and CRUD actions should work as long as RLS policies allow them.

## Suggested Supabase table ownership model

Use a `user_id uuid not null default auth.uid()` column on each table and RLS policies scoped to `auth.uid()`:

- `projects.user_id = auth.uid()`
- `tags.user_id = auth.uid()`
- `time_entries.user_id = auth.uid()`
- `time_entry_tags` tied to entry ownership (via join or policy conditions)

If your schema does not include ownership columns/policies, writes will fail with row-level security errors.

## Troubleshooting

### No Start button or app looks stuck

- Check for visible error banners in the UI.
- Confirm you are signed in (magic link flow).
- Confirm `.env` values are present and valid.

### “row-level security policy” errors

- You are authenticated incorrectly or not authenticated.
- Or RLS policies do not allow your user to write rows.
- Fix by signing in and updating policies to scope by `auth.uid()`.

### Verify local health checks

- `npm run lint`
- `npm run build`