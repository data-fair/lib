# Unified logging for the data-fair stack — design

Date: 2026-10-29
Scope: `@data-fair/lib-node`, `@data-fair/lib-express`, then each service (data-fair first).

## Why

Today a service writes three unrelated formats:

- `eventsLog` (lib-express `events-log.ts`): `console.log('df-event:', JSON.stringify(event))` on stdout.
- `internalError` (lib-node `observer.ts`): plain text `[code] message` + stack on stderr.
- `debug` (npm package, ~46 imports in data-fair api) and ~94 raw `console.*` calls: free-form text.

Logs are collected by fluent-bit into rotated files per host/tenant; that system is under review and
the likely destination is Loki or VictoriaLogs, both of which index structured JSON fields. We want
every line to be one JSON object with the same field names, so that a filter like
`accountKey=organization.xyz`, `code=…` or `trace_id=…` works on everything, and so that
everything one request did (possibly across services) can be grouped.

## Goals

- **One logger, one signature, one output shape** for everything: `log.<level>(msg, fields?)`.
- No distinction between "audit logs" and other logs. Clients' admins will receive custom filtered
  outputs (by host, account, level, code…) depending on the situation.
- Almost standard levels, plus one custom level `alert` for events (mostly security) that are not
  failures but deserve the same scrutiny as errors.
- Simple metrics: every `warn`, `alert` and `error` line increments a counter labeled by its code.
- JSON lines in production, human-readable output in dev; chosen from `NODE_ENV`.
- Keep `DEBUG=ns1,ns2*` targeted activation with the exact same syntax as the `debug` package.
  Debug output stays off unless explicitly enabled per namespace. All other levels are always emitted.
- stdout only, no files, no transports, no shipping from the app.
- Trace ids on log lines, from OpenTelemetry, activated entirely on the Kubernetes side.
- An implicit, globally available log context (user, account, ip, host — what `EventLogContext`
  carries by hand today) attached to every line logged during a request, plus the ability for any
  code (including worker threads) to add small resource references (e.g. `datasetId`) to a scope.
- Usage is a plain import; no logger instance passed around; no new setup in services beyond what
  they already do (`session.middleware()`).
- **Converge quickly on the convention rather than maintain compatibility**: `eventsLog` and
  `internalError` are removed, not aliased.

## Non-goals (for now)

- Any OpenTelemetry code or dependency in the lib.
- Exporting traces or logs over OTLP.
- Trace ids in dev environments and inside worker threads.
- Logging in the browser / vue packages.
- Context for websocket connections (`ws-server.ts`) — later.
- Intercepting `console.*`: existing calls are ported by hand, not patched.
- Compatibility shims for the old APIs or the old output format.

## Anti-goals (failure even if it technically works)

- All debug logs enabled in production, flooding the log system.
- Secrets or document content leaking into logs through serialized error objects.
- A log line attributed to the wrong user/account (context captured by a long-lived resource).
- Big objects (`req`, full documents) retained in memory through the context.
- Unbounded metrics cardinality (dynamic values used as codes).
- Logging that breaks or throws in any environment (tests, scripts, no OTel operator).
- Passing logger instances through function signatures.

## Constraints

- Node 24 in service images; `AsyncLocalStorage` is backed by `AsyncContextFrame` there and is cheap.
  The lib itself tests on Node 22 (`.nvmrc`), where ALS is slower but correct — acceptable.
- ESM everywhere; services run `.ts` via type stripping.
- `prom-client` is already an optional peer of lib-node; services all use it.
- Existing alert rules and dashboards query `df_internal_error{errorCode}` and
  `df_events_log{level,code,host}`: these keep being emitted during the transition.

## Decided with the user

1. **pino** is the logger, `pino-pretty` for dev output.
2. **Levels**: `debug` (gated by `DEBUG` namespaces), `info`, `warn`, `alert`, `error`. Everything
   except debug is always emitted; `EVENTS_LOG_LEVEL` is removed. `alert` is a custom pino level.
   `error` is for internal failures only; client errors are `warn` at most.
3. **One signature**: `log.<level>(msg, fields?)`. Errors go in the fields under `err`.
4. **Optional `code` field on any line.** On `warn`, `alert` and `error` lines it is used as a
   metrics label.
5. **Metrics**: no metrics for `debug` and `info`; `warn`, `alert`, `error` increment counters
   labeled `{level, code, host}`. The `host` label is kept. Old counters keep being emitted during
   the transition (see Metrics).
6. **Errors use pino's `err` key convention** with a whitelisting serializer of our own (see Errors),
   for any level.
7. **`eventsLog` and `internalError` are removed**; call sites are migrated. The resulting releases
   are majors for lib-node and lib-express.
8. **`console.*` calls are ported**; an eslint `no-console` rule on server code guards against
   regressions.
9. **OpenTelemetry is activated on the k8s side only** (OpenTelemetry Operator auto-instrumentation).
   Its pino instrumentation adds `trace_id`, `span_id`, `trace_flags` to pino log lines; already
   verified in the staging environment. No Dockerfile or start command change.
10. **Implicit context through our own `AsyncLocalStorage`**, opened by `session.middleware()` for
    requests; resource references in scopes, propagated into data-fair's piscina worker threads.
11. **The output format change is coordinated with the collector**: fluent-bit routes are adapted on
    the staging environment when the branch is deployed, before releasing.

## Design

### Module layout

- `packages/node/log.ts` → `@data-fair/lib-node/log.js`
  - default export `log`: `info`, `warn`, `alert`, `error`, `init`.
  - at load, redirects the output of the `debug` module into the logger (see Debug output).
  - `withLogContext(fields, fn)`, `getLogContext()`, worker helpers.
  - owns the counters.
- `packages/node/observer.ts`: `internalError` and its counter removed (counter moves to `log.ts`);
  its own `console.*` usage ported.
- `packages/express/events-log.ts` (+ `.d.ts`, test): removed. `EventLog`/`EventLogContext` types
  removed. `session.reqForLogs`/`onLogsError` removed if nothing else uses them (builder checks).
- `packages/express/session.ts`: `middleware()` opens the request log context.
- `packages/express/error-handler.ts` and other lib-internal `console`/`internalError`/
  `eventsLog` usage: ported.

### Logger API

```ts
import log, { withLogContext } from '@data-fair/lib-node/log.js'

log.info('dataset finalized', { datasetId })
log.info('memory deleted', { code: 'agents.memory.delete' })      // audit-style line, just a code
log.warn('forbidden request', { code: 'forbidden-req', err })
log.alert('admin api key created', { code: 'df.apikeys.createadmin' })
log.error('failed to create mongo index', { code: 'mongo-index-fail', err, collection })


await withLogContext({ datasetId }, async () => { … })   // every line inside carries datasetId
```

- Message first, fields second (maps to pino's `(obj, msg)` internally). Keep the wrapper thin.
- `fields` is a plain object; reserved keys: `code`, `err`. Explicit fields override context fields.
- `code` is a **static string** (e.g. `mongo-index-fail`, `df.apikeys.createadmin`) — never contains
  ids, hosts or other dynamic values, which go in other fields. Stated in README and JSDoc.
- No method ever throws; a failure inside logging must not become a new error.
- Typing: `error` and `alert` without a `code` are allowed (counted with an empty code) — my call,
  to keep one signature; the README recommends always giving one on these levels.
- `log.init({ service })` optional, sets the `service` field (falls back to `OTEL_SERVICE_NAME`).

### Debug output

Debug logs keep going through the `debug` module: `import debugModule from 'debug'` call sites stay
unchanged (decided with the user). Only the output is redirected. When `log.ts` loads, it replaces
two properties of the shared `debug` module (the copy lib-node resolves, normally deduped with the
services'):
- `createDebug.formatArgs` → no-op (no color, no namespace prefix, no diff timing);
- `createDebug.log` → writes a pino `debug` line `{ ns: this.namespace, msg: util.format(...args) }`.

`debug` reads both properties at each call, so instances created before the logger loaded are
redirected too and import order does not matter (verified in a scratch test). Namespace gating stays
entirely `debug`'s (`DEBUG` syntax unchanged); pino's own level is always `debug`.

Not used: `pino-debug`. It patches the CommonJS module wrapper, must load before anything requires
`debug` (first import or preload) and throws for instances created earlier. Limitation of our
approach: a third-party library bundling its own separate copy of `debug` is not redirected; its
output only appears when its namespace is enabled, as raw text. Acceptable.

`debug` becomes a declared dependency of lib-node (it is used today without being declared).

### Levels

| level | pino value | emitted | metrics |
|---|---|---|---|
| debug | 20 | only matching `DEBUG` namespaces | no |
| info | 30 | always | no |
| warn | 40 | always | yes |
| alert | 45 (custom) | always | yes |
| error | 50 | always | yes |

The alert value between warn and error is my call (purely ordering; every level is emitted anyway).
pino's `trace`/`fatal` are not exposed.

### Errors

Pino's convention is to log errors under the `err` key. We keep that key and that general shape, but
**replace pino's standard `err` serializer**, because it copies every enumerable property of the
error, which for us means:
- raw axios errors (no response: network failure, timeout) carry the full request `config`, including
  `Authorization` / `x-apiKey` headers;
- `AxiosRequestError` (lib-node `axios.ts`) carries request body, response body and response headers;
- mongo errors carry document content (`keyValue` on duplicate keys).

Our serializer is a whitelist:
- `type` (constructor name / `name`), `message`, `stack`;
- `code` and `status`/`statusCode` when they are primitives;
- `cause`, recursively with the same rules (bounded depth);
- for axios errors (raw or `AxiosRequestError`): `method` and `url` with the query string stripped.

Nothing else. Non-Error values given as `err` (string, plain object, null) are serialized safely
(e.g. `{ message: String(value) }`) without throwing.

### Metrics

New counter `df_logs{level, code, host}` (name is my call; follows existing `df_` prefix),
incremented on every `warn`, `alert` and `error` line. `code` is `''` when absent; `host` is the line's
`host` field (explicit or from context), `'-'` when absent.

During the transition the old counters keep being emitted, from the same place:
- `df_internal_error{errorCode}` on every `error` line;
- `df_events_log{level, code, host}` on every `warn` and `alert` line that has a code. Note: `info`
  lines no longer increment it (they did when they were `eventsLog.info`); dashboards relying on
  info counts change.

Both old counters are marked deprecated in their help text, to be removed once alert rules and
dashboards use `df_logs`.

### Output

One JSON object per line, written synchronously to **stdout** for every level (my call).

| field | source |
|---|---|
| `time` | ISO string |
| `level` | label string (`debug`, `info`, `warn`, `alert`, `error`), not pino's number |
| `msg` | message |
| `code` | optional, from fields |
| `err` | serialized error, from fields |
| `service` | `log.init` or `OTEL_SERVICE_NAME`; omitted if unknown |
| `hostname` | `os.hostname()` (pod name) |
| `trace_id`, `span_id`, `trace_flags` | added by the OTel pino instrumentation when present |
| `ip`, `host`, `userId`, `userName`, `accountKey`, `accountDep`, `accountName` | request context (names as in the current `EventLog`) |
| `ns` | debug lines |
| any other fields | from `withLogContext` scopes and per-call fields |

No `pid`. `accountKey` keeps the current format `type + '.' + id`.

**Format selection** (my call): JSON when `NODE_ENV === 'production'`, pretty otherwise;
`LOG_FORMAT=json|pretty` overrides. Pretty mode uses `pino-pretty` as a synchronous stream in the main
thread (not a worker transport). `pino-pretty` is an optional peer dependency loaded dynamically; if
missing, fall back to JSON without failing. Pretty lines show level, code/ns and short context
(account, user) inline, the stack below.

### Implicit context

A single module-level `AsyncLocalStorage<LogContext>` in lib-node `log.ts`; a pino `mixin` merges the
current store into each line.

- `withLogContext(fields, fn)`: runs `fn` in a new store = parent store + `fields` (copy, never
  mutate the parent). Returns `fn`'s result (sync or promise).
- `getLogContext()`: current fields, read-only copy.

Rules, stated in the README and in the JSDoc of `withLogContext`:
- only small immutable values (ids, keys, short names) — never `req`, documents, buffers;
- long-lived resources (pools, intervals, caches, queues) are created at startup, outside any scope,
  otherwise they capture a scope and attribute later lines to the wrong user;
- event listeners run in the emitter's context, not the subscriber's.

### Request context (in `session.middleware()`)

Every service already mounts `session.middleware()`, which already reads the session eagerly
(`loadState`). It becomes the place where the request scope opens, so services need no new setup:

1. open a scope with `ip` (`reqIp(req, { optional: true })`) and `host` (same normalization as today's
   events log: missing, `localhost*` or `*:8080` → `'-'`);
2. inside it, load the session as today, add `userId`, `userName`, `accountKey`, `accountDep`,
   `accountName` (from `sessionState.user` / `sessionState.account`), and call `next()` inside the
   scope;
3. if loading the session fails, hand the error to `next(err)` from inside the scope so the error
   handler's lines (e.g. `unauthorized-req`) keep ip/host — a promise rejection caught by express
   outside the scope would lose it.

Reading the session for log fields must not go through `assertRouteCheckedScope`: log fields are not
an authorization use of the session.

Lines logged by middleware mounted before `session.middleware()` have no request context. Acceptable.

### Worker threads (data-fair piscina workers)

- The logger works in a worker thread by plain import (each thread has its own pino instance and ALS).
- lib-node exposes a pair of helpers (names are the builder's call): one on the calling side that
  captures the current log context as a plain serializable object to put in the task payload, one on
  the worker side that runs the task inside `withLogContext(payloadContext, …)`.
- Known limitations, documented: in a worker, `process.stdout` is relayed asynchronously through the
  main thread, so the last lines before a hard worker crash can be lost; counters incremented in a
  worker are not served by the main thread's `/metrics` (unchanged from today).

### OpenTelemetry

Nothing to build in the lib. Notes for deployments, in the README:
- the operator's auto-instrumentation includes the pino instrumentation, which adds
  `trace_id`/`span_id`/`trace_flags`; keep `OTEL_LOGS_EXPORTER=none` so it does not also try to ship
  logs over OTLP;
- `traceparent` is propagated on all outgoing HTTP calls, including to third parties (my call:
  acceptable, the ids are random and carry no information);
- without the operator (dev, tests, scripts) lines simply have no trace fields.

## Rollout

1. lib: implement `log.js` (levels, serializer, counters, context, worker helpers, debug redirection),
   request scope in `session.middleware()`, remove `eventsLog` and `internalError`, port all
   lib-internal usage. Release **lib-node and lib-express as majors**. README section in lib-node:
   usage, levels, fields, code rules, context rules, OTel notes, migration table
   (`eventsLog.info(code, msg, ctx)` → `log.info(msg, { code })`, `eventsLog.alert` → `log.alert`,
   `internalError(code, err)` → `log.error(msg, { code, err })`; `debug` call sites unchanged).
2. data-fair: bump libs, port `console.*`, `eventsLog`, `internalError` call sites, add the
   worker context helpers around piscina tasks, add eslint `no-console` for server code. Deploy the
   branch on staging, adapt fluent-bit routes, then release.
3. Other services, same steps when they bump to the new majors.

## Testing

`node:test`, like existing lib tests. Capture output by injecting a destination stream (the logger
must allow this for tests — builder's call how).

- JSON shape: fields, label levels, ISO time, no pid; pretty fallback to JSON without `pino-pretty`.
- levels: `alert` custom level present with its label.
- debug: an instance created before the logger loaded and one created after both produce pino
  debug lines with `ns` and the `util.format`ted message; disabled namespaces emit nothing.
- metrics: `df_logs` incremented for warn/alert/error with `{level, code, host}`, not for
  info/debug; `df_internal_error` on error; `df_events_log` on coded warn/alert.
- errors: whitelist only (an axios-like error with `config.headers.Authorization` and a mongo-like
  error with `keyValue` produce no such data), `cause` chain, URL query stripped, odd inputs (string,
  null, plain object) never throw.
- context: `withLogContext` nesting, isolation between concurrent scopes, survives awaits and timers.
- session middleware: ip/host and user/account present in lines logged by later handlers; ip/host
  present in error-handler lines when session loading fails; no scope-check error triggered by logging.
- worker helpers: context captured, serialized, restored in a real `worker_threads` worker.

## Left to the builder

Exact names of helpers and of the new counter if a better one fits conventions, package versions,
how to inject the test destination, pretty-output layout, max `cause` depth.
