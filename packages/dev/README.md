# @data-fair/lib-dev

Dev environment of a data-fair service, for humans and agents. Needs zellij >= 0.44 and docker compose v2.

## In a service

`dev/dev.json` declares what is specific to the repo:

```json
{
  "ports": ["NGINX_PORT", "DEV_API_PORT", "DEV_UI_PORT", "MONGO_PORT"],
  "panes": { "api": { "ready": "http://localhost:${DEV_API_PORT}/api/ping" } },
  "urls": { "Manager": "http://${DEV_HOST}:${NGINX_PORT}/portals-manager/dev" },
  "optional": { "events": { "privateEventsUrl": "" } }
}
```

- `ports`: names of the port variables written to `.env`, each a free port drawn in 20000-29999, so worktrees never collide. `.env` also gets `DEV_HOST` (`<branch>.localhost`) and `SSRF_PUBLIC_IPS`; `init-env --force` draws them again and keeps the variables added by hand.
- `panes`: zellij pane titles; `ready` is polled by `restart`.
- `urls`: the page to open, the UI's `/dev` page when it has one (its dev navigation bar), printed by `df-dev status` so an agent knows where to point a browser (the footer pane of the layout prints them with a plain `echo`, no node process).
- `setup`: repo-specific commands `df-dev setup` runs before build-types (e.g. `npm -w parquet-writer run build`).
- `optional`: one key per optional compose service (a service with a profile), its value the config overrides to apply **while that service does not run**, e.g. `{ "events": { "privateEventsUrl": "" }, "clamav": { "clamav": { "active": false } } }`: without events the API does not call it. Values must pass the config schema. `df-dev absent-config` merges the overrides of every stopped service; the api pane does `export NODE_CONFIG=$(df-dev absent-config)` (node-config merges it over the config files, no local file to write).
- No key for the UI: `setup` builds the `ui` workspace when `ui/dist/index.html` is missing (the API's serve-spa reads it at startup, and the build generates the auto-import declarations `check-types` needs).

## Commands

| Command | |
|---|---|
| `npx --no df-worktree <branch>` / `npx --no df-worktree-delete <branch> [-f]` | from the main checkout: create `../<repo>_<branch>` (npm ci + setup) / delete it with its containers, volumes and zellij session; branch names: letters, digits, `.`, `_`, `-`, at most 60 chars, no `/` |
| `npx --no df-dev setup` | first install / new worktree: `.env` if missing, `setup` commands, build-types, the `ui` build when `ui/dist/index.html` is missing |
| `npx --no df-dev init-env [--force]` | `.env` only |
| `npm run dev-zellij -- --services agents,events` | attach or create the session of this worktree (`df-dev zellij`) |
| `npx --no df-dev status` | for agents: containers, panes (running / exited / not ready), dev processes, memory |
| `df-status [--start-deps]` | the status pane: containers like `compose up --wait` and one RAM line, every 3 s, in bash (~4 MB); `--start-deps` starts the containers first |
| `npx --no df-dev logs <pane> [-n 100]` | last lines of a pane |
| `npx --no df-dev restart <pane>` | Ctrl+C, rerun, wait for readiness |
| `npx --no df-dev up <service…>` / `down <service…>` | optional compose services |
| `npx --no df-dev wait-deps` | first command of the panes that need the containers |
| `df-mem-cap <cmd>` | run a dev server under a 4G cgroup cap (`DEV_MEMORY_MAX`) |
