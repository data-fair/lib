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
  # inside a capped cgroup node sizes its heap from the cap (about half of it: 2.2 GB for 4G),
  # so vite died of a V8 heap OOM long before the cgroup limit; give the heap 3/4 of the cap
  # and leave the rest to native memory (rolldown), unless the caller already chose a size
  if [[ "${NODE_OPTIONS:-}" != *--max-old-space-size* ]]; then
    case "$DEV_MEMORY_MAX" in
      *[Gg]) cap_mb=$(( ${DEV_MEMORY_MAX%[Gg]} * 1024 )) ;;
      *[Mm]) cap_mb=${DEV_MEMORY_MAX%[Mm]} ;;
      *) cap_mb= ;;
    esac
    [ -n "$cap_mb" ] && export NODE_OPTIONS="${NODE_OPTIONS:+$NODE_OPTIONS }--max-old-space-size=$(( cap_mb * 3 / 4 ))"
  fi
  # --collect: otherwise every OOM-killed run leaves a failed scope unit to reset by hand
  exec systemd-run --user --scope --quiet --collect \
    --unit="dev-$(basename "$cmd")-$$" \
    -p MemoryMax="$DEV_MEMORY_MAX" \
    -p MemorySwapMax=0 \
    -- "$cmd" "$@"
fi

exec "$@"
