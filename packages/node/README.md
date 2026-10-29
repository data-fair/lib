# @data-fair/lib-node

Server-side Node.js utilities shared by the services of the data-fair stack (data-fair, processings, events, catalogs…): HTTP clients protected against SSRF, Prometheus observability, MongoDB helpers, upgrade scripts, websocket emitter and client.

## Install

```sh
npm i @data-fair/lib-node
```

Peer dependencies, all declared optional: install the ones required by the modules you import.

| Peer dependency | Needed by |
| --- | --- |
| `prom-client@15` | `observer.js`, `http-agents.js` and everything built on them (`axios.js`, `events-queue.js`…); without it `log.js` does not count log lines |
| `pino-pretty@13` | pretty output of `log.js` in dev (falls back to JSON without it) |
| `mongodb@6` | `mongo.js`, `locks.js`, `upgrade-scripts.js` |
| `ws@8` | `ws-client.js` |
| `tough-cookie@5` | `axios-with-cookies.js`, `axios-auth.js` |

There is no root entry point: import each module by its path.

## Modules

| Import path | Description |
| --- | --- |
| `@data-fair/lib-node/axios.js` | Axios instances with shorter error stack traces and a data-fair `User-Agent`: `axiosInstance` (default export, public), `privateAxiosInstance`, `axiosBuilder()`. |
| `@data-fair/lib-node/http-agents.js` | Keepalive HTTP(S) agents with cached DNS lookups and Prometheus metrics: `httpAgent` / `httpsAgent` (public, SSRF protected), `privateHttpAgent` / `privateHttpsAgent`. |
| `@data-fair/lib-node/ssrf.js` | SSRF checks for clients that don't use the agents above: `resolvePublicAddress()`, `publicLookup`, `SsrfError`. |
| `@data-fair/lib-node/axios-with-cookies.js` | Axios instance with a `tough-cookie` cookie jar. |
| `@data-fair/lib-node/axios-auth.js` | Axios instance logged into simple-directory with email/password. Integration tests only. |
| `@data-fair/lib-node/log.js` | The logger of the stack: JSON lines on stdout (pretty in dev), implicit context, metrics, `debug` output redirected. |
| `@data-fair/lib-node/observer.js` | Mini web server exposing Prometheus metrics and CPU/heap profiles. |
| `@data-fair/lib-node/mongo.js` | `Mongo` connection wrapper (default export: a singleton) with declarative named index management (`configure()`). |
| `@data-fair/lib-node/locks.js` | Distributed locks stored in a MongoDB `locks` collection with a TTL (default export: a singleton). |
| `@data-fair/lib-node/upgrade-scripts.js` | Runner for the database migration scripts of a service. |
| `@data-fair/lib-node/events-queue.js` | Queue of events and notifications pushed to the events service. |
| `@data-fair/lib-node/session.js` | `SessionHandler`: reads and verifies simple-directory session cookies (JWKS). Used by `@data-fair/lib-express/session.js` and Nuxt server code. |
| `@data-fair/lib-node/ws-emitter.js` | Publishes websocket messages through a capped MongoDB collection, read by `@data-fair/lib-express/ws-server.js`. |
| `@data-fair/lib-node/ws-client.js` | Websocket client with auto-reconnect and channel subscriptions (`WsClient`, `DataFairWsClient`). |
| `@data-fair/lib-node/fs.js` | `ensureDir()`, `emptyDir()`, `exists()`. |
| `@data-fair/lib-node/validation.js` | Re-export of `@data-fair/lib-validation`. |
| `@data-fair/lib-node/test-spies.js` | Test helpers: turns `// @test:spy(...)` comments into events that tests can `waitFor()`. |

For sessions see the [`data-fair-session` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-session), for websockets the [`data-fair-ws` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-ws).

## Outgoing HTTP requests and SSRF

The default axios instance and the public agents refuse to connect to non public addresses (loopback, private ranges, link-local including the cloud metadata service, etc.). Use them for every URL that a user can influence.

`privateAxiosInstance` and the private agents have no such restriction. Use them only for URLs that come from the configuration of the service (other services of the same infrastructure).

```ts
import axios, { privateAxiosInstance } from '@data-fair/lib-node/axios.js'

await axios.get(userProvidedUrl)
await privateAxiosInstance.get(config.privateDirectoryUrl + '/api/...')
```

- `SSRF_PUBLIC_IPS`: comma separated IPs / CIDR ranges to consider public, for example an intranet data source of a self-hosted instance, or `127.0.0.1,::1` in a development environment.
- `SSRF_PRIVATE_IPS`: comma separated IPs / CIDR ranges to consider private even if they are public addresses, for example the database servers.

If `HTTP_PROXY`, `HTTPS_PROXY` or `ALL_PROXY` (or their lowercase forms) is defined, the protection of the agents is disabled (they connect to the proxy, not to the target) and a warning is logged at startup.

For clients that don't use these agents (ftp, sftp, raw sockets, SDKs…), `@data-fair/lib-node/ssrf.js` exports `resolvePublicAddress(host)` (checks every address of the host and returns the one to connect to) and `publicLookup` (a `dns.lookup` compatible function for any `lookup` option). They apply the same rules and are not disabled by a proxy env variable. `publicLookup` is not called for IP literals: check those with `resolvePublicAddress`.

See the [`data-fair-security` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-security) for the stack-wide rules.

## Logging

One logger for everything, imported where needed, never passed around:

```ts
import log, { withLogContext } from '@data-fair/lib-node/log.js'

log.info('dataset finalized', { datasetId })
log.info('memory deleted', { code: 'agents.memory.delete' })
log.warn('forbidden request', { code: 'forbidden-req', err })
log.alert('admin api key created', { code: 'df.apikeys.createadmin' })
log.error('failed to create mongo index', { code: 'mongo-index-fail', err, collection })

log.init({ service: 'data-fair' }) // optional, defaults to OTEL_SERVICE_NAME
```

Every method has the same signature `(msg, fields?)` and never throws. Fields named like the keys written by pino (`level`, `time`, `msg`, `hostname`) are renamed with a trailing `_`.

| Level | Use | Emitted | Counted |
| --- | --- | --- | --- |
| `debug` | through the `debug` module (see below) | only namespaces enabled by `DEBUG` | no |
| `info` | normal operations, audit trail | always | no |
| `warn` | client errors, suspicious but expected situations | always | yes |
| `alert` | events that are not failures but deserve the same scrutiny as errors (mostly security) | always | yes |
| `error` | internal failures only, never client errors | always | yes |

**Output**: one JSON object per line on stdout when `NODE_ENV=production`, pretty output otherwise (`LOG_FORMAT=json|pretty` overrides). Fields: `time`, `level` (label), `msg`, `hostname`, `service`, `code`, `err`, the context fields, the per-call fields, and `trace_id` / `span_id` / `trace_flags` when OpenTelemetry is active.

**Codes**: `code` is optional on every line. It must be a **static string** (`mongo-index-fail`, `df.apikeys.createadmin`): never put ids, hosts or other dynamic values in it, they go in other fields. It labels the counters.

**Errors**: pass them as the `err` field. They are serialized with a whitelist (`type`, `message`, `stack`, primitive `code`, `status`, `cause`, and `method` / `url` without query string for axios errors), so headers, request config and document content carried by errors never reach the logs. Messages are truncated to 1000 characters (the message of an `AxiosRequestError` starts with the response body).

**Metrics**: `warn`, `alert` and `error` lines increment `df_logs{level, code, host}`. Deprecated, kept during the transition: `df_internal_error{errorCode}` (error lines) and `df_events_log{level, code, host}` (coded warn and alert lines).

**Debug**: keep using the `debug` module (`import Debug from 'debug'`), `DEBUG=ns1,ns2*` works as before. When `log.js` is loaded, the output of the shared `debug` module is redirected into the logger as `debug` lines with a `ns` field. A third-party library bundling its own copy of `debug` is not redirected.

### Implicit context

The fields of the current context are added to every line. `session.middleware()` of `@data-fair/lib-express` opens a context per request with `ip`, `host`, `userId`, `userName`, `accountKey`, `accountDep`, `accountName`. Any code can add fields for a scope:

```ts
await withLogContext({ datasetId }, async () => {
  // every line logged in here, even deep in the call stack, carries datasetId
})
```

Rules:

- only small immutable values (ids, keys, short names), never `req`, documents or buffers: they stay in memory as long as the scope is alive,
- create long-lived resources (pools, intervals, caches, queues) at startup, outside any scope, or they capture it and attribute their later lines to the wrong user,
- event listeners run in the context of the code that emits, not of the code that subscribed.

Worker threads have their own context: pass `getLogContext()` in the task payload and wrap the task with `withLogContext(payload.logContext, ...)` in the worker.

### OpenTelemetry

Nothing to do in the code. Activate the OpenTelemetry Operator auto-instrumentation on the Kubernetes side: its pino instrumentation adds `trace_id`, `span_id` and `trace_flags` to the lines, and the `traceparent` header is propagated on outgoing HTTP calls (third parties included). Set `OTEL_LOGS_EXPORTER=none` so that logs are not also shipped over OTLP. Without the operator (dev, tests, scripts) lines have no trace fields.

### Migration

| Before | After |
| --- | --- |
| `eventsLog.info(code, msg, ctx)` | `log.info(msg, { code })` |
| `eventsLog.warn(code, msg, ctx)` | `log.warn(msg, { code })` |
| `eventsLog.alert(code, msg, ctx)` | `log.alert(msg, { code })` |
| `internalError(code, err)` | `log.error(msg, { code, err })` |
| `console.log` / `console.warn` / `console.error` | `log.info` / `log.warn` / `log.error` with a code |
| `EVENTS_LOG_LEVEL` | removed, every level but debug is emitted |
| `import Debug from 'debug'` | unchanged |

User, account, ip and host of `eventsLog`'s context argument now come from the implicit context.

## Observer

A very light web server for observability, on port 9090 by default:

- `GET /metrics`: Prometheus metrics of this process,
- `GET /service-metrics` (or `/global-metrics`): metrics registered in `servicePromRegistry`,
- `GET /cpu-profile`, `/heap-profile`, `/heap-profile-all` (optional `?duration=` in ms, default 2000): sampled profiles,
- `GET /heap-snapshot`: full retained heap snapshot (blocks the event loop while V8 walks the heap).

```ts
import { startObserver, stopObserver } from '@data-fair/lib-node/observer.js'

await startObserver() // or startObserver(port)
// ...
await stopObserver()
```

Process metrics are plain `prom-client` metrics. A service-level metric (its value depends on a shared state, like the database, not on the activity of the current process) is registered in `servicePromRegistry`:

```ts
import { Gauge } from 'prom-client'
import { servicePromRegistry } from '@data-fair/lib-node/observer.js'

new Gauge({
  name: 'df_my_gauge',
  help: '...',
  registers: [servicePromRegistry],
  async collect () {
    this.set(await db.collection('my-collection').estimatedDocumentCount())
  }
})
```

## Upgrade scripts

Scripts live in `upgrade/<last-released-version>/` directories of the service. The folder name must be the version of the **last release** of the service at the time the script is written, never an anticipated future version.

At startup the runner reads the version stored in the `services` Mongo collection, runs every script whose folder version is `>=` that stored version, then stores the current `package.json` version. So a script runs once on the production upgrade and re-runs on every staging deploy until the next release ships.

**Scripts must be idempotent**: each script should run once, but this cannot be strictly ensured (concurrent pods, crashes, manual re-runs, misnamed folders), so running it again must be a no-op, not a failure.

A script is a module whose default export follows the `UpgradeScript` interface:

```ts
import type { UpgradeScript } from '@data-fair/lib-node/upgrade-scripts.js'

export default {
  description: 'Add a default status to items',
  async exec (db, debug) {
    await db.collection('items').updateMany({ status: { $exists: false } }, { $set: { status: 'active' } })
  }
} as UpgradeScript
```

Run them during service initialization (the runner takes the `upgrade` lock, so only one process runs them):

```ts
import upgradeScripts from '@data-fair/lib-node/upgrade-scripts.js'
import locks from '@data-fair/lib-node/locks.js'

await locks.start(db)
await upgradeScripts(db, locks) // optional: basePath = './', isFresh callback
```

The [`upgrade-scripts` skill](https://github.com/data-fair/lib/tree/main/skills/upgrade-scripts) covers the folder-naming rule, idempotency patterns and fresh installs in detail.
