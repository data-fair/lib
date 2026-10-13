---
name: data-fair-service
description: Use when working on the dev environment or the shared architecture of a data-fair service (data-fair, portals, catalogs, processings, events, simple-directory, registry, agents…) - migrating a repo to @data-fair/lib-dev / df-dev, editing .zellij.kdl, dev/dev.json, docker-compose dev services or profiles, init-env, worktree scripts, status or log panes, an agent needing a service's logs, status or a restart, a crash at dev startup, build-types restarting the API, RAM of dev stacks, or a convention shared by services (ping route, BUILD.json, admin routes, /v1 prefix, vite.config, generated .d.ts, /dev pages).
---

# data-fair service: dev environment and shared conventions

## Overview

Every service runs the same dev environment: a zellij (>= 0.44) session per checkout, readable by humans, operated by agents only through `df-dev` (package `@data-fair/lib-dev`). The repo declares what is specific to it in `dev/dev.json` and `.zellij.kdl`; everything else (ports, setup, status, logs, restart, worktrees) comes from the package. **RAM is the scarce resource**: nothing in a pane may hold memory it does not need.

Package reference: `packages/dev/README.md` in data-fair/lib. Full migration recipe with templates: [references/migrate-a-service.md](references/migrate-a-service.md). Architecture conventions, settled and open: [references/architecture-conventions.md](references/architecture-conventions.md). Tooling (eslint, commitlint, husky, tsconfig, CI, Docker, .gitignore): [references/tooling.md](references/tooling.md). Dev docker-compose (service blocks, mongo/ES versions, shared dev secrets, maildev): [references/docker-compose.md](references/docker-compose.md), the only place where those versions change. Dev nginx template (shared head, the 3 location shapes, per-repo deviations): [references/nginx.md](references/nginx.md).

When aligning a service: one branch per service, a handful of commits: `chore(dev)` dev environment, `chore` shared tooling and conventions (lint, commitlint, tsconfig, gitignore, node, CI order, vite template), `build(docker)` images, then one `fix` per bug that could be cherry-picked alone; list the details in each commit body (lines ≤ 100 characters).

## Operating a running dev env (agents)

The user starts the session (`npm run dev-zellij`). An agent never starts or kills it.

| Need | Command |
|---|---|
| What runs, what is broken | `npx --no df-dev status` (containers, panes running / exited / **not ready**, memory) |
| A process's output | `npx --no df-dev logs <pane> -n 100` |
| Restart one process | `npx --no df-dev restart <pane>`: Ctrl+C, rerun, waits for the pane's readiness URL |
| An optional container | `npx --no df-dev up <service>` / `down <service>`, then `restart api` so the config sees it |

- Read the logs before restarting: nodemon, vite and nuxt already reload on file changes.
- "not ready" from `restart` → report to the user with the logs, never retry in a loop.
- Never `docker compose restart`, `kill`, `zellij action`, nor `npm ci` / `npm install` while the env runs (watchers restart on half-installed modules).
- Always `npx --no`: a bare `npx df-dev` downloads an unrelated public package when the dependency is missing (dependency confusion). Scripts and CI call `./node_modules/.bin/df-dev`.

## Rules for the env itself (and why)

| Rule | Why |
|---|---|
| Panes run their command directly (`exec node …`, `exec ../node_modules/.bin/nodemon …`), never `npm run …` | Each idle npm parent holds ~67 MB; a session had 9 (~600 MB) |
| Node processes (api, worker, side scripts) restart with nodemon: `exec ../node_modules/.bin/nodemon -e js,ts,json index.ts` from the process's own folder, with a `nodemon.json` next to it (`"execMap": { "ts": "node" }`, `"ignoreRoot": []`, `"ignore": ["node_modules/", …generated or data folders]`), `nodemon` in the root devDependencies; never `node --watch` | `node --watch` follows every imported file and cannot narrow it (`--watch-path` has no exclusion and no extension filter); nodemon watches the folder it runs in, filters extensions, takes `--ignore` when a generated folder must not restart the process, and has `--exec` (data-fair runs `sh ../dev/run-api.sh`). Without the `execMap`, nodemon 3 runs `.ts` files with `ts-node` and the pane exits ("ts-node: not found"). One watcher everywhere, one set of docs. The team dropped nodemon for `node --watch` once and came back to it |
| No `tee`, no log files; the pane scrollback is the log | `df-dev logs` reads it; log files grew to 390 MB and lost colors |
| Only the status pane starts containers (`df-status --start-deps`); process panes start with `./node_modules/.bin/df-dev wait-deps &&` | Two panes running `compose up` at once conflict on container names; APIs crashed 2–3 times when started before healthy deps |
| Static panes are bash (`echo …; exec sleep infinity`), the status pane is `df-status` (bash) | A node process for a static line or a 3 s poll costs ~50 MB all day |
| vite and nuxt under `df-mem-cap` | A runaway dev server is killed alone at 4 GB instead of taking the terminal tab down |
| nuxt piped: `nuxt dev 2>&1 \| cat` | In a real terminal nuxt switches to an interactive screen |
| Every pane that should answer HTTP has a `ready` URL in `dev/dev.json`, **checked with curl on the running env** | `restart` and `status` rely on it; a wrong path reports "not ready" forever (portals' Nuxt has `/ping`, not `/`) |
| Core containers (what the service and its tests really use) have no compose profile; each optional one has a profile named after itself; CI starts the core only | À la carte RAM (clamav alone ~1 GB); CI tests what a developer runs; integration tests needing an optional service are reviewed, often a unit test suffices |
| An optional service the API is configured to call gets a `dev.json` `optional` entry whose value **passes the service's config schema** (`null` where the schema allows it, else `""` or `false`: check `api/config/type/schema.json`); every pane whose process reads one of those keys (api, worker…) exports `NODE_CONFIG=$(./node_modules/.bin/df-dev absent-config)` | Otherwise the API retries the absent service in a loop; NODE_CONFIG cannot overwrite a developer's `local-development` file; a value the schema rejects crashes the API at startup |
| mongo: `--wiredTigerCacheSizeGB 0.25` + `mongosh` healthcheck; ES heap `${ES_HEAP:-512m}` + `mem_limit`; versions from [references/docker-compose.md](references/docker-compose.md), never bumped by one service alone | Default cache ceiling is half the RAM minus 1 GB per stack (16 GB measured) |

## Common mistakes

- Copying `nvm use` wrappers into panes: zellij inherits the launching shell's PATH; start it from a shell on the `.nvmrc` version.
- Removing root `dev-*` npm scripts that CI still calls: inline the command in the workflow (with `./node_modules/.bin/…`) or keep the workspace `dev` script.
- Forgetting gitignored local config (e.g. `worker/config/local-development.mjs`) in a new worktree: copy it from the main checkout.
- `commit-msg` rejects scope `dev`: add `dev` to the repo's `scope-enum` and its commit doc.
- A fresh database exposes bugs hidden on old dev DBs (simple-directory's rate-limiter index): note them, do not patch around them in the service.
- Two instances of one API (registry's `api-upstream`): a second pane with its own env (`PORT=…`, `MONGO_URL=…`): environment variables mapped in `custom-environment-variables` win over `NODE_CONFIG` in node-config, so both panes can share the `absent-config` export.
- Inventing an architecture convention: only the settled ones in the reference are rules; ask for the open ones.
