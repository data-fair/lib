---
name: data-fair-processings
description: Use when working on a @data-fair processing plugin (a `processing-*` repo, a `data-fair-processings-plugin` package) — writing or reviewing `processing-config-schema.json`, wiring `prepare`/`run`/`stop`, using the ProcessingContext (log, axios, ws, patchConfig, tmpDir, secrets), generating types with df-build-types, writing `test-it` tests, handling graceful stop, or porting an old CommonJS/JavaScript plugin to the TypeScript+ESM template.
---

# Developing a data-fair processing plugin

## Overview

A **processing** is an npm package (`processing-<name>`, keyword `data-fair-processings-plugin`) installed by the *processings* service. The service reads its `processing-config-schema.json` to render a configuration form, then calls the module's exported functions to run the job.

It runs as **native TypeScript on Node 24** via `--experimental-strip-types`: **no build step, no emit**. `.ts` files are executed and imported directly, and imports keep the `.ts` extension.

**Canonical template: `processing-hello-world`.** Mirror it rather than inventing structure. Closest real-world reference for download → transform → upload plugins: `processing-majic`.

## When to use

- Creating a new processing plugin, or adding/changing a feature in an existing one.
- Editing `processing-config-schema.json` (the user-facing config form).
- Porting a CommonJS/JS plugin to TypeScript+ESM.
- Reviewing a processing PR.

**Not for:** the *processings* service itself (`Documents/processings`), catalogs plugins, or data-fair core.

## Anatomy

```
processing-<name>/
  processing-config-schema.json   # user-facing config form (json-layout / vjsf 3+)
  index.ts                        # thin entry: prepare / run / stop, dynamic imports only
  lib/
    prepare.ts                    # secrets extraction; no-op if the plugin has no secret
    execute.ts                    # the actual job (run + stop)
    ...                           # download.ts, process.ts, upload.ts, transforms/, schemas/
  types/processingConfig/
    schema.ts                     # re-exports the JSON schema
    index.ts                      # re-exports ./.type/index.js (GENERATED, gitignored)
  config/
    default.mjs, local-test.mjs   # local dev only (dataFairUrl, dataFairAPIKey)
    type/{schema.ts,index.ts}
  test-it/index.ts                # node:test
  tsconfig.json  eslint.config.mjs  commitlint.config.ts  .nvmrc(24)  .husky/
  .github/workflows/publish-{staging,production}.yml
```

`imports` in `package.json` maps `#types/*` → `./types/*`; `files` ships `processing-config-schema.json` and `lib/**/*`.

## The runtime contract

`index.ts` exports exactly three things, all typed, all delegating via dynamic `import('./lib/….ts')`:

| Export | Type | Called when | Purpose |
|---|---|---|---|
| `prepare` | `PrepareFunction<ProcessingConfig>` | the config is **saved** | extra validation (throw), and move secrets out of the config into `secrets` |
| `run` | `RunFunction<ProcessingConfig>` | the processing is **started** | the business logic |
| `stop` | `() => Promise<void>` | the run is **interrupted** | flip a flag; `run` must finish shortly after |

`run` receives a `ProcessingContext` (from `@data-fair/lib-common-types/processings.js`):

| Field | Use |
|---|---|
| `processingConfig` | the validated user config (typed) |
| `secrets` | values stripped by `prepare`, in clear here |
| `processingId` | e.g. for `extras` on the produced dataset |
| `tmpDir` | **the working directory** — per-run temp dir, the only one to use |
| `log` | `step`, `task`, `progress(task, n, total)`, `info`, `debug`, `warning`, `error` |
| `axios` | pre-authenticated against data-fair |
| `ws` | data-fair websocket client (wait for dataset finalization) |
| `sendMail` | notification |
| `patchConfig({ datasetMode, dataset })` | **the create→update switch**: after creating a dataset, persist it so the next run updates instead of re-creating |

`run` may return `{ deleteOnComplete: true }` to auto-delete the execution record.

**Deprecated context fields — do not use in new code:**

| Field | Why |
|---|---|
| `pluginConfig` | legacy super-admin config, read from the `dataDir/plugins/<id>-config.json` volume; logs a deprecation warning at runtime and is **removed in processings v7.0**. Put the setting in `processing-config-schema.json` instead. |
| `dir` | persistent working dir, but it only exists when the legacy `dataDir` volume is mounted — otherwise it falls back under `tmpDir`. Never rely on it surviving between runs. |

`tmpDir` is the only directory a plugin can count on. Anything that must persist belongs in a dataset, not on disk.

**Secrets:** never leave a secret readable in `processingConfig`. `prepare` moves it to `secrets` and writes `'********'` back; an empty value deletes it from `secrets`. `run` reads it from `context.secrets`.

**Graceful stop:** keep the flag in the streaming module, not in `execute.ts` alone.

```ts
// lib/process.ts
let shouldBeStopped = false
export const setShouldBeStopped = (v: boolean) => { shouldBeStopped = v }
export const isStopped = () => shouldBeStopped
// in the pump chain's Transform callback: if (shouldBeStopped) return next()  // drops rows
```

Then in `execute.ts`, check `isStopped()` **before uploading** and return early — a stopped run must never publish a truncated dataset. Close fds and end write streams on the early-return path too.

## The config schema

`processing-config-schema.json` is a JSON Schema **plus json-layout `layout` keywords** — the processings UI renders it with `@koumoul/vjsf` v4.

The legacy `x-display` / `x-fromUrl` / `x-itemsProp` / `x-itemTitle` / `x-itemKey` keywords (vjsf 2) are **silently ignored** by vjsf 3+: no error, just a form that quietly loses its tabs or its dataset autocomplete. Any schema still carrying an `x-*` keyword needs migrating.

**REQUIRED BACKGROUND: the [vjsf skill](../vjsf/SKILL.md)** — layout vocabulary, `getItems`, conditionals, `x-i18n-*`, and the vjsf2 → vjsf3 migration table. Then **READ [config-schema.md](./config-schema.md)** for what is processings-specific: the standard `datasetMode` create/update block, the available `context` variables, secrets, and the schema-change gotchas.

## Types are generated, never hand-written

`ProcessingConfig` is derived from `processing-config-schema.json` by `df-build-types`:

```sh
npm run build-types      # regenerates types/processingConfig/.type/ and config/type/.type/
```

**Every schema edit requires a `build-types` run.** `.type/` directories are generated artifacts — gitignore them, never commit them.

## Working loop

```sh
npm i
npm run build-types
npm run lint            # neostandard + @data-fair/lib-utils/eslint/recommended
npm test                # node:test over test-it/*.ts
```

Run tests against a real instance by filling `config/local-test.mjs` (gitignored) with `dataFairUrl` + `dataFairAPIKey`; tests build a context with `@data-fair/lib-processing-dev/tests-utils.js`.

**Never touch `version` in `package.json`** — releases are automated (tag → `publish-production.yml`).

## Reference files

| File | When to read it |
|---|---|
| [config-schema.md](./config-schema.md) | writing/reviewing `processing-config-schema.json` (with the [vjsf skill](../vjsf/SKILL.md) as background) |
| [typescript-migration.md](./typescript-migration.md) | the repo still has `main: index.js`, `require()`, `mocha`, or no `"type": "module"` |
| [file-templates.md](./file-templates.md) | exact contents of every boilerplate file |

## Common mistakes

- **Writing a build step / `tsc` emit** — there is none. `noEmit: true`, run `.ts` directly.
- **Guessing file contents** instead of copying from `hello-world`/`majic` — always mirror a working sibling.
- **Editing the schema without `npm run build-types`** — the types silently drift from the form.
- **Changing the output dataset schema** — live datasets depend on it. Keep it identical unless that is the explicit goal.
- **Dropping the `.ts` extension in imports** — keep it (`NodeNext` + `allowImportingTsExtensions`).
- **cwd-relative `fs.existsSync('./lib/...')`** — resolve with `import.meta.dirname`; the code runs from inside `lib/`.
- **`exec(\`unzip ... ${x}\`)`** — use `execFile('unzip', ['-o', file, '-d', dir])`, no shell injection.
- **Forgetting `patchConfig`** after a create-mode run — the next run creates a second dataset.
- **Bumping `version`** for a `feat!` — leave it alone.
