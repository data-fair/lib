#!/usr/bin/env bash
# Run a dev process under a hard memory cap, so a runaway one is killed by its own cgroup
# instead of driving the whole host out of memory. A V8 heap limit is not enough: most of
# vite's memory is rolldown's native memory. No-op where systemd-run is unavailable.
# Usage: df-mem-cap vite --port 5173      (DEV_MEMORY_MAX=4G by default)
set -euo pipefail

: "${DEV_MEMORY_MAX:=4G}"

if command -v systemd-run >/dev/null 2>&1 && [ -n "${XDG_RUNTIME_DIR:-}" ] && [ -S "${XDG_RUNTIME_DIR}/systemd/private" ]; then
  # systemd-run does not see the PATH additions of npm (node_modules/.bin)
  cmd=$(command -v "$1") || { echo "df-mem-cap: command not found: $1" >&2; exit 127; }
  shift
  # --collect: otherwise every OOM-killed run leaves a failed scope unit to reset by hand
  exec systemd-run --user --scope --quiet --collect \
    --unit="dev-$(basename "$cmd")-$$" \
    -p MemoryMax="$DEV_MEMORY_MAX" \
    -p MemorySwapMax=0 \
    -- "$cmd" "$@"
fi

exec "$@"
