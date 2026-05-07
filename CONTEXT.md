# tinytime Engineering Context (Contract)

This file is the source of truth for architecture and implementation constraints.
If code and this file diverge, update this file in the same PR.

---

## 1) Product Scope

tinytime is a single-user, browser-only time tracker.

### In scope
- Personal timer + entries
- Calendar day planning/editing
- Reporting + CSV export
- Project management
- Google Calendar read-only overlay integration

### Out of scope
- Multi-user/team workspaces
- Billing/invoicing workflows
- Native mobile apps
- Generic third-party integrations beyond current Google Calendar scope
- Offline-first mode

---

## 2) Technology Baseline

- **App**: React 19 + Vite 8 (`apps/app`)
- **Landing**: Astro (`apps/landing`)
- **Styling**: Tailwind CSS v4 + `tw-animate-css`
- **Data**: Supabase (Auth + Postgres + Edge Functions)
- **Fetching/cache**: TanStack Query v5
- **Animation**:
  - App: `motion/react` (tokens in `apps/app/src/lib/motion.ts`)
  - Landing: `motion` (vanilla in-view animation script)
- **Language**: TypeScript strict mode throughout `apps/app/src/` (no `.js`/`.jsx` files)

### Dependency policy
- Prefer existing stack over new packages.
- Do not add alternative UI/animation stacks when current stack can solve it.

---

## 3) Non-negotiable Implementation Rules

### Data and Supabase boundaries
- Feature UI components **must not** perform direct table queries/mutations.
- Supabase data operations belong in hooks and `lib` helpers (`src/hooks`, `src/lib`).
- Auth/session shell logic in `App.jsx` is an allowed exception.

### Time and duration
- Duration base unit is **seconds** across app and DB logic.
- Timer elapsed display is client-derived from `started_at`.
- `duration_seconds` must be persisted when stopping an entry.

### TypeScript
- All source files under `apps/app/src/` must use `.ts` or `.tsx` extensions.
- `tsconfig.json` has `strict: true`; no `@ts-ignore` or `@ts-nocheck` suppressions.
- Use `as unknown as T` only when bridging a known type mismatch (motion/react Easing, drag event spread). Document why.
- Export named interfaces/types from the file that owns them; import with `import type` where possible.

### Styling and UI primitives
- Tailwind-first styling.
- Inline `style` is only allowed for truly dynamic values (e.g. block top/height, dynamic colors).
- Reuse shadcn/Radix primitives for common controls.

### Accessibility
- Interactive elements must have an accessible label: visible text, `aria-label`, or `aria-labelledby`.
- Error messages must use `role="alert"` so screen readers announce them immediately.
- Live regions that update (timers, status) must use `role="status"` or `aria-live`.
- Keyboard alternatives: calendar blocks support context-menu via `ContextMenu` key / `Shift+F10`.
- Global shortcuts are active only when focus is outside editable inputs and no modal/popup surface is open.
- Global shortcuts: `g` then `t/c/r/p` (navigation), `Cmd/Ctrl+Shift+S` (start/stop timer), and `Alt+ArrowLeft/Right` (calendar day navigation).
- Decorative icons get `aria-hidden="true"`; informational icons need an accompanying label.
- Radix UI dialogs/menus handle focus trapping natively — do not reimplement it.

### Animation
- Import animation APIs from `motion/react` in app code.
- Reuse tokens from `src/lib/motion.js` for durations/easing/variants.
- Keep `tw-animate-css` for Radix state transitions (open/close overlays).
- Respect reduced motion (`MotionConfig reducedMotion="user"`).

---

## 4) Current Architecture Map

```
apps/
  app/
    src/
      contexts/
        TimerContext.tsx       # Active entry + live elapsed timer state
      hooks/
        useTimer.ts            # Client elapsed timer from started_at
        useTimeEntries.ts      # Entry queries/mutations
        useProjects.ts         # Project queries/mutations
        useGoogleCalendar.ts   # Google status, selections, events
        useTheme.ts            # Theme preference
        useMediaQuery.ts       # Media query helper
      components/
        timer/                 # TimerWidget + EntryList (today view)
        calendar/              # DayView + edit/drag/resize dialogs + context menu
          blocks/              # EntryBlock, ActiveTimerBlock, GoogleEventBlock
        projects/              # Project CRUD UI
        reports/               # SummaryBar, ProjectBreakdown, FilterBar, EntryTable/Dialog, DateRangePicker
        settings/              # GoogleCalendarSection
        ui/                    # shadcn/Radix component implementations
      lib/
        supabase.ts
        utils.ts
        calendar.ts
        color.ts
        googleSignIn.ts
        googleCalendar.ts
        motion.ts
      pages/
        Today.tsx
        Calendar.tsx
        Reports.tsx
        Projects.tsx
      types.ts                 # Shared TypeScript types (TimeEntry, Project, CalendarBlock, etc.)
```

### Data flow rule (enforced by `scripts/check-context.sh`)
Components must not call `supabase.from(...)` directly. All Supabase access goes through hooks or `lib/` helpers.

---

## 5) Data Model and Migration Facts

### Active tables/views used by app
- `projects`
- `time_entries`
- `google_integrations`
- `google_calendar_selections`
- view: `google_integration_status`

### Important migration history
- `20260423120000_google_calendar_integration.sql`:
  - adds Google integration tables
  - enables RLS and policies
  - adds `google_integration_status` view
- `20260501213000_remove_tags_feature.sql`:
  - drops `tags` and `time_entry_tags`

### Invariants
- `time_entries.stopped_at = null` means running entry.
- At most one running entry per user.
- Deleting a project must not delete entries; it nulls `project_id`.

---

## 6) Auth and Integration Contract

### Auth methods currently implemented
- Magic link (Supabase OTP)
- Google sign-in (ID token flow)
- GitHub OAuth

### Google Calendar integration contract
- Uses edge functions `google-oauth` and `google-calendar`.
- Selected calendars persisted in `google_calendar_selections`.
- Calendar overlay appears in day view only when connected and selected.

Production domains:
- Landing: `https://tinytime.work`
- App: `https://app.tinytime.work`

---

## 7) UX and Motion Contract

- Authenticated app shell uses centered `max-w-md` layout.
- Bottom navigation is persistent.
- Motion is used for route/state/list/layout transitions.
- Avoid decorative animation that adds noise without improving state clarity.

---

## 8) Implemented Capabilities (Current)

- Start/stop timer with description and project
- Running-session summary state in timer widget
- Today entry list with edit/delete + total duration
- Calendar day timeline with drag/move/resize and edit flows
- Google Calendar event overlay in day view
- Reports (date ranges, project filtering, summary stats as cards, per-project duration cards, entries table, CSV export)
- Project CRUD (name/color/rate + delete behavior)

---

## 9) Known Gaps and Cleanup Targets

- Improve dense mobile responsiveness for Calendar and Reports.
- Add test baseline (unit + smoke E2E).
- ~~Accessibility pass (keyboard, focus order, contrast, semantics).~~ ✅ Done — aria-labels, role=alert/status, keyboard context menu.
- Performance pass for heavy calendar/report states.
- Cleanup stale leftovers after feature removals/dependency shifts (e.g. unused build chunking rules).

---

## 10) Change Management Rule

Any PR that changes architecture, data flow, stack choices, or domain boundaries must:
- update this file, and
- keep the update specific (what changed + new rule or invariant).

`scripts/check-context.sh` runs as a CI gate and enforces the machine-checkable invariants listed in §3 and §4.

---

## 11) PR Checklist (Quick Gate)

Before merging, verify:

- [ ] `scripts/check-context.sh` passes (runs automatically in CI).
- [ ] No feature UI component performs direct table queries/mutations; data access stays in hooks/lib.
- [ ] Duration/timer logic still uses seconds and preserves running-entry invariants.
- [ ] New motion uses `motion/react` + shared tokens, and respects reduced motion.
- [ ] UI changes reuse existing primitives (shadcn/Radix/Tailwind) instead of introducing parallel stacks.
- [ ] Interactive elements have accessible labels; errors use `role="alert"`.
- [ ] `CONTEXT.md` was updated if architecture/data flow/stack/domain rules changed.
