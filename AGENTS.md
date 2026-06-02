# AGENTS.md

## Commands

```bash
# Dev servers
npm run dev:app          # React app on :5173
npm run dev:landing      # Astro landing site

# Verification (run in this order)
npm run lint                               # ESLint all workspaces
npm --workspace apps/app run typecheck     # tsc --noEmit
npm --workspace apps/app run test          # Vitest unit tests
npm --workspace apps/app run test:e2e      # Playwright E2E

# CI gate (runs on PR to main)
bash scripts/check-context.sh
```

## Architecture

- **Monorepo**: `apps/app` (React+Vite+Supabase SPA) + `apps/landing` (Astro static)
- **Path alias**: `@/*` → `./src/*` in apps/app
- **Data flow**: Components must NOT call `supabase.from()` directly. All DB access goes through `hooks/` or `lib/`.
- **Duration unit**: Seconds. Never use `duration_minutes`.
- **Animation**: Import from `motion/react`, not `framer-motion`. Use tokens from `src/lib/motion.ts`.
- **TypeScript**: Strict mode, no `@ts-ignore`. All source files must be `.ts`/`.tsx`.

## CI gate enforces

The `scripts/check-context.sh` script (runs automatically on PR) checks:
- No `.js`/`.jsx` files in `apps/app/src/` (excluding `__tests__/`)
- No direct `supabase.from()` in `components/`
- No `framer-motion` imports (use `motion/react`)
- No `duration_minutes` references
- Required directories and files exist
- `tsc --noEmit` passes
- `CONTEXT.md` has required sections

## Conventions

- UI primitives: shadcn/Radix components in `src/components/ui/`
- Styling: Tailwind-first. Inline `style` only for truly dynamic values.
- Shared types: `src/types.ts`
- Timer state: `contexts/TimerContext.tsx` + `hooks/useTimer.ts`

## Environment

Copy `apps/app/.env.example` to `apps/app/.env` and fill:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_SUPABASE_FUNCTIONS_URL` (optional)

## Important notes

- **Tailwind CSS v4** uses CSS-based configuration (no `tailwind.config`). App tokens live in `apps/app/src/index.css`; landing tokens in `apps/landing/src/styles/global.css`. Keep them in sync when changing brand colors.
- **Vite config is JS**: `apps/app/vite.config.js` (not `.ts`), but `tsconfig.json` includes it for type checking.
- **Test setup**: Vitest with jsdom, setup file at `src/test/setup.ts`. Unit tests go next to source (`src/lib/__tests__/`). E2E tests go in `tests/e2e/` (currently empty except `.gitkeep`). Playwright runs against `npm run preview` on port 4173.
- **Coverage includes only**: `src/lib/**`, `src/hooks/**`, `src/contexts/**`.
- **localStorage key prefix**: `tinytime:` to match existing convention.
