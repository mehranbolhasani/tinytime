# Project context — time tracker

A minimal personal time tracker inspired by Toggl Track. Solo use only. Web app (browser). No mobile, no desktop.

---

## Stack

- **Framework**: React + Vite
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (source copied into `src/components/ui/`)
- **Backend**: Supabase (auth, Postgres, real-time)
- **Data fetching**: TanStack Query (React Query)
- **Charts**: Recharts
- **Language**: JavaScript (no TypeScript)

---

## Rules — always follow these

- Components never import `supabase` directly. All Supabase calls live in hooks inside `src/hooks/`.
- One hook per domain: `useTimer`, `useTimeEntries`, `useProjects`, `useTags`.
- All duration math uses seconds as the base unit. Format for display in `src/lib/utils.js`.
- Tailwind only for styling. No inline styles, no CSS modules, no extra CSS files unless absolutely necessary.
- shadcn/ui for all UI primitives (Button, Dialog, Popover, Input, Select, DropdownMenu, etc.). Do not build these from scratch.
- Keep components small and single-purpose. If a component exceeds ~150 lines, split it.
- No unnecessary dependencies. Check if something already in the stack can solve the problem first.

---

## Folder structure

```
src/
  components/
    timer/          # Active timer widget (start/stop, current entry display)
    calendar/       # Day view and week view
    projects/       # Project list, create/edit forms
    reports/        # Charts, summary stats, CSV export
    tags/           # Tag management
    ui/             # shadcn/ui components (do not modify manually)
  hooks/
    useTimer.js         # Start, stop, persist active timer
    useTimeEntries.js   # CRUD for time entries, filtering by date range
    useProjects.js      # CRUD for projects
    useTags.js          # CRUD for tags, attach/detach from entries
  lib/
    supabase.js     # Supabase client init (reads from .env)
    utils.js        # formatDuration(seconds), formatDate, groupEntriesByDay, etc.
  pages/
    Today.jsx       # Default view: timer + today's entries
    Calendar.jsx    # Week/day grid view of entries
    Reports.jsx     # Charts by project/tag, date range picker, CSV export
    Projects.jsx    # Manage projects
```

---

## Supabase schema

```sql
-- Projects
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  color text not null default '#6366f1',
  hourly_rate numeric(10,2),
  created_at timestamptz default now()
);

-- Tags
create table tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#94a3b8',
  created_at timestamptz default now()
);

-- Time entries
create table time_entries (
  id uuid primary key default gen_random_uuid(),
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

---

## Auth

Magic link (passwordless email) via Supabase Auth. No password login needed — solo use.
RLS (Row Level Security) is enabled on all tables. All rows are scoped to `auth.uid()`.

---

## Features in scope (MVP)

- [ ] Start/stop timer with description and project
- [ ] Assign tags to an entry
- [ ] Edit and delete past entries
- [ ] Day view: list of entries for the selected day, total hours
- [ ] Week view: 7-column grid, entries as time blocks
- [ ] Reports: hours by project (bar chart), hours by tag (pie/donut), date range filter
- [ ] CSV export of filtered entries
- [ ] Project management (create, edit color, set hourly rate, delete)
- [ ] Tag management (create, edit, delete)

## Out of scope (do not build)

- Team / multi-user features
- Invoicing or billing generation
- Mobile app
- Integrations (Jira, GitHub, etc.)
- Offline mode
