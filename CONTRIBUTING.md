# Contributing to @data-fair/lib

`@data-fair/lib` is the shared library consumed by every service in the Data FAIR stack
(data-fair, portals, simple-directory, events, processings…). It is an npm-workspaces
monorepo. Each workspace under `packages/` is published independently to npm in the
`@data-fair` namespace with the `lib-` prefix (e.g. `@data-fair/lib-utils`,
`@data-fair/lib-vue`).

For *what* each package does and usage examples, see each package README (`packages/<dir>/README.md`, indexed in [`README.md`](./README.md)). This
document is about *contributing* — building, testing, and developing the lib itself.

## Repository layout

Workspaces are declared in the root `package.json` (`workspaces`). Each lives in
`packages/<dir>` and publishes under the name below.

| Directory                  | Package name                     | Purpose |
| -------------------------- | -------------------------------- | ------- |
| `packages/utils`           | `@data-fair/lib-utils`           | Dependency-less / dependency-light utility functions (e.g. `clone`, `json-schema`). |
| `packages/validation`      | `@data-fair/lib-validation`      | Small validation utils, mostly wrapping ajv (with `ajv-i18n`). |
| `packages/common-types`    | `@data-fair/lib-common-types`    | Shared json schemas and the built type definitions used across the stack. |
| `packages/types-builder`   | `@data-fair/lib-types-builder`   | Tool that processes json schemas to produce types, validation functions and resolved schemas. Ships the `df-build-types` bin. |
| `packages/node`            | `@data-fair/lib-node`            | Server-side Node.js utilities (observer/metrics, ws, upgrade-scripts, fs…). |
| `packages/express`         | `@data-fair/lib-express`         | Express middlewares and helpers (session, async handler, ws-server…). |
| `packages/vue`             | `@data-fair/lib-vue`             | Composables and utilities for Vue 3 applications (e.g. `useSession`, ws). |
| `packages/vuetify`         | `@data-fair/lib-vuetify`         | UI components built on Vuetify. |
| `packages/processing-dev`  | `@data-fair/lib-processing-dev`  | Utilities for the development environment of a processing. |
| `packages/dev`             | `@data-fair/lib-dev`             | Dev environment tooling of the services (`df-dev`, `df-worktree`, `df-mem-cap`, `df-status`). |

## Prerequisites

- Node.js — `>=22.6` (root `package.json` `engines`, needed by `--experimental-strip-types`); `.nvmrc` pins **22**.
- npm with workspaces support (bundled with the Node version above).

```bash
nvm use   # picks up .nvmrc (22)
```

## Getting started

```bash
git clone https://github.com/data-fair/lib.git
cd lib
npm ci
npm run build
```

The runtime `.js` and `.d.ts` files are build output and are **gitignored** (`*.d.ts`,
`*.js.map`, `packages/**/*.js`): a fresh checkout contains only the `.ts` sources, and
`npm run build` is the first thing to run.

## Build pipeline

`npm run build` chains three steps (root `package.json` `scripts`):

```jsonc
"build":          "npm run build-types && npm run build-tsc && npm run build-vue-tsc"
"build-types":    "tsc -p tsconfig.build-schemas.json && node --experimental-strip-types packages/types-builder/build.ts"
"build-tsc":      "node --experimental-strip-types scripts/clean-orphans.mts && rm -f packages/*/*.d.ts && tsc -p tsconfig.build.json"
"build-vue-tsc":  "vue-tsc -p tsconfig.build-vue.json"
```

- **`build-types`** — compiles `**/schema.ts` and the files the generator imports
  (`tsconfig.build-schemas.json`), then runs the `types-builder` generator to emit the
  `.type/` artifacts and the `common-types` exports (types, validation, schemas)
  from the json schemas. The generator imports the *compiled* `.js` of other packages
  (`@data-fair/lib-utils/clone.js`, `@data-fair/lib-node/fs.js`…) because the published
  `df-build-types` bin does too: when you add such an import to
  `packages/types-builder/build.ts`, add its source to `tsconfig.build-schemas.json`.
- **`build-tsc`** — removes the build outputs whose source was deleted (`scripts/clean-orphans.mts`,
  or `npm publish` would ship them) and stale `.d.ts`, then compiles all packages
  (`tsconfig.build.json`, extends `tsconfig.json`, `target: esnext`, `module: nodenext`,
  `strict`, with source maps) to `.js` + `.d.ts`.
- **`build-vue-tsc`** — type-checks/compiles the `vuetify` package with `vue-tsc`
  (`tsconfig.build-vue.json`).

## Testing

Tests are `*.test.ts` files run with the Node.js built-in test runner via
`--experimental-strip-types`. They are preceded by a `pre-test` step that builds the
`types-builder` test fixtures.

Tests import the sibling modules as `./x.js`, i.e. the **built** output: run
`npm run build` after a source change, or the tests run against stale code.

```bash
npm run build && npm test   # pre-test fixtures + run all *.test.ts
npm run test-only           # same, but only tests marked with { only: true } (--test-only)
npm run quality             # build + lint + test, what the pre-push hook and the CI run
```

To run a single file, target it with the same runner flags, e.g.:

```bash
node --experimental-strip-types --test packages/utils/event-promise.test.ts
```

## Linting & type-checking

```bash
npm run lint       # eslint .
npm run lint-fix   # eslint . --fix
```

ESLint uses the flat config `eslint.config.mjs` (built on `neostandard`, TS enabled,
no JSX). Generated and build outputs are ignored (`types/*`, `**/.type/`, `**/*.vue.js`,
`**/*.d.ts`, `packages/**/*.js`). Type-checking happens as part of the build (`tsc` /
`vue-tsc`); there is no separate `check-types` script in this repo.

## Commit conventions

Commits must follow **Conventional Commits** — enforced by commitlint
(`commitlint.config.cjs` extends `@commitlint/config-conventional`) via the husky
`commit-msg` hook.

```
<type>(<optional scope>): <subject>
```

Common types: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`, etc.

Husky hooks (installed by `npm run prepare` / on `npm ci`):

- `commit-msg` → `commitlint --edit "$1"`
- `pre-commit` → `npm run lint`
- `pre-push`   → `npm run quality` (build + lint + test)

Pull requests run the same `npm run quality` in GitHub Actions
(`.github/workflows/pull-requests.yml`).

## Releasing & publishing

Each package is versioned and published **independently and manually**, from `main`.
Follow this for **each** package you changed:

```bash
# 0. Be logged in to npm with publish rights to the @data-fair scope.
npm whoami                    # prints your user; if it errors, run: npm login

# 1. Bump the version and create the release commit.
#    patch = fix · minor = feat · major = breaking.
npm run release vue minor     # -> commit "chore: release lib-vue 1.33.0"

# 2. Push (the pre-push hook runs the quality checks), then publish. prepublishOnly
#    re-runs `npm run quality`, so the tarball is always freshly built. Add --otp if you use 2FA.
git push
npm publish -w packages/vue
```

`npm run release` takes the directory name under `packages/` (`vue`, `node`, `express`…)
and refuses to run outside `main`, on a dirty working tree, or right after a release commit of the same package. The `chore: release lib-<name> <version>`
commit is the only record (per-package releases are **not** git-tagged).

Notes:
- **Which packages to release?** Only the ones whose source you changed. If you changed a
  package that others depend on, bump/release it first, then bump the dependents' version
  range if needed and release them too.
- The legacy `v0.x.x` git tags track the root `@data-fair/lib` version; that root-level
  release scheme has been **dormant since 2024** and is not part of day-to-day releases.

## Developing a lib change against a consumer service

Consumer services (data-fair, portals, simple-directory…) don't depend on the published
lib while you iterate — they use [`relative-deps`](https://www.npmjs.com/package/relative-deps).
A consumer declares a `relativeDependencies` field in its `package.json`, for example
(from portals):

```jsonc
"relativeDependencies": {
  "@data-fair/lib-vue": "../lib/packages/vue",
  "@data-fair/lib-vuetify": "../lib/packages/vuetify"
}
```

`relative-deps` copies the **built** package into the consumer's `node_modules`, so the
lib must be built first. The development loop is:

```bash
# in the lib checkout
npm run build

# in the consumer checkout (data-fair, portals, …)
npx relative-deps
# then restart the consumer's dev server to pick up the new code
```

Notes:

- The conventional path is `../lib` (lib checked out next to the consumer).
- If lib is checked out in a git worktree, point the consumer's `relativeDependencies`
  paths at that worktree instead, e.g.
  `"@data-fair/lib-vue": "../lib_feat-theme-switcher/packages/vue"`.
- Because `relative-deps` copies *built* output, always `npm run build` in lib before
  running `npx relative-deps` — editing only the `.ts` won't be reflected.

## Gotchas recap

- `.js` / `.d.ts` are build output and gitignored — never commit them.
- Tests run against the built `.js`: rebuild before `npm test`.
- `relative-deps` ships built output: rebuild lib before syncing into a consumer.
