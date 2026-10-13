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
| `.husky/pre-commit` / `pre-push` | `npm run lint` / `npm run quality` (full suite kept for now) | maintainer's choice; CI must also run the e2e tests |
| husky | `husky ^9`, `"prepare": "husky \|\| true"` | |
| tsconfig (root) | the common block + `"erasableSyntaxOnly": true` | services run `.ts` through Node's type stripping, which fails at runtime on enums and parameter properties; 0 new errors measured on 6 repos |
| tsconfig `"types"` | `"types": ["node"]` only in a tsconfig that type-checks code using Node globals or `node:` modules, directly or through imports: the root (API) one, or a `ui/tsconfig.json` whose imports reach API code (catalogs' UI imports reach `api/src/config.ts`, which uses `node:path` and `node:os`); not in a UI tsconfig that only sees browser code | TS 6 no longer loads every `@types/*` package by default, so these fail with TS2591 ("add 'node' to the types field"); keeping Node types out of browser-only code catches `process`/`Buffer` used by mistake in the UI |
| `check-types` | `tsc && npm -w ui run check-types` (+ other front workspaces, e.g. portals' `portal`); `vue-tsc` in ui | 5 repos never type-checked their UI; **fix every UI type error in the branch** (no ratchet) |
| CI order | `npm ci` → `lint` → `build-types` → `npm -w ui run build` → `check-types` → env init (`./node_modules/.bin/df-dev init-env`) → deps → tests → `npm audit --omit=dev --audit-level=critical` | vue-tsc needs the `.d.ts` files the UI build generates |
| `.nvmrc` | `24`, unless the repo needs a feature of a later 24.x: then the exact version **and a comment in CONTRIBUTING.md saying which feature** (`.nvmrc` cannot express `^24.21`) | verify each repo that pins one before changing it |
| `engines` | `"node": "v24"` | |
| Docker base | `node:24.21.0-alpine3.24` (or the newest 24 used by the other repos), `apk upgrade --no-cache` in `base` | |
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
- data-fair's base image is alpine3.23 (check its libcrypto / gdal pins before bumping).
- customers runs on GitLab CI.

## Not decided (leave as is)

TypeScript major (6), GitHub Actions majors, `USER node`, CI calling `npm run quality` instead of explicit steps, sharing more eslint config through lib, Playwright lint rules from test-suites, `optimizeDeps.noDiscovery` (enabled per service during live validation only, see architecture-conventions.md).
