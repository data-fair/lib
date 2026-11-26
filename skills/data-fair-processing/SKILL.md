---
name: data-fair-processing
description: Use when working on a @data-fair processing plugin (a `processing-*` repo, a `data-fair-processings-plugin` package) — writing or reviewing `processing-config-schema.json`, wiring `prepare`/`run`/`stop`, using the ProcessingContext (log, axios, ws, patchConfig, tmpDir, secrets), generating types with df-build-types, writing `test-it` tests, handling graceful stop, creating or updating a dataset (file upload, `?draft=` mode, `_bulk_lines`, `nbErrors`, primary key, waiting for the dataset journal), reviewing its security (outbound requests and SSRF, credentials on redirects and next-page links, ftp/sftp and SDK clients, remote names in paths, child processes), or porting an old CommonJS/JavaScript plugin to the TypeScript+ESM template.
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
| `axios` | pre-authenticated against data-fair — defaults below, override when in doubt |
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

### `context.axios` — what the service sets, what to override

Built by the worker (`processings/worker/src/task/axios.ts`); `@data-fair/lib-processing-dev` (`tests-utils.ts`) mimics it only partly.

| Default | Worker | processing-dev (tests) |
|---|---|---|
| Base URL | no `baseURL`: a request interceptor prefixes relative urls with `dataFairUrl` | same |
| Auth | `x-apiKey` (+ `x-account` in admin mode, `User-Agent: @data-fair/processings (<plugin>)`) added **only on data-fair urls** — external hosts never get the key | `x-apiKey` only |
| `maxRedirects` | **`0`** (large-upload memory issue): any 3xx is thrown as an error | `0` |
| Timeout | none (axios default) | none |
| Retry | `axios-retry`, 3 retries, exponential delay honouring `Retry-After`, on network errors and 429/5xx **for GET/HEAD/OPTIONS/PUT/DELETE only — never POST/PATCH**; each retry logs a warning | **none** |
| Error shape | raw `AxiosError`: `err.status`, body in `err.response.data` (`err.data` is undefined) | rejects with the trimmed `response`: `err.status`, `err.data`, no `err.response` |
| Network | **refuses non public addresses** (SSRF protection of lib-node's default agents); only data-fair urls go through private agents, without redirects | not guarded |

What to do with it:

- **Unauthenticated external sources:** pass per-request options (`{ maxRedirects: 5, timeout: 60000 }`) on `context.axios`; a request that carries credentials keeps `maxRedirects: 0` (see [Security](#security)). A remote host that redirects (http→https, CDN, download link) otherwise fails with a 3xx.
- **Every HTTP call goes through `context.axios`** — never the raw `axios` package, `axios.create()`, `fetch`, `got` or `request`, and never a custom `httpAgent`/`httpsAgent`/`proxy` option: they bypass the SSRF protection. Credentials, non-HTTP clients and child processes: see [Security](#security) below.
- **POST/PATCH to data-fair** (bulk lines, file upload) are not retried: wrap them in a small helper retrying 429/5xx, with the body rebuilt by a thunk on each attempt. Reference: `processing-ods/lib/utils.ts` `withRetry429` / `dfRetry` (429 only, 3 retries, fixed 10 s pause, logs each pause). Don't wrap GETs — the built-in retry already applies, the two stack.
- **Reading an error in code that runs in both worker and tests:** `err.status ?? err.response?.status`, `err.data ?? err.response?.data`.
- **Logging:** logs and error messages are in English (language policy in [config-schema.md](config-schema.md#internationalization-policy)). An error thrown from `run` is already turned by the worker into `log.error("<status> - <statusText> - <body> (<url>)")` plus a `log.debug` of the trimmed error — just rethrow. When you catch to add context, `await log.error('what failed', err.response?.data ?? err.data)` (the second argument is a real `extra`), then rethrow.

### API key and vocabulary

The worker calls data-fair with one global API key (`DATA_FAIR_API_KEY`), never a per-processing key. data-fair `/api/v1/settings` accepts **no API key at all** (session only), so a plugin cannot read an owner's private vocabulary. `/api/v1/vocabulary` is anonymous and, with an API key, returns only the standard concepts of `data-fair/api/contract/vocabulary.js`. Only those URIs (or the owner's private ones) are recognised in `x-refersTo`; an unknown URI is **silently** kept without `x-concept` — check the URI against that list.

**Graceful stop:** keep the flag in the streaming module, not in `execute.ts` alone.

```ts
// lib/process.ts
let shouldBeStopped = false
export const setShouldBeStopped = (v: boolean) => { shouldBeStopped = v }
export const isStopped = () => shouldBeStopped
// in the pump chain's Transform callback: if (shouldBeStopped) return next()  // drops rows
```

Then in `execute.ts`, check `isStopped()` **before uploading** and return early — a stopped run must never publish a truncated dataset. Close fds and end write streams on the early-return path too.

## Security

A plugin runs inside the shared, multi-tenant workers of the processings service, and whoever can configure a processing chooses where it connects. Remote content chooses too: pagination links, resource URLs, redirects, file names. Treat every URL, host and name from the config or from a remote server as hostile.

**Outbound connections.** `context.axios` refuses non public addresses (loopback, private ranges, cloud metadata…) on every DNS answer and every redirect hop. A plugin never uses the private clients of `@data-fair/lib-node` (`privateAxiosInstance`, `privateHttpAgent`…): they are for the URLs of a service's own configuration, and a plugin has none. Anything that does not go through `context.axios` needs its own check:

| Client | What to do |
|---|---|
| `fetch`, `got`, `request`, `node-fetch`, raw `axios` | move the call to `context.axios` |
| AWS SDK (`@aws-sdk/*`) | `requestHandler: new NodeHttpHandler({ httpAgent, httpsAgent })` with the public agents of `@data-fair/lib-node/http-agents.js` |
| an SDK that only accepts an `instanceof https.Agent` (e.g. `web-push`) | lib-node's agents are agentkeepalive agents: they fail that test and are **silently ignored**. Pass `new https.Agent({ keepAlive: true, lookup: publicLookup })` (`@data-fair/lib-node/ssrf.js`), and `resolvePublicAddress(hostname)` before the call when the host may be an IP literal |
| another SDK with a user-chosen endpoint | pass those agents if it accepts them; else validate the endpoint (fixed provider domain, strict account-name pattern) |
| `jsonld` (remote `@context`) | a `documentLoader` that refuses remote URLs, or `jsonld.documentLoaders.node({ httpAgent, httpsAgent })` |
| ftp, sftp, ssh2, raw sockets | `const ip = await resolvePublicAddress(host)` (`@data-fair/lib-node/ssrf.js`, throws `SsrfError`), then connect **to `ip`**, with TLS `servername` = host: resolving again could give another address. FTP passive mode: the server picks the data-channel IP, use EPSV or check the PASV address with `resolvePublicAddress` too |
| a client with a `lookup` option (`net.connect`, `tls.connect`, got `dnsLookup`) | `lookup: publicLookup` from the same module, plus `resolvePublicAddress` when the host may be an IP literal (node skips the lookup for literals) |
| third-party credential files (e.g. a Google `external_account` JSON) | check the type (`service_account`) before use: other types read local files or fetch arbitrary URLs |

**Credentials go only to their own origin.**

- Attach a key, token or password from the config only to the API it was issued for, after a **parsed** match: same `new URL(u).origin`, path equal to the base path or under `base + '/'`. Never `startsWith` or a string `replace`: `https://api.example.com.evil.com` and `https://api.example.com@evil.com` pass a prefix test.
- Next-page links and resource URLs from remote content: re-attach credentials only when they pass the same match, otherwise drop them or stop.
- Cross-host redirects strip `Authorization` and `Cookie`, but custom headers (`x-apiKey`, `X-API-KEY`…) **survive**. An authenticated request uses `maxRedirects: 0`, or a `beforeRedirect` that deletes them when the host changes.
- Secrets travel in headers, not in query strings (`?apiKey=` ends up in logs), when the remote API allows it.

**Remote names never become paths or commands.**

- A file name, title, id or listing entry from a remote server or from the config goes through `path.basename()` (or a whitelist such as `[a-zA-Z0-9._-]`) before joining `tmpDir`, and the resolved path must stay inside `tmpDir`: a traversal writes into another run's files.
- `execFile(cmd, [args])`, never `exec` with an interpolated string. Never hand a user URL to a child process (GDAL, curl, wget); a headless browser needs request interception that applies the same address check (`resolvePublicAddress`) to every request; force the input driver (`ogr2ogr -if GPKG`) so a file cannot be sniffed as a VRT pointing to `/vsicurl/…` or a local path.
- Bound what a remote server can make the run do: byte caps on downloads (`maxContentLength` or a counted stream), a page limit on pagination loops, a non-zero `timeout`, limits on archive extraction (zip bombs).

Tests run with `@data-fair/lib-processing-dev`, whose `context.axios` is **not** guarded: a passing test proves nothing about these rules, review them.

Review checklist:

- [ ] Every HTTP call goes through `context.axios`; no custom agent, proxy or `axios.create()`.
- [ ] Non-HTTP clients and SDKs with a user-chosen host have the address check (table above).
- [ ] Credentials are attached after a parsed origin match, never re-sent to a host named by remote content, and authenticated requests don't follow cross-host redirects with custom headers.
- [ ] No remote or user-provided name joined into a path, no `exec` with interpolation.
- [ ] Downloads, pagination loops and extractions are bounded.

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
| [writing-datasets.md](./writing-datasets.md) | creating or updating a dataset: the four write paths, the `?draft=` mode of a file update, waiting for the journal, `_bulk_lines` errors, primary key, schema resync, choosing the target |

## Common mistakes

- **Writing a build step / `tsc` emit** — there is none. `noEmit: true`, run `.ts` directly.
- **Guessing file contents** instead of copying from `hello-world`/`majic` — always mirror a working sibling.
- **Editing the schema without `npm run build-types`** — the types silently drift from the form.
- **Changing the output dataset schema** — live datasets depend on it. Keep it identical unless that is the explicit goal.
- **Dropping the `.ts` extension in imports** — keep it (`NodeNext` + `allowImportingTsExtensions`).
- **cwd-relative `fs.existsSync('./lib/...')`** — resolve with `import.meta.dirname`; the code runs from inside `lib/`.
- **`exec(\`unzip ... ${x}\`)`** — use `execFile('unzip', ['-o', file, '-d', dir])`, no shell injection.
- **Joining a remote name into a path** (`path.join(tmpDir, title)`) — `path.basename()` it first; names from remote listings, metadata or ids are attacker-controlled.
- **Updating a file dataset without `?draft=`** — the file is published with no compatibility check, an HTML error page included. Use `?draft=compatibleOrCancel` with a `forceUpdate` opt-in to `always` (see [writing-datasets.md](./writing-datasets.md)).
- **Ending the run right after the upload** — data-fair processes the file asynchronously; follow the dataset journal on `context.ws` so that a rejected file fails the run.
- **Trusting the 200 of `_bulk_lines`** — rejected lines come back in a 200 with `nbErrors > 0`: throw, and never move a cursor or delete the source after it.
- **Forgetting `patchConfig`** after a create-mode run — the next run creates a second dataset.
- **Bumping `version`** for a `feat!` — leave it alone.
