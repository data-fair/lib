---
name: migrate-data-fair-processing-to-typescript
description: Use when porting a @data-fair processing plugin from CommonJS/JavaScript to the modern TypeScript+ESM template — repo still has `main: index.js`, `require(...)`, `module.exports`, mocha `test/`, `.eslintrc.js`/`standard`, or lacks `"type": "module"`. Covers Node 24, native `--experimental-strip-types` (no build step), df-build-types, neostandard, husky/commitlint, node:test, typed prepare/run/stop.
---

# Migrate a data-fair processing to TypeScript + ESM

## Overview

data-fair processing plugins run as **native TypeScript on Node 24** via `--experimental-strip-types` — there is **no build/emit step**, `.ts` files are executed and imported directly (imports keep the `.ts` extension). Migration is a mechanical port of a fixed set of files plus a JS→ESM rewrite of the business logic. The canonical template is `processing-hello-world`; the closest real-world reference for download→transform→upload plugins is `processing-majic` (commit `feat!: migrate plugin to TypeScript`).

**All exact file contents live in `file-templates.md` (this skill's folder). Read it before editing.**

## When to use

- A processing repo whose `package.json` has `main: index.js` and no `"type": "module"`.
- Source uses `require()` / `module.exports`, `mocha`, `standard`/`.eslintrc.js`.
- You're asked to "migrate to TypeScript", "align on hello-world", "modernise the plugin".

**Not for:** plugins already on `main: index.ts` + `"type": "module"` (already migrated); non-processing repos.

## Recipe (ordered)

1. **Pick the reference.** Diff the current repo against `processing-hello-world`; for download/transform/upload plugins also open `processing-majic` — mirror its `lib/execute.ts` split. Do NOT invent structure.
2. **package.json** — apply the template changes (`main`, `type: module`, scripts, `imports`, devDeps swap, `files`, license). Keep runtime deps; drop node-builtin shims (`util`, `path`, `iconv-lite` if unused); add `@types/*`. **Never touch `version`** (releases automated).
3. **Config files** — add `tsconfig.json`, `eslint.config.mjs`, `commitlint.config.ts`, `.nvmrc` (`24`), `.husky/{pre-commit,commit-msg,pre-push}`, `.github/workflows/{publish-staging,publish-production}.yml`. Delete `.eslintrc.js`, `.eslintignore`.
4. **config/** — `default.js` → `default.mjs`; convert `local-test.mjs` to `export default`; add `config/type/{schema.ts,index.ts}`.
5. **types/** — add `types/processingConfig/{schema.ts,index.ts}` (types generated from the existing `processing-config-schema.json`).
6. **index.ts** — thin entry exporting typed `prepare`/`run`/`stop` with dynamic `import('./lib/...ts')`. Delete `index.js`.
7. **lib/** — split former `run()` into `lib/prepare.ts` (no-op if no secrets) + `lib/execute.ts`. Port every `lib/*.js` to `.ts` ESM (transforms, schemas, data files, download/process/upload). Wire graceful stop via a `shouldBeStopped` flag in the streaming module.
8. **tests** — `test/test.js` → `test-it/index.ts` (+ optional `*.test.ts`). Delete `test/`.
9. **Generate types & validate** — `npm i` then `npm run build-types`, `npm run lint`, `npm test`. `.type/` dirs are generated — confirm they are gitignored.

## Multi-variant plugins (more than one transform/schema)

The reference (`majic`) has ONE transform. Many plugins (e.g. `transform-csv`) dispatch on a config field to **several parallel data-file families**: `lib/transforms/<type>.ts`, `lib/schemas/<type>.ts`, `lib/extensions/<type>.ts`, plus per-type `headers/*.json`. Rules:

- Port each `require('./transforms/' + type + '.js')` → `(await import('./transforms/' + type + '.ts')).default`. Same for schemas/extensions.
- **Conditional data files loaded at upload/create time** (schema, extensions — only when the file exists AND `datasetMode === 'create'`) keep their guard, but resolve the path with **`import.meta.dirname`**, not a cwd-relative `'./lib/...'` string — the check now runs from inside `lib/`:
  ```ts
  const schemaFile = path.join(import.meta.dirname, 'schemas', type + '.ts')
  if (fs.existsSync(schemaFile) && processingConfig.datasetMode === 'create') {
    const schema = (await import('./schemas/' + type + '.ts')).default
  }
  ```
- Thread values the upload needs (e.g. `processingId` for `extras`) explicitly through the function signature — the template's `execute`/`upload` don't.
- `import x from './headers/x.json' with { type: 'json' }`.

## Gotchas (from real migrations)

| Trap | Correct move |
|---|---|
| Committing generated `.type/` dirs | `.gitignore` them; regenerate with `npm run build-types` |
| Bumping `version` for a "feat!" | Leave `version` alone — releases are automated |
| `require('./x/' + v + '.js')` | `(await import('./x/' + v + '.ts')).default` — dynamic import is async |
| Dropping `.ts` extension in imports | Keep it: `import x from './x.ts'` (NodeNext + allowImportingTsExtensions) |
| cwd-relative `fs.existsSync('./lib/...')` after moving logic into `lib/` | Resolve with `import.meta.dirname` |
| `exec(\`unzip ... ${x}\`)` | `execFile('unzip', ['-o', file, '-d', dir])` — no shell injection |
| Stop mid-run publishes a truncated dataset | In a `pump` chain, in the `Transform` cb: `if (isStopped()) return next()` (drops rows); check `isStopped()` before upload; return early; close fds/streams |
| Changing the output dataset schema | Keep it identical unless that's the explicit goal — live datasets depend on it |
| `@types/pkg` version | Must match the runtime major (`@types/fs-extra@^11` ⇒ `fs-extra@^11`) — bumping the type may force a runtime major bump |
| Heterogeneous transforms typed `any` (trips `no-explicit-any`) | Shared type `type Transform = (item: Record<string, string>) => Record<string, unknown>`; guard regex matches instead of `match![1]` |
| `csv` combined package | Prefer `csv-parse` + `csv-stringify` (proven ESM named exports: `import { parse } from 'csv-parse'`, `import { stringify } from 'csv-stringify'`) |
| Deleting `LICENSE` / mismatched `license` field | Replace `LICENSE` with the AGPL-3.0-only text to match the field — don't delete it, don't leave field and file inconsistent. Copy from `registry/LICENSE` (md5 `4ae09d45`), NOT from `data-fair`/`agents`/`metrics`/`notify` (altered FSF header + `s ue` corruption). See file-templates.md |
| `plugin-config-schema.json` + its test | Template drops both; delete unless it carries real super-admin plugin config |
| Unused non-builtin devDeps (`dayjs`, `draftlog`, `iconv-lite`…) | grep-confirm no usage, then drop (not just `util`/`path` shims) |
| `config` v3 `module.exports` | v4 + `config/default.mjs` `export default` |
| `@stylistic/quote-props` errors on numeric `x-labels` keys (`'1'`, `'2'`) in schema data | `npm run lint-fix` — safe: numeric string keys serialize identically in JSON, and leading-zero keys (`'01'`) stay quoted |
| `camelcase` errors on snake_case **local variables** (e.g. `adresses_complementaires`) | Rename the variable to camelCase, but KEEP snake_case **output object keys** (dataset column keys) unchanged |

## Validation = the test

This is a reference skill; validate by **applying it to a real repo** and running `npm run build-types && npm run lint && npm test`. Any step the skill left ambiguous or any error surfaced there is a skill gap — fix `file-templates.md`/this file, don't just patch the repo. Confirm the migrated plugin still produces the **same dataset schema/output** as before (diff against the live dataset when possible).

## Common mistakes

- Writing a build step / `tsc` emit — there is none; `noEmit: true`, run `.ts` directly.
- Guessing file contents instead of copying from `hello-world`/`majic` — always mirror a working sibling.
- Forgetting `prepare`/`stop` exports in `index.ts` — the runtime expects the typed trio (prepare may be a no-op).
