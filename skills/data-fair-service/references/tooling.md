# Tooling reference for a data-fair service

The shared values every service converges to. Apply them in the service branch as one `chore` tooling commit, its body listing each item (see SKILL.md for the commit layout). When a repo differs, check "Legitimate differences" before flattening it, and leave every item of "Not decided" as it is.

## Reference values

| Item | Value | Why |
|---|---|---|
| eslint | latest major (`eslint ^10`), `neostandard ^0.14` called as `neostandard({ ts: true })` | neostandard 0.14 is the first release accepting eslint 10; portals already runs it |
| Shared rules | `...dfLibRecommended` from `@data-fair/lib-utils/eslint/recommended.js`, `@data-fair/lib-utils` in the root devDependencies | the only eslint config lib provides |
| Root eslint config | `[{ ignores: ['ui/', '**/.type/', 'data/', …generated files] }, ...dfLibRecommended, ...neostandard({ ts: true })]` | the 8-line shape most repos already have; `node_modules` is ignored by default |
| ui eslint config | `dfLibRecommended` + `pluginVue.configs['flat/recommended']` + `pluginVuetify.configs['flat/recommended-v4']` + a `**/*.vue` block with `parser: '@typescript-eslint/parser'` + `neostandard({ ts: true })`; ignores `['dist/*', 'dts/*', 'src/components/vjsf/*']` | every UI runs Vuetify 4 |
| Lint dependencies | `eslint`, `neostandard`, `eslint-plugin-vue`, `eslint-plugin-vuetify`, `@data-fair/lib-utils`, `typescript` in the **root** devDependencies | one copy of each plugin, no "cannot redefine plugin" |
| commitlint | `@commitlint/cli` + `@commitlint/config-conventional` (same major), config `commitlint.config.ts`: `export default { extends: ['@commitlint/config-conventional'] }` | config-conventional everywhere; **only portals keeps its `scope-enum`** (its release notes are generated from scopes) |
| `.husky/commit-msg` | `npx --no -- commitlint --edit "$1"` | `--edit ""` lints the stale `COMMIT_EDITMSG` on merges instead of `MERGE_MSG` |
| `.husky/pre-commit` / `pre-push` | `npm run lint` / `bash dev/pre-push.sh` (type check, unit tests, the `@smoke` set, the changed spec files) | the full suite runs in CI on pull requests, releases and the nightly (data-fair's model, #623) |
| Nightly workflow | only data-fair, portals and simple-directory (biggest, most sensitive), without retries; its e2e tests run on one engine per night, chromium / firefox / webkit in turn (days since epoch % 3, `TEST_BROWSER` read by `playwright.config.ts`, a `browser` input of `reuse-quality.yml` with the browser cache keyed per engine); a scheduled night is skipped when this master commit already passed a scheduled night on that engine | the others' PR runs are enough; pull requests stay on chromium, so a firefox / webkit-only failure never blocks an unrelated PR; Playwright's webkit on Linux stands in for Safari |
| CI test jobs | split (by Playwright project, then `--shard`) only when a job goes over ~10 min; a `docker compose --profile '*' logs` step `if: failure()` before the services stop | each job pays npm ci, the build artifact and the compose stack again; the uploaded `dev/logs/` only holds the node processes, a container that dies at startup leaves no other trace |
| husky | `husky ^9`, `"prepare": "husky \|\| true"` | |
| tsconfig (root) | the common block + `"erasableSyntaxOnly": true` | services run `.ts` through Node's type stripping, which fails at runtime on enums and parameter properties; 0 new errors measured on 6 repos |
| tsconfig `"types"` | `"types": ["node"]` only in a tsconfig that type-checks code using Node globals or `node:` modules, directly or through imports: the root (API) one, or a `ui/tsconfig.json` whose imports reach API code (catalogs' UI imports reach `api/src/config.ts`, which uses `node:path` and `node:os`); not in a UI tsconfig that only sees browser code | TS 6 no longer loads every `@types/*` package by default, so these fail with TS2591 ("add 'node' to the types field"); keeping Node types out of browser-only code catches `process`/`Buffer` used by mistake in the UI |
| `check-types` | `tsc && npm -w ui run check-types` (+ other front workspaces, e.g. portals' `portal`); `vue-tsc` in ui | 5 repos never type-checked their UI; **fix every UI type error in the branch** (no ratchet) |
| CI order | `npm ci` → `lint` → `build-types` → `npm -w ui run build` → `check-types` → env init (`./node_modules/.bin/df-dev init-env`) → deps → tests → `npm audit --omit=dev --audit-level=critical` | vue-tsc needs the `.d.ts` files the UI build generates. Where the tests get their own job(s), a `build` job uploads the generated files (`.type`, `ui/dist`, `ui/dts`) as an artifact for a `static` job (lint, check-types, audit, unit) and the test job(s); one job for everything is fine while it stays under ~10 min (processings) |
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

TypeScript major (6), GitHub Actions majors, `USER node`, CI calling `npm run quality` instead of explicit steps, sharing more eslint config through lib, Playwright lint rules from test-suites.
