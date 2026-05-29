#!/usr/bin/env bash
# ============================================================================
# scripts/deploy-status.sh — one-shot truth check: is HEAD live?
#
# Compares the commit SHA stamped into bundle/.version (written by polish.py
# and rsynced as /.version on the server) against the local repo's HEAD.
#
# Exit codes:
#   0  → live matches HEAD (clean)
#   1  → drift (live ≠ HEAD, or live unreachable, or polish.py not run yet)
#
# Run from anywhere inside the repo. Designed to be CI-friendly: silent on
# success unless --verbose, loud on drift.
# ============================================================================
set -euo pipefail

LIVE_URL="${LIVE_URL:-https://molly.pealan.dev}"
VERBOSE=0
[[ "${1:-}" == "-v" || "${1:-}" == "--verbose" ]] && VERBOSE=1

repo_root() { git rev-parse --show-toplevel 2>/dev/null; }
ROOT="$(repo_root)"
if [[ -z "$ROOT" ]]; then
    echo "drift: not inside a git repo" >&2
    exit 1
fi

HEAD_SHA="$(git -C "$ROOT" rev-parse HEAD)"
LIVE_SHA="$(curl -fsS --max-time 10 "$LIVE_URL/.version" 2>/dev/null | tr -d '[:space:]' || true)"

if [[ -z "$LIVE_SHA" ]]; then
    echo "drift: $LIVE_URL/.version unreachable or empty (run polish + rsync at least once)" >&2
    exit 1
fi

if [[ "$LIVE_SHA" == "$HEAD_SHA" ]]; then
    [[ $VERBOSE -eq 1 ]] && echo "in sync: $LIVE_URL = HEAD (${HEAD_SHA:0:12})"
    exit 0
fi

# Detect known drift modes: ancestry vs. divergence.
if git -C "$ROOT" merge-base --is-ancestor "$LIVE_SHA" HEAD 2>/dev/null; then
    behind="$(git -C "$ROOT" rev-list --count "$LIVE_SHA..HEAD")"
    echo "drift: live is $behind commit(s) behind HEAD" >&2
    echo "       live=${LIVE_SHA:0:12}  HEAD=${HEAD_SHA:0:12}" >&2
elif git -C "$ROOT" cat-file -e "$LIVE_SHA^{commit}" 2>/dev/null; then
    echo "drift: live and HEAD diverged" >&2
    echo "       live=${LIVE_SHA:0:12}  HEAD=${HEAD_SHA:0:12}" >&2
else
    echo "drift: live SHA $LIVE_SHA is not in this repo (deployed from elsewhere?)" >&2
fi
exit 1
