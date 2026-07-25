#!/usr/bin/env bash
# Post-deploy smoke test against a LIVE url (public or in-cluster).
# Checks: GET / → 200 and looks like the SPA shell; the security headers the
# prod nginx is supposed to send are present. Pure curl, no docker needed.
#
# Usage:
#   scripts/smoke.sh https://your-host[/base/]
#   scripts/smoke.sh http://127.0.0.1:8080        # against a local container
#
# Exit 0 = healthy; non-zero = a check failed (prints what).
set -euo pipefail

URL="${1:-}"
if [ -z "$URL" ]; then
  echo "usage: scripts/smoke.sh <base-url>" >&2
  exit 2
fi
URL="${URL%/}"

fail() { echo "SMOKE FAIL: $*" >&2; exit 1; }
warn() { echo "SMOKE WARN: $*" >&2; }

body_file="$(mktemp)"
trap 'rm -f "$body_file"' EXIT

# 1. GET / → 200, and the body looks like the built Nuxt app (not a proxy error).
status="$(curl -fsS --max-time 15 -o "$body_file" -w '%{http_code}' "$URL/")" \
  || fail "GET / failed (curl error or non-2xx; got '$status')"
[ "$status" = "200" ] || fail "GET / returned $status, expected 200"
grep -qi 'nuxt' "$body_file" || fail "GET / body does not look like the app shell (no 'nuxt' marker)"

# 2. Security headers the prod nginx.conf sets (see docker/nginx.conf).
headers="$(curl -fsSI --max-time 15 "$URL/")" || fail "HEAD / failed"
echo "$headers" | grep -qi '^content-security-policy' \
  || warn "no Content-Security-Policy header (expected Report-Only until the enforce flip)"
echo "$headers" | grep -qi '^x-content-type-options: *nosniff' \
  || fail "missing X-Content-Type-Options: nosniff"
echo "$headers" | grep -qi '^referrer-policy' \
  || warn "missing Referrer-Policy"

echo "SMOKE OK: $URL"
