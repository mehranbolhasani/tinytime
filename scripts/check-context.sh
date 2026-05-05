#!/usr/bin/env bash
# CONTEXT.md drift guard
# Checks that the codebase still matches the architecture invariants
# documented in CONTEXT.md. Run locally or in CI.
#
# Exit 0 = all checks pass
# Exit 1 = one or more checks failed (details printed to stderr)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
APP_SRC="$REPO_ROOT/apps/app/src"

PASS=0
FAIL=1
status=$PASS

fail() {
  echo "FAIL: $1" >&2
  status=$FAIL
}

pass() {
  echo "ok:   $1"
}

echo "=== CONTEXT.md drift guard ==="
echo ""

# ── 1. No .js / .jsx files in apps/app/src/ ─────────────────────────────────
# TypeScript migration is complete; all production source must be .ts/.tsx.
# __tests__ directories are excluded (test files are migrated separately).
offenders=$(find "$APP_SRC" \( -name "*.js" -o -name "*.jsx" \) \
  ! -path "*/__tests__/*" \
  2>/dev/null | sort)
if [ -n "$offenders" ]; then
  fail "Plain JS/JSX files found in apps/app/src/ (TypeScript-only zone):"
  echo "$offenders" | sed 's/^/  /' >&2
else
  pass "No .js/.jsx files in apps/app/src/ (excluding __tests__)"
fi

# ── 2. No direct Supabase table calls from components/ ──────────────────────
# Components must not call supabase.from() directly; all DB access goes
# through hooks/ or lib/. (App.tsx auth shell is excluded.)
# Match the supabase client variable explicitly to avoid Array.from() false positives.
direct_db=$(grep -rn "supabase\.from(" "$APP_SRC/components/" 2>/dev/null | grep -v "//.*supabase\.from(" || true)
if [ -n "$direct_db" ]; then
  fail "Direct supabase.from() calls found in components/ (move to hooks/ or lib/):"
  echo "$direct_db" | sed 's/^/  /' >&2
else
  pass "No direct supabase.from() calls in components/"
fi

# ── 3. motion/react used in app code (not framer-motion) ────────────────────
framer=$(grep -rn "from 'framer-motion'" "$APP_SRC/" 2>/dev/null || true)
if [ -n "$framer" ]; then
  fail "framer-motion import found — use motion/react instead:"
  echo "$framer" | sed 's/^/  /' >&2
else
  pass "No framer-motion imports (motion/react used correctly)"
fi

# ── 4. Duration base unit is seconds (no duration_minutes) ──────────────────
minutes_field=$(grep -rn "duration_minutes" "$APP_SRC/" 2>/dev/null || true)
if [ -n "$minutes_field" ]; then
  fail "duration_minutes found — duration base unit must be seconds:"
  echo "$minutes_field" | sed 's/^/  /' >&2
else
  pass "duration_minutes absent — seconds invariant holds"
fi

# ── 5. Required directory structure ─────────────────────────────────────────
required_dirs=(
  "contexts"
  "hooks"
  "components/timer"
  "components/calendar"
  "components/calendar/blocks"
  "components/projects"
  "components/reports"
  "components/settings"
  "components/ui"
  "lib"
  "pages"
)
missing_dirs=()
for dir in "${required_dirs[@]}"; do
  if [ ! -d "$APP_SRC/$dir" ]; then
    missing_dirs+=("$dir")
  fi
done
if [ ${#missing_dirs[@]} -gt 0 ]; then
  fail "Required directories missing from apps/app/src/:"
  for d in "${missing_dirs[@]}"; do
    echo "  $d" >&2
  done
else
  pass "All required directories present"
fi

# ── 6. Key files present ────────────────────────────────────────────────────
required_files=(
  "types.ts"
  "lib/supabase.ts"
  "lib/motion.ts"
  "lib/calendar.ts"
  "lib/utils.ts"
  "contexts/TimerContext.tsx"
)
missing_files=()
for f in "${required_files[@]}"; do
  if [ ! -f "$APP_SRC/$f" ]; then
    missing_files+=("$f")
  fi
done
if [ ${#missing_files[@]} -gt 0 ]; then
  fail "Required files missing from apps/app/src/:"
  for f in "${missing_files[@]}"; do
    echo "  $f" >&2
  done
else
  pass "All required files present"
fi

# ── 7. TypeScript compiles clean ─────────────────────────────────────────────
echo ""
echo "Running tsc --noEmit in apps/app ..."
if (cd "$REPO_ROOT/apps/app" && npx tsc --noEmit 2>&1); then
  pass "tsc --noEmit: zero errors"
else
  fail "tsc --noEmit: type errors found (see output above)"
fi

# ── 8. CONTEXT.md is non-empty and contains required section headers ─────────
context_file="$REPO_ROOT/CONTEXT.md"
required_sections=(
  "## 1) Product Scope"
  "## 3) Non-negotiable Implementation Rules"
  "## 4) Current Architecture Map"
  "## 5) Data Model"
  "## 10) Change Management Rule"
)
missing_sections=()
for section in "${required_sections[@]}"; do
  if ! grep -qF "$section" "$context_file" 2>/dev/null; then
    missing_sections+=("$section")
  fi
done
if [ ${#missing_sections[@]} -gt 0 ]; then
  fail "CONTEXT.md is missing required sections:"
  for s in "${missing_sections[@]}"; do
    echo "  $s" >&2
  done
else
  pass "CONTEXT.md contains all required sections"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
if [ $status -eq $PASS ]; then
  echo "All checks passed."
else
  echo "One or more checks failed. Fix the issues above to restore compliance with CONTEXT.md." >&2
fi

exit $status
