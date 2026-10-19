#!/usr/bin/env bash
# Status pane of the zellij layout: containers (like `docker compose up --wait`) and one RAM line,
# refreshed every 3 s. Plain bash + awk on purpose: it runs all day in every session, a node
# process would hold ~55 MB for this. Agents use the one-shot `df-dev status` instead.
# Usage (from the repo root): df-status [--start-deps] [--once]
set -uo pipefail

start_deps=false
once=false
for arg in "$@"; do
  case "$arg" in
    --start-deps) start_deps=true ;;
    --once) once=true ;;
  esac
done

session=$(basename "$PWD")
up_status=$(mktemp)
# services the background `docker compose up` will start: shown as waiting until it returns
up_pending=$(mktemp)
trap 'rm -f "$up_status" "$up_pending"' EXIT

# the status pane is the one that starts the containers: in the background, so the view shows them coming up
if [ "$start_deps" = true ]; then
  docker compose config --services > "$up_pending" 2>/dev/null
  ( docker compose up -d >/dev/null 2>"$up_status.err"; code=$?; [ "$code" -ne 0 ] && echo "docker compose up failed ($code): $(tail -1 "$up_status.err")" > "$up_status"; rm -f "$up_status.err"; : > "$up_pending" ) &
fi

if [ -n "${NO_COLOR:-}" ]; then G=; Y=; R=; D=; N=; else G=$'\e[32m'; Y=$'\e[33m'; R=$'\e[31m'; D=$'\e[2m'; N=$'\e[0m'; fi

# the compose file does not change while the session runs: parse it once, not every 3 s
services=$(docker compose --profile '*' config --services 2>/dev/null | sort)

render() {
  local ps names stats procs
  ps=$(docker compose ps -a --format '{{.Service}}\t{{.State}}\t{{.Health}}\t{{.ExitCode}}\t{{.Name}}' 2>/dev/null)
  names=$(printf '%s\n' "$ps" | awk -F'\t' '$2 == "running" { print $5 }')
  stats=""
  # shellcheck disable=SC2086
  [ -n "$names" ] && stats=$(docker stats --no-stream --format '{{.Name}}\t{{.MemUsage}}' $names 2>/dev/null)
  procs=$(ps -u "$(id -u)" -o pid=,ppid=,rss=,args= 2>/dev/null)

  [ -s "$up_status" ] && printf '%s%s%s\n\n' "$R" "$(cat "$up_status")" "$N"

  # data goes through the environment: awk -v would interpret the backslashes of the ps arguments
  S_SERVICES="$services" S_PS="$ps" S_STATS="$stats" S_PROCS="$procs" S_PENDING="$(cat "$up_pending")" \
  awk -F'\t' -v G="$G" -v Y="$Y" -v R="$R" -v D="$D" -v N="$N" -v session="$session" -v self="$$" '
    function kib(v,   n, u) {
      n = v + 0; u = v; sub(/^[0-9.]+ */, "", u)
      if (u == "GiB") return n * 1048576; if (u == "MiB") return n * 1024; if (u == "KiB") return n
      if (u == "GB") return n * 976562.5; if (u == "MB") return n * 976.5625; if (u == "kB") return n * 0.9765625
      return 0
    }
    function human(k) { return k >= 1048576 ? sprintf("%.1fG", k / 1048576) : sprintf("%dM", k / 1024 + 0.5) }
    BEGIN {
      services = ENVIRON["S_SERVICES"]; ps = ENVIRON["S_PS"]; stats = ENVIRON["S_STATS"]; procs = ENVIRON["S_PROCS"]
      nps = split(ps, rows, "\n")
      for (i = 1; i <= nps; i++) if (split(rows[i], f, "\t") >= 5) { state[f[1]] = f[2]; health[f[1]] = f[3]; code[f[1]] = f[4]; cname[f[1]] = f[5]; if (f[2] == "running") running = 1 }
      npe = split(ENVIRON["S_PENDING"], pe, "\n")
      for (i = 1; i <= npe; i++) pending[pe[i]] = 1
      nst = split(stats, srows, "\n")
      for (i = 1; i <= nst; i++) if (split(srows[i], f, "\t") >= 2) { split(f[2], m, " / "); mem[f[1]] = m[1] }

      nsv = split(services, svc, "\n")
      for (i = 1; i <= nsv; i++) {
        s = svc[i]; if (s == "") continue
        if (!(s in state)) { printf "%s· %-18s not started%s\n", D, s, N; continue }
        st = state[s]; h = health[s]; text = (h != "" ? h : st)
        # a one-shot init container (s3-init) that completed, unless the whole stack is down: a stopped mongo exits with 0 too
        if (st == "exited" && code[s] == "0" && running) { printf "%s✔%s %-18s %sdone%s\n", G, N, s, G, N; continue }
        if (st == "exited" && code[s] == "0") { printf "%s· %-18s stopped%s\n", D, s, N; continue }
        if (st != "running" && (s in pending)) { printf "%s⠿%s %-18s %swaiting%s\n", Y, N, s, Y, N; continue }
        if (st == "exited") text = "exited " code[s]
        if (text == "healthy" || (st == "running" && h == "")) { c = G; mark = "✔" }
        else if (text == "starting" || st == "restarting" || st == "created") { c = Y; mark = "⠿" }
        else { c = R; mark = "✘" }
        k = (cname[s] in mem) ? kib(mem[cname[s]]) : 0
        containers += k
        line = sprintf("%s%s%s %-18s %s%-11s%s %s", c, mark, N, s, c, text, N, (k ? human(k) : ""))
        sub(/ +$/, "", line); print line
      }

      # dev servers: descendants of this session zellij server, without this status script
      npr = split(procs, prows, "\n")
      for (i = 1; i <= npr; i++) {
        if (split(prows[i], f, " ") < 4) continue
        pid[i] = f[1]; ppid[i] = f[2]; rss[i] = f[3]
        if (prows[i] ~ / --server / && prows[i] ~ ("/" session "$")) server = f[1]
      }
      if (server != "") {
        insession[server] = 1; out[self] = 1
        do {
          grew = 0
          for (i in pid) {
            if (!(pid[i] in insession) && (ppid[i] in insession)) { insession[pid[i]] = 1; grew = 1 }
            if (!(pid[i] in out) && (ppid[i] in out)) { out[pid[i]] = 1; grew = 1 }
          }
        } while (grew)
        for (i in pid) if (pid[i] != server && (pid[i] in insession) && !(pid[i] in out)) devservers += rss[i]
      }
      printf "\nRAM  containers %s · dev servers %s · total %s\n", human(containers), human(devservers), human(containers + devservers)
    }'
}

while true; do
  view=$(render)
  # also clear the scrollback, or the pane history grows by a screen every refresh
  printf '\e[H\e[2J\e[3J%s\n' "$view"
  [ "$once" = true ] && exit 0
  sleep 3
done
