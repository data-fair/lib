# Contributing to @data-fair/lib

`@data-fair/lib` is the shared library consumed by every service in the Data FAIR stack
(data-fair, portals, simple-directory, events, processings…). It is an npm-workspaces
monorepo. Each workspace under `packages/` is published independently to npm in the
`@data-fair` namespace with the `lib-` prefix (e.g. `@data-fair/lib-utils`,
`@data-fair/lib-vue`).

For *what* each package does and usage examples, see [`README.md`](./README.md). This
document is about *contributing* — building, testing, and developing the lib itself.

## Repository layout

Workspaces are declared in the root `package.json` (`workspaces`). Each lives in
`packages/<dir>` and publishes under the name below.

| Directory                  | Package name                     | Purpose |
| -------------------------- | -------------------------------- | ------- |
| `packages/utils`           | `@data-fair/lib-utils`           | Dependency-less / dependency-light utility functions (e.g. `clone`, `json-schema`). |
| `packages/validation`      | `@data-fair/lib-validation`      | Small validation utils, mostly wrapping ajv (with `ajv-i18n`). |
| `packages/common-types`    | `@data-fair/lib-common-types`    | Shared json schemas and the built type definitions used across the stack. |
| `packages/types-builder`   | `@data-fair/lib-types-builder`   | Tool that processes json schemas to produce types, validation and serialization functions. Ships the `df-build-types` bin. |
| `packages/node`            | `@data-fair/lib-node`            | Server-side Node.js utilities (observer/metrics, ws, upgrade-scripts, fs…). |
| `packages/express`         | `@data-fair/lib-express`         | Express middlewares and helpers (session, async handler, ws-server…). |
| `packages/vue`             | `@data-fair/lib-vue`             | Composables and utilities for Vue 3 applications (e.g. `useSession`, ws). |
| `packages/vuetify`         | `@data-fair/lib-vuetify`         | UI components built on Vuetify. |
| `packages/processing-dev`  | `@data-fair/lib-processing-dev`  | Utilities for the development environment of a processing. |

## Prerequisites

- Node.js — `>=20` (root `package.json` `engines`); `.nvmrc` pins **22**, so use 22.
- npm with workspaces support (bundled with the Node version above).

```bash
nvm use   # picks up .nvmrc (22)
```

## Getting started

```bash
git clone https://github.com/data-fair/lib.git
cd lib
npm ci
```

### First build on a fresh checkout (the bootstrap gotcha)

The runtime `.js` files are build output and are **gitignored** (see `.gitignore`:
`*.d.ts`, `*.js.map`, `packages/**/*.js`). A fresh worktree therefore contains only
the `.ts` sources.

Running `npm run build` straight away **fails** at its first step, `build-types`:

```
ERR_MODULE_NOT_FOUND: Cannot find module '.../packages/utils/clone.js'
```

Why: `build` runs `build-types` first, which runs the code generator
`packages/types-builder/build.ts`. That generator imports the *compiled* outputs of
other packages — `@data-fair/lib-utils/clone.js`, `@data-fair/lib-utils/json-schema.js`,
`@data-fair/lib-node/fs.js` — which don't exist yet on a clean checkout. This is a
package-level circular dependency: `build-types` needs the compiled `utils`/`node`
`.js`, while `build-tsc` needs the types that `build-types` generates.

Break the cycle by emitting the runtime `.js` once before the full build:

```bash
npm ci
npm run build-tsc   # bootstrap: emits the runtime .js (clone.js, json-schema.js, fs.js, …).
                    # It EXITS WITH TS ERRORS — missing generated .type/ files and
                    # lib-common-types exports that build-types will produce. This is
                    # EXPECTED on a fresh checkout; tsc still emits the .js. Ignore them once.
npm run build       # now succeeds: build-types runs, then a clean build-tsc + build-vue-tsc + lint
```

After this first bootstrap the `.js` files exist, so subsequent `npm run build` runs
work directly. The main long-lived checkout never hits this because it already has the
built `.js` on disk.

## Build pipeline

`npm run build` chains four steps (root `package.json` `scripts`):

```jsonc
"build":          "npm run build-types && npm run build-tsc && npm run build-vue-tsc && eslint . --fix"
"build-types":    "tsc -p tsconfig.build-schemas.json && node --experimental-strip-types packages/types-builder/build.ts"
"build-tsc":      "rm -f packages/*/*.d.ts && tsc -p tsconfig.build.json"
"build-vue-tsc":  "vue-tsc -p tsconfig.build-vue.json"
```

- **`build-types`** — compiles `**/schema.ts` (`tsconfig.build-schemas.json`), then runs
  the `types-builder` generator to emit the `.type/` artifacts and the
  `common-types` exports (types, validation, serialization) from the json schemas.
- **`build-tsc`** — removes stale `.d.ts`, then compiles all packages
  (`tsconfig.build.json`, extends `tsconfig.json`, `target: esnext`, `module: nodenext`,
  `strict`, with source maps) to `.js` + `.d.ts`.
- **`build-vue-tsc`** — type-checks/compiles the `vuetify` package with `vue-tsc`
  (`tsconfig.build-vue.json`).
- **`eslint . --fix`** — final lint/auto-fix pass.

## Testing

Tests are `*.test.ts` files run with the Node.js built-in test runner via
`--experimental-strip-types`. They are preceded by a `pre-test` step that builds the
`types-builder` test fixtures.

```bash
npm test                  # pre-test fixtures + run all *.test.ts
npm run test-only         # same, but only tests marked with { only: true } (--test-only)
```

To run a single file, target it with the same runner flags, e.g.:

```bash
node --experimental-strip-types --test packages/utils/event-promise.test.ts
```

## Linting & type-checking

```bash
npm run lint     # eslint . --fix
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

- `commit-msg` → `commitlint --edit ""`
- `pre-commit` → `npm run lint`
- `pre-push`   → `npm run quality && npm run build` (`quality` = `eslint . && npm test`)

The `pre-push` hook runs the full lint + test + build, so pushing is slow but guarantees
a publishable state.

## Releasing & publishing

There is **no release automation** (no CI, no `.github/`, no semantic-release). Each
package is versioned and published **independently and manually**. The recipe below is
the whole process — follow it for **each** package you changed.

> Example: publishing a patch of `@data-fair/lib-vue` (in `packages/vue`).

```bash
# 0. Be logged in to npm with publish rights to the @data-fair scope.
npm whoami                    # prints your user; if it errors, run: npm login

# 1. Bump the changed package's version. patch = fix · minor = feat · major = breaking.
#    --no-git-tag-version: we commit ourselves below (npm's default tag/commit isn't used).
#    This edits packages/vue/package.json AND the matching entry in package-lock.json.
npm version patch --workspace=packages/vue --no-git-tag-version

# 2. Sanity-check the diff is ONLY those two files, then commit with the release message.
git diff --stat                                   # expect: packages/vue/package.json + package-lock.json
git commit -am "chore: release lib-vue 1.28.2"    # use the new version npm just wrote

# 3. Push. The pre-push hook runs `quality && build`, so this validates before you publish.
git push

# 4. Publish that one workspace. Its prepublishOnly re-runs `quality && build` and ships
#    only the built files (the package's "files" allow-list). Add --otp if you use 2FA.
npm publish --workspace=packages/vue              # e.g. --otp=123456
```

That's it — the `chore: release lib-vue <version>` commit is the only record (per-package
releases are **not** git-tagged). Repeat steps 1–4 for every package you touched.

Notes:
- **Which packages to release?** Only the ones whose source you changed. If you changed a
  package that others depend on, bump/release it first, then bump the dependents' version
  range if needed and release them too.
- **Why a build runs twice** (pre-push *and* prepublishOnly): both run
  `npm run quality && npm run build` (`quality` = `eslint . && npm test`). Publishing is
  slow but always ships a lint-clean, tested, freshly-built tarball — the gitignored `.js`
  are (re)built at publish time, never committed.
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

- Fresh checkout: run `npm run build-tsc` once (ignore its TS errors) before
  `npm run build`. See [First build](#first-build-on-a-fresh-checkout-the-bootstrap-gotcha).
- `.js` / `.d.ts` are build output and gitignored — never commit them.
- `relative-deps` ships built output: rebuild lib before syncing into a consumer.
