#!/usr/bin/env bash
# In Claude Code web sessions, prepare the repo so lint/typecheck/test/build work
# from the first turn (pattern from docs/PROCESS.md). No-op outside web
# sessions and never fails the session — every step is best-effort.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

corepack enable >/dev/null 2>&1 || true
pnpm install --frozen-lockfile >/dev/null 2>&1 || pnpm install >/dev/null 2>&1 || true
pnpm nuxt prepare >/dev/null 2>&1 || true
echo "session-start: bootstrap attempted (best-effort)"
