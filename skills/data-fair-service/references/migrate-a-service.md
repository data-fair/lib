# Migrating a service to the df-dev convention

Reference implementations: the portals, data-fair and catalogs migrations (branch `feat-dev-env` of each repo). Work in a worktree, never on the main checkout. Do not start the env yourself: prepare everything, then ask the user to run `npm run dev-zellij` and validate with them (last section).

## 0. Inventory first (read-only)

Collect before writing anything:

- `.zellij.kdl`: panes, their commands, the footer URL; keep the user's layout (pane positions) unless asked.
- `dev/init-env.sh`: every port variable it writes → `ports` of `dev.json` (`df-dev init-env` also writes `DEV_HOST` and `SSRF_PUBLIC_IPS`). Repo-specific build steps in `dev/worktree.sh` (e.g. `npm -w parquet-writer run build`) → `setup`.
- `package.json` (root and workspaces): `dev-*` scripts, what CI calls (`.github/workflows/*.yml`).
- `docker-compose.yml`: services, profiles, mongo image version, healthchecks, `depends_on`.
- The API config of development (`api/config/development.*`): which URLs point to optional containers (`privateEventsUrl`, `privateAgentsUrl`, `privateRegistryUrl`, `clamav.active`, `privateProcessingsUrl`…).
- The API's health route and base path: where the router is mounted and whether nginx rewrites the prefix (`dev/resources/nginx.conf.template`). The readiness URL targets the process port directly.
- Gitignored local files a worktree needs (`*/config/local-*`).
- References to the old scripts: `grep -rn "init-env\|status.sh\|worktree.sh\|dev/logs\|dev-deps\|dev-api\|dev-ui\|tee " --exclude-dir=node_modules .` (AGENTS.md, CONTRIBUTING.md, tests, `.claude/skills/*`, docs/architecture, CI).

## 1. Dependency and dev.json

```bash
npm install -D @data-fair/lib-dev      # file:../lib…/packages/dev while unpublished; never ship a file: dependency
```

Also require `@data-fair/lib-node` >= 2.16.1 (its events queue goes inactive by itself without the events service, which the `optional` events override relies on) and `@data-fair/lib-types-builder` >= 1.14.5 (atomic writes: build-types no longer restarts a running API).

`dev/dev.json` (data-fair's, trimmed):

```json
{
  "ports": ["NGINX_PORT", "NGINX_PORT2", "DEV_API_PORT", "DEV_UI_PORT", "MONGO_PORT", "EVENTS_PORT", "MOCK_PORT"],
  "panes": {
    "api": { "ready": "http://localhost:${DEV_API_PORT}/api/v1/ping" },
    "ui": { "ready": "http://localhost:${DEV_UI_PORT}/data-fair/" },
    "mock": { "ready": "http://localhost:${MOCK_PORT}/" }
  },
  "url": "http://${DEV_HOST}:${NGINX_PORT}/data-fair/",
  "optional": {
    "events": { "privateEventsUrl": null },
    "clamav": { "clamav": { "active": false } }
  },
  "setup": ["npm -w parquet-writer run build"]
}
```

Pane titles in `panes` must equal the `name` of the panes in `.zellij.kdl`; other panes (the free shell, keep the repo's name for it if it has one) need no entry. A pane without an HTTP endpoint (worker, mock without route) gets `{}`. `${VAR}` in `ready` and `url` resolves any `.env` variable. `optional` values must pass the service's config schema: `null` only where the schema allows it (registry types `privateEventsUrl` as `string`: use `""`). Then `git rm dev/init-env.sh` and run `./node_modules/.bin/df-dev setup` (writes `.env`, runs `setup`, build-types, builds `ui` when `ui/dist/index.html` is missing).

## 2. docker-compose.yml

- Core services (needed for the service to work): remove their `profiles`.
- Optional services: `profiles: [<service name>]`, nothing else (no `test` profile).
- CI starts **every** profile (`docker compose --profile '*' up -d --wait`) and tests every integration; its API / worker still get `NODE_CONFIG=$(./node_modules/.bin/df-dev absent-config)` like the panes (empty when everything runs). Locally only the core runs by default: a test that needs an optional service checks that it answers and skips otherwise (data-fair's `tests/support/optional-services.ts`), so the `@smoke` set and the pre-push gate only need the core, and a developer working on an integration starts its service (`df-dev up <name>`) and runs its tests. Before moving a service to a profile, grep `tests/` for it.
- `wait-deps` waits for every container of the active profiles: `healthy` when it has a healthcheck, `running` otherwise, one-shot containers exited 0.
- Service blocks (mongo 8, ES 8.19.9, simple-directory, nginx…), their healthchecks, memory caps and `depends_on`: copy them from [docker-compose.md](docker-compose.md), the only place they change; the nginx template from [nginx.md](nginx.md).
- One-shot init containers (e.g. `s3-init`) are fine: `wait-deps` and `df-status` treat "exited 0" as done.

## 3. .zellij.kdl (catalogs, without its DEBUG flags)

```kdl
// Dev environment of catalogs, see @data-fair/lib-dev. Agents: npx --no df-dev status | logs <pane> | restart <pane>
layout {
  pane split_direction="vertical" {
    pane name="shell" borderless=true
    pane name="status" command="./node_modules/.bin/df-status" {
      args "--start-deps"
    }
    pane name="bridge" command="./node_modules/.bin/df-agents-bridge" {
      start_suspended true
    }
  }
  pane split_direction="vertical" {
    pane name="ui" command="bash" {
      args "-c" "cd ui && FORCE_COLOR=1 NODE_CONFIG_DIR=../api/config/ exec ../node_modules/.bin/df-mem-cap vite --port $DEV_UI_PORT"
    }
    pane name="api" command="bash" {
      args "-c" "./node_modules/.bin/df-dev wait-deps && export NODE_CONFIG=$(./node_modules/.bin/df-dev absent-config) && cd api && FORCE_COLOR=1 NODE_ENV=development exec ../node_modules/.bin/nodemon -e js,ts,json index.ts"
    }
    pane name="worker" command="bash" {
      args "-c" "./node_modules/.bin/df-dev wait-deps && export NODE_CONFIG=$(./node_modules/.bin/df-dev absent-config) && cd worker && FORCE_COLOR=1 NODE_ENV=development exec ../node_modules/.bin/nodemon -e js,ts,json index.ts"
    }
  }
  pane name="url" size=1 borderless=true command="bash" {
    args "-c" "echo -n -e \"Dev server available at \\e[1;96mhttp://$DEV_HOST:$NGINX_PORT/catalogs/dev\\e[0m\"; exec sleep infinity"
  }
}
```

- `df-dev zellij` exports `.env` (and `COMPOSE_PROFILES` from `--services`) into the session: panes read `$DEV_HOST`, `$NGINX_PORT`… directly.
- `export NODE_CONFIG=…` in **every** pane whose process reads an `optional` key (catalogs' and processings' workers read `privateEventsUrl` too), and only there. That includes the ui pane when vite hashes the API's ui-config and that config reads an optional key (data-fair): otherwise vite and the API compute different `ui-config.js` hashes and every page is blank. A second instance of the same API (registry's `api-upstream`) is another pane with its own env overrides (`PORT=$DEV_UPSTREAM_API_PORT MONGO_URL=… DATA_DIR=…`): env variables mapped in `custom-environment-variables` win over `NODE_CONFIG`.
- The ui pane passes `--port $DEV_UI_PORT` as in the template (the 4 pilots); `vite.config.ts` reads the same variable with `strictPort`, so the flag is redundant but harmless. registry's `vite.config.ts` reads `.env` itself.
- Keep the repo's env vars and DEBUG flags from the old `dev` scripts; drop `mkdir -p dev/logs`, `| tee …`, `| ts …`, `nvm use`.
- Nuxt: `… ../node_modules/.bin/df-mem-cap nuxt dev 2>&1 | cat` (no `exec`).
- Drop any retry around the API command (`node … index.ts || (sleep 2 && touch index.ts)`, data-fair's former `dev/run-api.sh`) and its `--experimental-strip-types` flags: `wait-deps` covers a dependency not up yet, nodemon waits for a file change after a crash, and the retry, run by nodemon through `sh -c`, turned each restart into the next one (API flapping between up and 502).
- A repo on `node --watch` moves to nodemon (rule in SKILL.md): add `nodemon` to the root devDependencies; a script outside a workspace watches its own folder, e.g. portals' `nodemon -e ts --watch dev --exec "node --disable-warning=ExperimentalWarning" dev/ingress-manager.ts` (run from the root, nodemon would otherwise watch the whole repo).
- Parse-check the layout without starting anything: copy it with every `command="…"` replaced by `command="true"`, `zellij --layout <copy> attach -b check`, `zellij -s check action list-panes --json`, then `kill-session` + `delete-session`. With an isolated zellij 0.45, set `ZELLIJ_CONFIG_DIR` to a copy of the config dir: its first run migrates `~/.config/zellij/config.kdl` to a format 0.40 cannot read.

## 4. Scripts, CI, tests, docs

- Root `package.json`: `"dev-zellij": "df-dev zellij"`, `"stop-dev-deps": "docker compose --profile '*' stop"`; remove `dev-deps`, `dev-api`, `dev-ui`, `dev-worker`, `dev-bridge`, `dev-mock` (keep workspace `dev` scripts only if CI uses them).
- Delete `dev/init-env.sh`, `dev/status.sh`, `dev/worktree.sh`, `dev/delete-worktree.sh`, `dev/scripts/log-tee.sh`, `dev/scripts/dev-deps.sh`, `dev/with-memory-cap.sh` (replaced by `df-mem-cap`).
- CI: `./node_modules/.bin/df-dev init-env` instead of `./dev/init-env.sh`; processes started with local binaries, either the workspace `dev` scripts (`./node_modules/.bin/dotenv -- npm -w api run dev &`, processings) or the pane commands themselves (portals, data-fair), never a bare `npx`; each writes `dev/logs/<pane>.log`, tailed when readiness times out and uploaded with `test-results/` on failure (without them a failing run shows only the compose logs).
- `tests/state-setup.ts`: drop the `tail -f dev/logs/…` spawn, and the `state-teardown` project and file that killed it; the "API unavailable" message tells agents `npx --no df-dev logs api` / `npx --no df-dev restart api`.
- Config error messages mentioning `dev/init-env.sh` → `npx --no df-dev setup`.
- AGENTS.md "Dev environment": the command table and the four rules of SKILL.md "Operating a running dev env", the list of optional containers, worktrees via `npx --no df-worktree <branch>` / `npx --no df-worktree-delete <branch>` (branch names: letters, digits, `.`, `_`, `-`, no `/`, and `<repo>_<branch>` at most 60 characters).
- CONTRIBUTING.md install: `npm ci`, `npx --no df-dev setup`, `npm run dev-zellij [-- --services a,b]`.
- `.claude/skills/agents-sim/SKILL.md` and docs/architecture: `status.sh` → `df-dev status`; the bridge pane is suspended until the user presses Enter.
- Commit scope `dev` (add it to `scope-enum` where commitlint enforces one). Run `npm run lint` and `check-types` (or the repo's type ratchet).

## 5. Live validation with the user

Ask the user to start the env, then (agent):

| Check | Expected |
|---|---|
| `npx --no df-dev status` | core containers ✔, optional ones `not started`, every pane running, no "not ready" |
| `npx --no df-dev logs api -n 5` | the API's "listening" line, no crash before it |
| `npx --no df-dev restart api` (and worker) | `ready after …s` |
| `npx --no df-dev up <optional>` then `restart api` | container ✔, config plugged in (no retry loop in the logs) |
| `npm run build-types` while running | 0 restart / `ERR_MODULE_NOT_FOUND` in `logs api` |
| The repo's API tests | same results as on the main checkout |
| RAM (`df-dev status`, `docker stats`) vs the main checkout's session | no npm wrapper, mongo cache max 0.25 GB |
