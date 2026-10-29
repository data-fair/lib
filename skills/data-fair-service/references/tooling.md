# Tooling reference for a data-fair service

The shared values every service converges to. Apply them in the service branch as one `chore` tooling commit, its body listing each item (see SKILL.md for the commit layout). When a repo differs, check "Legitimate differences" before flattening it, and leave every item of "Not decided" as it is.

## Reference values

| Item | Value | Why |
|---|---|---|
| eslint | latest major (`eslint ^10`), `neostandard ^0.14` called as `neostandard({ ts: true })` | neostandard 0.14 is the first release accepting eslint 10; portals already runs it |
| Shared rules | `...dfLibRecommended` from `@data-fair/lib-utils/eslint/recommended.js`, `@data-fair/lib-utils` in the root devDependencies | the only eslint config lib provides |
| Root eslint config | `[{ ignores: ['ui/', '**/.type/', 'data/', …generated files] }, ...dfLibRecommended, ...neostandard({ ts: true })]` | the 8-line shape most repos already have; `node_modules` is ignored by default |
| ui eslint config | `dfLibRecommended` + `pluginVue.configs['flat/recommended']` + `pluginVuetify.configs['flat/recommended-v4']` + a `**/*.vue` block with `parser: '@typescript-eslint/parser'` + `neostandard({ ts: true })`; ignores `['dist/*', 'dts/*', 'src/components/vjsf/*']` | every UI runs Vuetify 4 |
| ui eslint rules off | after `neostandard`: `vue/multi-word-component-names`, `vue/require-default-prop` and `no-undef` off, copied in each repo's `ui/eslint.config.mjs`, **not** shared through lib | file-based routing names pages with one word (`index.vue`, `dev.vue`); `no-undef` does not know the auto-imports, which vue-tsc already checks; optional props without a default are fine in `<script setup>`. `recommended.js` also serves APIs without Vue, and a dedicated Vue export would make lib-utils depend on the Vue plugins for 3 lines |
| Lint dependencies | `eslint`, `neostandard`, `eslint-plugin-vue`, `eslint-plugin-vuetify`, `@data-fair/lib-utils`, `typescript` in the **root** devDependencies | one copy of each plugin, no "cannot redefine plugin" |
| Dependency placement | a runtime dependency of a node process goes in the `dependencies` of the workspace that imports it (`api/`, `worker/`); the UI's go in `ui/` (vite bundles them, only `ui/dist` reaches the image); tooling and test helpers (lint, types, playwright, axios, ws, jose…) in the root `devDependencies`; root `dependencies` only for what a Docker build stage runs from the root (events: `@data-fair/lib-types-builder` for `build-types`) | the image installs `npm ci -w api --omit=dev`: a runtime dependency declared at the root, or as a devDependency, passes every test and breaks only the image |
| commitlint | `@commitlint/cli` + `@commitlint/config-conventional` (same major), config `commitlint.config.ts`: `export default { extends: ['@commitlint/config-conventional'] }` | config-conventional everywhere; **only portals keeps its `scope-enum`** (its release notes are generated from scopes) |
| `.husky/commit-msg` | `npx --no -- commitlint --edit "$1"` | `--edit ""` lints the stale `COMMIT_EDITMSG` on merges instead of `MERGE_MSG` |
| `.husky/pre-commit` / `pre-push` | `npm run lint` / `bash dev/pre-push.sh` (type check, unit tests, the `@smoke` set, the changed spec files) | the full suite runs in CI on pull requests, releases and the nightly (data-fair's model, #623) |
| Nightly workflow | only data-fair, portals and simple-directory (biggest, most sensitive), without retries; its e2e tests run on one engine per night, chromium / firefox / webkit in turn (days since epoch % 3, `TEST_BROWSER` read by `playwright.config.ts`, a `browser` input of `reuse-quality.yml` with the browser cache keyed per engine); a scheduled night is skipped when this master commit already passed a scheduled night on that engine | the others' PR runs are enough; pull requests stay on chromium, so a firefox / webkit-only failure never blocks an unrelated PR; Playwright's webkit on Linux stands in for Safari |
| CI test jobs | split (by Playwright project, then `--shard`) only when a job goes over ~10 min; a `docker compose --profile '*' logs` step `if: failure()` before the services stop. Before measuring, check that no project depends on another without need: `--project=X` also runs X's dependencies (`npx playwright test --project=X --list` shows them), simple-directory's `unit` and in-process projects depended on `api` and its single job ran the api suite 3 times. Adding e2e to a CI that never ran them: run them once on a cold vite (empty `ui/node_modules/.vite`, ui restarted) and add an `e2e-warmup` project when a first visit times out | each job pays npm ci, the build artifact and the compose stack again; the uploaded `dev/logs/` only holds the node processes, a container that dies at startup leaves no other trace |
| CI tests | every PR and release runs unit, api **and e2e** (chromium installed by `npx playwright install --with-deps chromium`, `~/.cache/ms-playwright` cached on the playwright version, `install-deps` on a cache hit; catalogs' `reuse-quality.yml`) | a service whose CI skipped e2e (events) shipped UI regressions only the pre-push could catch |
| Playwright config | `trace: 'retain-on-failure'`, `screenshot: 'only-on-failure'`, reporter `[['dot'], ['json', { outputFile: 'dev/logs/test-timings.json' }]]`, `timeout: 30_000` with `test.slow()` on heavy specs, `retries: process.env.CI ? 1 : 0`; `test` / `test-unit` / `test-api` / `test-e2e` scripts without `--max-failures`, `test-api-fast` keeps it to iterate | the trace of the failing run is kept, the timings size the `@smoke` set |
| e2e login fixture | catalogs' `tests/fixtures/login.ts`: sessions from simple-directory's API (`POST /api/auth/password` + its callback, one login per user and worker, renewed after 10 min), `localStorage['sd-keepalive']` set in the future, the api (and worker) pane logs attached on a failure through `df-dev logs` | the login form is slow and lib-vue's keepalive rotates the single-use exchange token the tests share (401 on a later page) |
| vite in e2e | `optimizeDeps.noDiscovery: true`, only the commonjs dependencies in `include` with their exact import specifier; validated on an empty `ui/node_modules/.vite`: every route loads once, no console error | a dependency discovered while browsing reloads the page in the middle of an assertion on a cold run |
| Test layout | specs in `tests/features/<feature>/<name>.<unit\|api\|e2e>.spec.ts`; setups (`state-setup.ts`, `e2e-warmup.ts`), `fixtures/`, `support/` at the root of `tests/` | the projects match on the suffix, the folder groups a feature's three levels |
| Test pyramid | decision logic in a pure `operations.ts` function with unit tests, not an api test seeding state to watch it (events' webhook retry cutoff); wait with `expect.poll` on the observable state, never a fixed sleep (except to prove nothing comes); a server a test opens (webhook target, mock) listens on port 0 and the test reads its url | events' api suite spent 32 s of 49 s in 8 s sleeps; fixed ports collide when two worktrees run their tests at the same time |
| husky | `husky ^9`, `"prepare": "husky \|\| true"` | |
| tsconfig (root) | the common block + `"erasableSyntaxOnly": true` | services run `.ts` through Node's type stripping, which fails at runtime on enums and parameter properties; 0 new errors measured on 6 repos |
| tsconfig `"types"` | `"types": ["node"]` only in a tsconfig that type-checks code using Node globals or `node:` modules, directly or through imports: the root (API) one, or a `ui/tsconfig.json` whose imports reach API code (catalogs' UI imports reach `api/src/config.ts`, which uses `node:path` and `node:os`); not in a UI tsconfig that only sees browser code | TS 6 no longer loads every `@types/*` package by default, so these fail with TS2591 ("add 'node' to the types field"); keeping Node types out of browser-only code catches `process`/`Buffer` used by mistake in the UI |
| `check-types` | `tsc && npm -w ui run check-types` (+ other front workspaces, e.g. portals' `portal`); `vue-tsc` in ui | 5 repos never type-checked their UI; **fix every UI type error in the branch** (no ratchet) |
| CI order | `npm ci` → `lint` → `build-types` → `npm -w ui run build` → `check-types` → env init (`./node_modules/.bin/df-dev init-env`) → deps → tests → `npm audit --omit=dev --audit-level=critical` | vue-tsc needs the `.d.ts` files the UI build generates. Where the tests get their own job(s), a `build` job uploads the generated files (`.type`, `ui/dist`, `ui/dts`) as an artifact for a `static` job (lint, check-types, audit, unit) and the test job(s); one job for everything is fine while it stays under ~10 min (processings). The `static` job has no `.env` and no containers: `unit` goes there only if `npx playwright test --project=unit` passes in a checkout without `.env` and without the compose stack, else it runs in a tests job (simple-directory: its config refuses to load without `DEV_API_PORT`, and its unit specs use mongo and ldap) |
| Node version | **minimum 24.22.1** for `.nvmrc`, the Docker base (`node:24.x-alpine…`, `apk upgrade --no-cache` in `base`) and `engines` (`"node": ">=24.22.1"`); never go below it | 24.22.1 fixes CVE-2026-111497 (Node2Shell, brotli decompression); `nvm use 24` would pick whatever older 24.x is installed |
| Repo-specific choices | a repo that deviates (exact pin, other alpine, higher floor) explains why in its own repo, next to the line (Dockerfile comment) or in CONTRIBUTING.md (`.nvmrc` takes no comment); read it before changing a version | exceptions listed here went stale; the repo's own note changes with its code |
| Dockerfile runtime | `ENV NODE_ENV=production`, npm/npx/corepack/yarn removed; a minimal `.dockerignore` (`**/node_modules`, `**/dist`, `ui/dts`, `.env`, `data`, `.git`) when the Dockerfile copies whole folders (`ADD ui ui`): otherwise a local build ships the developer's node_modules / stale dist | see "Legitimate differences" for npm and `USER node` |
| `.gitignore` (root) | the ordered template below; already tracked `docs/superpowers` plans are removed with `git rm --cached`; drop entries nothing produces any more (check before removing) | today several are ignored only by the maintainer's global git ignore |
| `ui/.gitignore` | the Vite template + `dts` | generated `.d.ts` are never committed (see architecture-conventions.md) |
| Scripts | `"lint": "eslint . && npm -w ui run lint"`, `"lint-fix"` mirrored, `"quality"` in the CI order | |

## Root .gitignore template

```gitignore
# dependencies and generated code
node_modules/
.type/

# local environment and data
.env
**/config/local-*
data/
dev/logs/

# test output
test-results/
playwright-report/

# agent working files
docs/superpowers/
.superpowers/
.playwright-mcp/

# <repo>
<entries only this repo produces: /ui/dist/, /tmp, /simulations/tmp/, .vscode…>
```

## Legitimate differences (do not flatten)

- Extra workspaces in `lint` / `check-types`: portals' `portal` (Nuxt), data-fair's `parquet-writer`.
- data-fair keeps `check-types-ratchet` in `quality` (1800+ legacy API errors) until its baseline reaches 0.
- processings keeps npm in both runtime images, api and worker (lib-node-registry runs `npm rebuild` on plugins); it only drops corepack and yarn.
- `USER node` stays commented where volumes are mounted as root (data-fair, processings, openapi-viewer, customers, metrics daemon).
- metrics tests with `node --test`; openapi-viewer's `quality` runs only `test-unit`.
- customers runs on GitLab CI.

## Not decided (leave as is)

TypeScript major (6), GitHub Actions majors, `USER node`, CI calling `npm run quality` instead of explicit steps, Playwright lint rules from test-suites.
