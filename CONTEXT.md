# tinytime Engineering Context (Contract)

This file is the source of truth for architecture and implementation constraints.
If code and this file diverge, update this file in the same PR.

---

## 1) Product Scope

tinytime is a single-user, browser-only time tracker.

### In scope
- Personal timer + entries
- Calendar day planning/editing (clock dial primary; list timeline escape hatch)
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
- Auth/session shell logic in `App.tsx` is an allowed exception.

### Local storage
- All keys use the `tinytime:` prefix.
- Per-user state is stored as `tinytime:<name>:<userId>` (for example `tinytime:favourites:<userId>`) so cached state never leaks between accounts.

### Time and duration
- Duration base unit is **seconds** across app and DB logic.
- Timer elapsed display is client-derived from `started_at`.
- The running timer is derived only from the active-entry query (`ACTIVE_ENTRY_QUERY_KEY`). There is no local timer state. Start and stop are optimistic cache updates in `useTimerControlActions`, serialized by `lib/timerActionLock.ts`.
- Live seconds come from `useElapsedSeconds` (shared ticker in `lib/ticker.ts`). Only leaf display components may call it. Contexts, layouts and pages must not hold ticking values.
- `duration_seconds` must be persisted when stopping an entry.
- The selected Calendar date lives in the URL (`?date=YYYY-MM-DD`), so palette jumps and back/forward navigation share one source of truth.
- Clock calendar uses a **12-hour AM/PM period** dial; entries that cross noon/midnight are clipped per period (same idea as vertical day-grid clipping).

### TypeScript
- All source files under `apps/app/src/` must use `.ts` or `.tsx` extensions.
- `tsconfig.json` has `strict: true`; no `@ts-ignore` or `@ts-nocheck` suppressions.
- Use `as unknown as T` only when bridging a known type mismatch (motion/react Easing, drag event spread). Document why.
- Export named interfaces/types from the file that owns them; import with `import type` where possible.

### Tooling and CI
- Lint covers all TS/TSX; CI (`.github/workflows/ci.yml`) runs lint, typecheck, test, the app and landing builds, the context guard and `deno check` for Edge Functions.

### Styling and UI primitives
- Tailwind-first styling.
- Inline `style` is only allowed for truly dynamic values (e.g. block top/height, dynamic colors).
- Reuse shadcn/Radix primitives for common controls.

### Fonts
- Geist and Doto are both self-hosted (Geist via `public/fonts`, Doto via `@fontsource-variable/doto`).
- No third-party font requests are allowed (`fonts.googleapis.com` / `fonts.gstatic.com` must not appear).
- `.font-pixel` fixes the Doto `ROND` axis at 100 to match the previous Google Fonts request.

### Scripts and CSP
- The theme bootstrap is `/public/theme-init.js`, loaded synchronously as the first script in `<head>`.
- The app CSP has no `'unsafe-inline'` for scripts, and no third-party font domains.
- Google Identity Services is injected on demand by `loadGisScript()` and only loads on the sign-in screen.

### Accessibility
- Interactive elements must have an accessible label: visible text, `aria-label`, or `aria-labelledby`.
- Error messages must use `role="alert"` so screen readers announce them immediately.
- Live regions that update (timers, status) must use `role="status"` or `aria-live`.
- Keyboard alternatives: calendar blocks support context-menu via `ContextMenu` key / `Shift+F10`.
- Global shortcuts are active only when focus is outside editable inputs and no modal/popup surface is open.
- Global shortcuts: `g` then `t/c/r/p` (navigation), `Cmd/Ctrl+K` (open command palette), `Cmd/Ctrl+Shift+S` (start/stop timer), and `Alt+ArrowLeft/Right` (calendar day navigation).
- Decorative icons get `aria-hidden="true"`; informational icons need an accompanying label.
- Radix UI dialogs/menus handle focus trapping natively — do not reimplement it.

### Animation
- Import animation APIs from `motion/react` in app code.
- Reuse tokens from `src/lib/motion.ts` for durations/easing/variants.
- Keep `tw-animate-css` for Radix state transitions (open/close overlays).
- Respect reduced motion (`MotionConfig reducedMotion="user"`).

---

## 4) Current Architecture Map

```
apps/
  app/
    src/
      contexts/
        TimerContext.tsx       # Active entry + isRunning (stable, no ticking values)
        SessionContext.tsx     # Current user id for per-user client state
      hooks/
        useElapsedSeconds.ts   # Live elapsed seconds from the shared ticker
        useTimeEntries.ts      # Entry queries/mutations
        useProjects.ts         # Project queries/mutations
        useGoogleCalendar.ts   # Google status, selections, events
        useTheme.ts            # Theme preference
        useMediaQuery.ts       # Media query helper
      components/
        timer/                 # TimerWidget + TimerDisplay + MiniTimerPill + EntryList
        calendar/              # DayView (list escape hatch) + edit/drag/resize dialogs + context menu
          blocks/              # EntryBlock, ActiveTimerBlock, GoogleEventBlock
        clock-calendar/        # Primary radial clock day view + month overview
        projects/              # Project CRUD UI
        reports/               # SummaryBar, ProjectBreakdown, FilterBar, EntryTable/Dialog, DateRangePicker
        settings/              # GoogleCalendarSection
        ui/                    # shadcn/Radix component implementations
        ErrorBoundary.tsx      # App-level and per-route crash containment
      lib/
        supabase.ts
        utils.ts
        calendar.ts            # Vertical day-grid geometry
        clockCalendar.ts       # Polar clock day geometry (12h AM/PM periods)
        color.ts
        googleSignIn.ts
        googleCalendar.ts
        motion.ts
        ticker.ts              # Shared 1-second wall-clock ticker
        timer.ts               # Pure elapsed-seconds helper
        timerActionLock.ts     # App-wide single-flight guard for start/stop
      pages/
        Today.tsx
        Calendar.tsx           # List DayView by default; clock view reachable via toggle
        Reports.tsx
        Projects.tsx
        GoogleCallback.tsx     # /google/callback route; completes the OAuth exchange
      types.ts                 # Shared TypeScript types (TimeEntry, Project, CalendarBlock, etc.)
```

### Data flow rule (enforced by `scripts/check-context.sh`)
Components must not call `supabase.from(...)` directly. All Supabase access goes through hooks or `lib/` helpers.

---

## 5) Data Model and Migration Facts

### Generated types
- DB types are generated into `src/lib/database.types.ts` via `npm run gen:types`; regenerate after every migration.

### Active tables/views used by app
- `projects`
- `time_entries`
- `google_integrations`
- `google_calendar_selections`
- `google_oauth_requests` (service-role only, single use, 10-minute expiry)
- view: `google_integration_status`

### Important migration history
- `20260423120000_google_calendar_integration.sql`:
  - adds Google integration tables
  - enables RLS and policies
  - adds `google_integration_status` view
- `20260501213000_remove_tags_feature.sql`:
  - drops `tags` and `time_entry_tags`
- `20261109100000_google_oauth_requests.sql`:
  - adds `google_oauth_requests` for pending, single-use OAuth state/PKCE verifiers

### Invariants
- `time_entries.stopped_at = null` means running entry.
- At most one running entry per user, enforced by the partial unique index `time_entries_one_running_per_user` (migration `20261108120000_one_running_entry_per_user.sql`).
- Timer start/stop run through `lib/timerActionLock.ts`, so only one timer action is in flight across the app.
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
- Calendar overlay appears in clock and list day views when connected and selected.
- Connection status is read directly from the `google_integration_status` view; the `google-calendar` function has no `status` action.
- Connect flow:
  1. `start` (JWT) checks the request origin against `APP_ALLOWED_ORIGINS` and stores the random `state` plus PKCE verifier server-side in `google_oauth_requests`.
  2. The function's GET callback only redirects to `{app_origin}/google/callback` with `code` and `state`; it never exchanges the code or serves HTML.
  3. `complete` (JWT) verifies that the state's `user_id` matches the signed-in user, consumes the row, then exchanges the code with the stored verifier.
  4. The function never serves HTML, and all failures are returned as short codes rather than raw Google/Postgres messages.
- Required edge-function env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `APP_ALLOWED_ORIGINS` (comma-separated).
- `OAUTH_STATE_SECRET` is removed; HMAC state signing is no longer used.

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
- Calendar list DayView is the default calendar view (`tinytime:calendar.view`)
- Clock day view (12h AM/PM dial, labeled entry arcs, drag-create, resize handles) is experimental and reachable via the view toggle
- Expandable month overview with per-day project-color arc indicators
- Google Calendar event overlay on clock and list day views
- Reports (date ranges, project filtering, summary stats as cards, per-project duration cards, entries table, CSV export)
- Project CRUD (name/color + delete behavior)
- Idle detection + nudge (Page Visibility API, threshold configurable)
- Command palette (Cmd+K) for navigation, timer control, and entry search

---

## 9) Known Gaps and Cleanup Targets

- Improve dense mobile responsiveness for Calendar and Reports.
- Add test baseline (unit + smoke E2E).
- ~~Accessibility pass (keyboard, focus order, contrast, semantics).~~ ✅ Done — aria-labels, role=alert/status, keyboard context menu.
- Performance pass for heavy calendar/report states.
- ~~Cleanup stale leftovers after feature removals/dependency shifts (e.g. unused build chunking rules).~~ ✅ Done — the app has no manual chunking; Vite splits by import graph.

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
