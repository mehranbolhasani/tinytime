# Project context — time tracker

A minimal personal time tracker inspired by Toggl Track. Solo use only. Web app (browser). No mobile, no desktop.

---

## Stack

- **App framework**: React + Vite (`apps/app`)
- **Landing framework**: Astro (`apps/landing`)
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (source copied into `apps/app/src/components/ui/`)
- **Backend**: Supabase (auth, Postgres, real-time)
- **Data fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **Language**: JavaScript for app, Astro/TypeScript support for landing

---

## Rules — always follow these

- Components never import `supabase` directly. All Supabase calls live in hooks inside `src/hooks/`.
- One hook per domain: `useTimer`, `useTimeEntries`, `useProjects`, `useTags`.
- All duration math uses seconds as the base unit. Format for display in `src/lib/utils.js`.
- Tailwind only for styling. Avoid inline styles unless needed for precise dynamic positioning, and keep usage minimal.
- shadcn/ui for all UI primitives (Button, Dialog, Popover, Input, Select, DropdownMenu, etc.). Do not build these from scratch.
- Keep components small and single-purpose. If a component exceeds ~150 lines, split it.
- No unnecessary dependencies. Check if something already in the stack can solve the problem first.

---

## Folder structure

```
apps/
  app/
    src/
      contexts/
        TimerContext.jsx # Shared active-entry + elapsed timer state
      components/
        timer/          # Active timer widget (start/stop, current entry display)
        calendar/       # Day view timeline/grid and entry editing interactions
        projects/       # Project management sections/forms
        reports/        # Charts, summary stats, CSV export
        tags/           # Tag management sections/forms
        ui/             # shadcn/ui components (do not modify manually)
      hooks/
        useTheme.js         # System/light/dark theme preference
        useTimer.js         # Start, stop, persist active timer
        useTimeEntries.js   # CRUD for time entries, filtering by date range
        useProjects.js      # CRUD for projects
        useTags.js          # CRUD for tags, attach/detach from entries
      lib/
        supabase.js     # Supabase client init (reads from .env)
        utils.js        # formatDuration(seconds), formatDate, groupEntriesByDay, etc.
        color.js        # Color helpers (hexToRgba, presets)
        calendar.js     # Calendar layout helpers (blocks, overlap lanes)
      pages/
        Today.jsx       # Default view: timer + today's entries
        Calendar.jsx    # Day-only grid view of entries
        Reports.jsx     # Charts by project/tag, date range picker, CSV export
        Projects.jsx    # Manage projects
  landing/
    src/pages/index.astro   # Marketing landing page
    src/pages/privacy.astro # Google-compliant privacy policy
    src/pages/terms.astro   # Terms of service
    public/robots.txt       # Crawling and sitemap entrypoint
```

---

## Supabase schema

```sql
-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  color text not null default '#6366f1',
  hourly_rate numeric(10,2),
  created_at timestamptz default now()
);

-- Tags
create table tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null unique,
  color text not null default '#94a3b8',
  created_at timestamptz default now()
);

-- Time entries
create table time_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid references projects(id) on delete set null,
  description text,
  started_at timestamptz not null,
  stopped_at timestamptz,
  duration_seconds integer,  -- stored on stop, used for fast aggregation
  created_at timestamptz default now()
);

-- Join table: entries <-> tags
create table time_entry_tags (
  time_entry_id uuid references time_entries(id) on delete cascade,
  tag_id uuid references tags(id) on delete cascade,
  primary key (time_entry_id, tag_id)
);
```

A `stopped_at` of `null` means the timer is currently running. There should never be more than one running entry at a time.

---

## Data logic rules

- `duration_seconds` is computed and stored when an entry is stopped: `Math.round((stopped_at - started_at) / 1000)`.
- The active timer's elapsed time is computed live on the client from `started_at` to `Date.now()`. Do not poll Supabase for this.
- Deleting a project sets `project_id` to null on its entries (cascade rule above). Entries are never deleted with the project.
- Tags are global (not per-project).
- `projects.hourly_rate` is stored and displayed in EUR.

---

## Auth

Magic link (passwordless email) via Supabase Auth. No password login needed — solo use.
RLS (Row Level Security) is enabled on all tables. All rows are scoped to `auth.uid()`.

Production split:
- Landing: `https://tinytime.work`
- App: `https://app.tinytime.work`

---

## UI layout conventions

- Shared app shell in `App.jsx` uses a centered content column (`max-w-[560px]`).
- A compact top header card is shown on all authenticated pages with:
  - `tinytime` logo (left)
  - hamburger trigger (right)
- Account/settings actions are shown in a compact popover card (not a slide-in sheet).
- Bottom navigation is persistent and focuses on section links (Today, Calendar, Reports, Projects).

---

## Features in scope (MVP)

- [x] Start/stop timer with description and project
- [x] Assign tags to an entry
- [x] Edit and delete past entries
- [x] Day view: list of entries for the selected day, total hours
- [x] Day-only calendar view: timeline/grid with draggable/editable entries
- [x] Reports: hours by project (bar chart), hours by tag (pie/donut), date range filter
- [x] CSV export of filtered entries
- [x] Project management (create, edit color, set hourly rate, delete)
- [x] Tag management (create, edit, delete)

---

## Current known gaps / next milestones

- [ ] Improve responsive behavior for dense views (Calendar + Reports) on small screens.
- [ ] Add a lightweight onboarding/empty-state flow for first-time users after auth.
- [ ] Add a production-ready test baseline (unit tests for helpers/hooks + smoke E2E for core flows).
- [ ] Improve auth redirect configuration ergonomics (document and/or support explicit env override).
- [ ] Add accessibility review pass (keyboard interactions, focus states, contrast checks).
- [ ] Add optional performance pass for chart-heavy reports (memoization + render profiling).

## Out of scope (do not build)

- Team / multi-user features
- Invoicing or billing generation
- Mobile app
- Integrations (Jira, GitHub, etc.), except the approved read-only Google Calendar integration for Calendar day view display
- Offline mode
