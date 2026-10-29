# Unified Logging Implementation Plan (lib)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship one pino-based logger in `@data-fair/lib-node/log.js` (levels, safe error serializer, metrics, implicit context, `DEBUG` namespaces), open the request log context in lib-express `session.middleware()`, and remove `eventsLog` / `internalError` from the lib.

**Architecture:** A module-level pino instance writes JSON (prod) or pino-pretty (dev) synchronously to stdout. A thin wrapper exposes `log.<level>(msg, fields?)`, increments prom-client counters for warn/alert/error, and merges an `AsyncLocalStorage` context into each line through a pino `mixin`. lib-express fills that context per request inside `session.middleware()`.

**Tech Stack:** TypeScript (ESM, type stripping), pino 9, pino-pretty 13 (optional peer), debug 4 (namespace matching only), prom-client 15, node:test.

**Spec:** `docs/superpowers/specs/2026-10-29-unified-logging-design.md`

**Out of scope of this plan:** data-fair and other services migration (separate plan, other repos); releases (done by the maintainer: lib-node and lib-express become **majors**, so commits removing APIs carry a `BREAKING CHANGE:` footer).

## Global Constraints

- One signature: `log.<level>(msg: string, fields?: LogFields)`; reserved field keys `code`, `err`.
- Levels and pino values: `debug` 20, `info` 30, `warn` 40, `alert` 45 (custom), `error` 50. pino `level` is always `'debug'`; debug lines are gated only by `DEBUG` namespaces.
- Output field `level` is the label string; `time` is ISO (`pino.stdTimeFunctions.isoTime`); no `pid`; base fields `hostname` (`os.hostname()`) and `service` (from `log.init({ service })`, else `OTEL_SERVICE_NAME`, omitted if neither).
- Format: JSON when `NODE_ENV === 'production'`, pretty otherwise; `LOG_FORMAT=json|pretty` overrides; pretty = `pino-pretty` built with `{ sync: true, customLevels: 'alert:45' }` as the destination stream; if `pino-pretty` cannot be imported → JSON.
- Everything to stdout (`pino.destination({ dest: 1, sync: true })`).
- Counters (default prom-client register): `df_logs{level, code, host}` on warn/alert/error; deprecated `df_internal_error{errorCode}` on error; deprecated `df_events_log{level, code, host}` on warn/alert lines that have a code. Missing code → `''`; missing host → `'-'`.
- Request context field names: `ip`, `host`, `userId`, `userName`, `accountKey` (`type + '.' + id`), `accountDep`, `accountName`. Host normalization: missing, starting with `localhost` or ending with `:8080` → `'-'`.
- No logging method ever throws.
- Commit messages: conventional commits, ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Tests run with `node --experimental-strip-types --test <file>` from the repo root; full gate is `npm run quality`.

## Review Focus

1. **A secret-bearing axios error logged at any level** — raw `AxiosError` with `config.headers.Authorization` must produce no header data (pinned in Task 2).
2. **Error handler lines when the session cookie is invalid** — must still carry `ip`/`host` (pinned in Task 5).
3. **Two concurrent requests interleaving awaits** — each line keeps its own user (pinned in Task 4).
4. **`err` that is not an Error** (string, `null`, plain object, circular `cause`) — logged without throwing (pinned in Task 2).
5. **Per-call `host`/`code` overriding context** — counter label and output use the explicit value (pinned in Task 3).

---

## File Structure

- Create `packages/node/log.ts` — logger instance, levels, format selection, wrapper API, counters, context, debug namespaces, test seam.
- Create `packages/node/log-err.ts` — `serializeErr` whitelist serializer (pure, separately testable).
- Create `packages/node/log.test.ts`, `packages/node/log-err.test.ts`, `packages/node/log-worker.test.ts` (+ fixture `packages/node/test-fixtures/log-worker.ts`).
- Create `packages/express/req-log-context.ts` (+ test) — `reqLogFields`, `sessionLogFields`.
- Modify `packages/express/session.ts` — scope in `middleware()`, remove `reqForLogs` / `onLogsError`.
- Delete `packages/express/events-log.ts`, `packages/express/events-log.test.ts`.
- Modify all lib-internal call sites (Task 6 list), `packages/node/observer.ts`, `packages/express/index.ts`, `packages/node/package.json`, READMEs, `eslint.config.mjs`.

---

### Task 1: Logger core (levels, output, format, test seam)

**Files:**
- Create: `packages/node/log.ts`
- Test: `packages/node/log.test.ts`
- Modify: `packages/node/package.json` (dependencies `pino@^9`, `debug@^4`; optional peer `pino-pretty@13` in `peerDependencies` + `peerDependenciesMeta`; devDependency `pino-pretty@^13`), root `package-lock.json` via `npm install`

**Interfaces:**
- Produces:
  - `export type LogLevel = 'debug' | 'info' | 'warn' | 'alert' | 'error'`
  - `export type LogFields = { code?: string, err?: unknown, [key: string]: unknown }`
  - `export interface Logger { info (msg: string, fields?: LogFields): void; warn (...): void; alert (...): void; error (...): void; init (opts: { service?: string }): void; debugNs (ns: string): DebugFn }` (debugNs body in Task 4)
  - `export default log: Logger`
  - `/** @internal test seam */ export function _resetLogger (opts?: { destination?: { write (s: string): unknown }, format?: 'json' | 'pretty' }): void` — rebuilds the pino instance; without opts uses the env-driven defaults.
  - internal `write (level: LogLevel, msg: string, fields?: LogFields): void` used by every method (later tasks hook counters and context into it).

- [ ] **Step 1: Install deps** — `npm install -w packages/node pino@^9 debug@^4 && npm install -w packages/node -D pino-pretty@^13`, then add `pino-pretty` to `peerDependencies` (`"13"`) and `peerDependenciesMeta` (`optional: true`). Expected: `node_modules/pino` exists.

- [ ] **Step 2: Write failing tests** in `packages/node/log.test.ts` with a capture helper:

```ts
const capture = () => { const lines: any[] = []; _resetLogger({ format: 'json', destination: { write: (s: string) => { for (const l of s.split('\n')) if (l) lines.push(JSON.parse(l)) } } }); return lines }

it('writes one JSON object per line with label level, ISO time, hostname and no pid', () => {
  const lines = capture(); log.info('hello', { a: 1 })
  assert.equal(lines[0].level, 'info'); assert.equal(lines[0].msg, 'hello'); assert.equal(lines[0].a, 1)
  assert.match(lines[0].time, /^\d{4}-\d{2}-\d{2}T/); assert.equal(lines[0].hostname, hostname()); assert.equal(lines[0].pid, undefined)
})
it('supports the alert level between warn and error', () => { const lines = capture(); log.alert('x', { code: 'c' }); assert.equal(lines[0].level, 'alert'); assert.equal(lines[0].code, 'c') })
it('adds service from init', () => { const lines = capture(); log.init({ service: 'svc' }); log.warn('x'); assert.equal(lines[0].service, 'svc') })
it('pretty format writes human readable non-JSON output', () => { const out: string[] = []; _resetLogger({ format: 'pretty', destination: { write: (s: string) => out.push(s) } }); log.info('pretty hello'); assert.ok(out.join('').includes('pretty hello')); assert.throws(() => JSON.parse(out[0])) })
it('never throws', () => { capture(); const circular: any = {}; circular.self = circular; assert.doesNotThrow(() => log.info('x', circular)) })
```

(For the pretty test, the destination is passed to pino-pretty as its `destination` option.)

- [ ] **Step 3: Run** `node --experimental-strip-types --test packages/node/log.test.ts` — Expected: FAIL (module not found).

- [ ] **Step 4: Implement `packages/node/log.ts`** — pino options: `level: 'debug'`, `customLevels: { alert: 45 }`, `base: { hostname: os.hostname() }`, `timestamp: pino.stdTimeFunctions.isoTime`, `formatters: { level: label => ({ level: label }) }`, `mixin` returning `{ service }` when set. `pino-pretty` loaded once with top-level `await import('pino-pretty').catch(() => null)`. `write` wraps `instance[level](fields ?? {}, msg)` in try/catch. Module calls `_resetLogger()` at load.

- [ ] **Step 5: Run tests** — Expected: PASS.

- [ ] **Step 6: Commit** — `git add packages/node/log.ts packages/node/log.test.ts packages/node/package.json package-lock.json && git commit -m "feat(node): pino based logger with alert level and env driven format"`

---

### Task 2: Safe error serializer

**Files:**
- Create: `packages/node/log-err.ts`
- Test: `packages/node/log-err.test.ts`
- Modify: `packages/node/log.ts` (pino `serializers: { err: serializeErr }`), `packages/node/log.test.ts`

**Interfaces:**
- Produces: `export interface SerializedErr { type?: string, message: string, stack?: string, code?: string | number, status?: number, method?: string, url?: string, cause?: SerializedErr }` and `export function serializeErr (value: unknown, depth?: number): SerializedErr` (max depth 5, then `cause` omitted).

- [ ] **Step 1: Write failing tests** in `log-err.test.ts`:

```ts
it('keeps only whitelisted fields of an Error', () => {
  const err = Object.assign(new Error('boom'), { code: 'E1', status: 500, keyValue: { email: 'a@b.c' }, secret: 'x' })
  const s = serializeErr(err)
  assert.deepEqual(Object.keys(s).sort(), ['code', 'message', 'stack', 'status', 'type'])
  assert.equal(s.type, 'Error'); assert.equal(s.message, 'boom')
})
it('maps statusCode to status', () => assert.equal(serializeErr(Object.assign(new Error('x'), { statusCode: 404 })).status, 404))
it('drops non primitive code', () => assert.equal(serializeErr(Object.assign(new Error('x'), { code: { a: 1 } })).code, undefined))
it('never leaks axios request headers and strips the query string', () => {
  const err = Object.assign(new Error('timeout'), { isAxiosError: true, config: { method: 'get', url: 'https://x.org/p?apiKey=s3cret', headers: { Authorization: 'Bearer s3cret' } } })
  const json = JSON.stringify(serializeErr(err))
  assert.ok(!json.includes('s3cret')); assert.ok(json.includes('"url":"https://x.org/p"')); assert.ok(json.includes('"method":"get"'))
})
it('handles AxiosRequestError shape (name + config from response) without bodies', () => {
  const err = Object.assign(new Error('500 - fail'), { name: 'AxiosRequestError', status: 500, config: { method: 'post', url: 'http://a/b?k=v', data: 'body' }, data: { secret: 1 }, headers: { 'set-cookie': 'x' } })
  const s = serializeErr(err); assert.equal(s.url, 'http://a/b'); assert.equal(s.status, 500); assert.ok(!JSON.stringify(s).includes('secret'))
})
it('serializes cause recursively and stops on cycles', () => {
  const a: any = new Error('a'); const b: any = new Error('b', { cause: a }); a.cause = b
  const s = serializeErr(b); assert.equal(s.cause?.message, 'a'); assert.doesNotThrow(() => JSON.stringify(s))
})
it('accepts non Error values', () => {
  assert.equal(serializeErr('plain').message, 'plain'); assert.equal(serializeErr(null).message, 'null')
  assert.equal(serializeErr({ message: 'obj', token: 't' }).message, 'obj'); assert.ok(!JSON.stringify(serializeErr({ message: 'obj', token: 't' })).includes('"t"'))
})
```

Plus in `log.test.ts`: `log.warn('x', { err: new Error('e') })` produces `lines[0].err.message === 'e'` and `lines[0].err.stack`.

- [ ] **Step 2: Run** `node --experimental-strip-types --test packages/node/log-err.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `serializeErr`: Error-like (`instanceof Error` or object with string `message`) → whitelist; axios detection = `isAxiosError === true` or `name === 'AxiosRequestError'`, method/url read from `config`; any other value → `{ message: String(value) }` (`'null'` for null). Wire into pino `serializers`.
- [ ] **Step 4: Run both test files** — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(node): whitelist error serializer for logs`

---

### Task 3: Metrics

**Files:**
- Modify: `packages/node/log.ts`, `packages/node/log.test.ts`
- Modify (bridge until Task 6): `packages/node/observer.ts` — remove its `df_internal_error` counter; `internalError(code, error, ...rest)` temporarily delegates to `log.error(error?.message ?? String(error), { code, err: error })`. `packages/express/events-log.ts` — remove its `df_events_log` Counter, import `eventsLogCounter` from `@data-fair/lib-node/log.js` and re-export it (avoids double registration).

**Interfaces:**
- Produces: `export const logsCounter: Counter<'level' | 'code' | 'host'>` (`df_logs`), `export const internalErrorCounter` (`df_internal_error`, help text starts with `DEPRECATED, use df_logs.`), `export const eventsLogCounter` (`df_events_log`, same deprecation note).

- [ ] **Step 1: Write failing tests** (read values with `register.getSingleMetric(name)?.get()` as in `req-perf.test.ts`; use unique codes per test):

```ts
it('counts warn/alert/error in df_logs with level, code and host', async () => {
  capture(); log.warn('w', { code: 'm-w', host: 'h1' }); log.alert('a', { code: 'm-a' }); log.error('e', { code: 'm-e' })
  const v = (await register.getSingleMetric('df_logs')!.get()).values
  assert.ok(v.find(x => x.labels.code === 'm-w' && x.labels.level === 'warn' && x.labels.host === 'h1' && x.value === 1))
  assert.ok(v.find(x => x.labels.code === 'm-a' && x.labels.host === '-'))
  assert.ok(v.find(x => x.labels.code === 'm-e' && x.labels.level === 'error'))
})
it('does not count info and debug', async () => { capture(); log.info('i', { code: 'm-i' }); const v = (await register.getSingleMetric('df_logs')!.get()).values; assert.ok(!v.find(x => x.labels.code === 'm-i')) })
it('counts uncoded lines with an empty code', ...)                       // log.warn('x') → labels.code === ''
it('keeps df_internal_error for error lines', ...)                       // log.error('e', { code: 'm-ie' }) → df_internal_error{errorCode:'m-ie'} === 1
it('keeps df_events_log only for coded warn/alert', ...)                  // log.alert coded → present; log.warn uncoded and log.error coded → absent
```

- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** in `write`: for warn/alert/error compute `code = typeof fields?.code === 'string' ? fields.code : ''`, `host = fields?.host ?? contextHost ?? '-'` (context lookup becomes real in Task 4; until then `fields?.host ?? '-'`), increment counters per Global Constraints. Apply the two bridge edits.
- [ ] **Step 4: Run** `node --experimental-strip-types --test packages/node/log.test.ts packages/express/events-log.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(node): df_logs counter, keep deprecated counters`

---

### Task 4: Implicit context and debug namespaces

**Files:**
- Modify: `packages/node/log.ts`, `packages/node/log.test.ts`
- Create: `packages/node/log-worker.test.ts`, `packages/node/test-fixtures/log-worker.ts`

**Interfaces:**
- Produces:
  - `export type LogContext = Record<string, string | number | boolean | undefined>`
  - `export function withLogContext<T> (fields: LogContext, fn: () => T): T` — runs `fn` in a store = `{ ...parent, ...fields }`.
  - `export function getLogContext (): LogContext` — shallow copy, `{}` outside any scope. Worker propagation uses exactly these two (no extra helpers — my call, they already form the pair the spec asks for).
  - `export type DebugFn = ((msg: string, ...args: unknown[]) => void) & { enabled: boolean }`; `log.debugNs(ns: string): DebugFn` — `enabled = createDebug.enabled(ns)` at creation; when called with exactly one extra arg that is a plain object it becomes fields, otherwise `msg = util.format(msg, ...args)`; line has `ns` field.

- [ ] **Step 1: Write failing tests:**

```ts
it('merges context into lines, per-call fields win', () => {
  const lines = capture()
  withLogContext({ datasetId: 'd1', host: 'ctx' }, () => withLogContext({ step: 's' }, () => log.info('x', { host: 'call' })))
  assert.equal(lines[0].datasetId, 'd1'); assert.equal(lines[0].step, 's'); assert.equal(lines[0].host, 'call')
})
it('isolates concurrent scopes across awaits and timers', async () => {
  const lines = capture()
  const run = (u: string) => withLogContext({ userId: u }, async () => { await new Promise(r => setTimeout(r, u === 'a' ? 10 : 1)); log.info(u) })
  await Promise.all([run('a'), run('b')])
  for (const l of lines) assert.equal(l.userId, l.msg)
})
it('uses the context host as counter label', async () => { capture(); withLogContext({ host: 'ctx-host' }, () => log.warn('x', { code: 'm-ctx' })); /* df_logs{code:'m-ctx', host:'ctx-host'} === 1 */ })
it('getLogContext returns a copy', () => withLogContext({ a: 1 }, () => { const c = getLogContext(); c.a = 2; assert.equal(getLogContext().a, 1) }))
it('debug namespaces follow DEBUG matching', () => {
  createDebug.enable('lt:a*,-lt:a:no'); const lines = capture()
  log.debugNs('lt:a:yes')('hi %s', 'there'); log.debugNs('lt:a:no')('nope'); log.debugNs('lt:b')('nope')
  log.debugNs('lt:a:obj')('with fields', { k: 1 })
  assert.deepEqual(lines.map(l => [l.ns, l.msg, l.level]), [['lt:a:yes', 'hi there', 'debug'], ['lt:a:obj', 'with fields', 'debug']]); assert.equal(lines[1].k, 1)
})
```

`log-worker.test.ts`: in a scope `{ datasetId: 'w1' }`, start `new Worker(fixtureUrl, { workerData: { logContext: getLogContext() }, stdout: true })`; the fixture calls `withLogContext(workerData.logContext, () => log.info('in worker'))` with `LOG_FORMAT=json` in the worker `env`; the test reads the worker's stdout, parses the line, asserts `datasetId === 'w1'`. Run the fixture with `execArgv: ['--experimental-strip-types']`.

- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** a module-level `AsyncLocalStorage<LogContext>`; mixin returns `{ ...store, service? }` (pino's default mixin merge lets per-call fields win); counter host reads the store.
- [ ] **Step 4: Run** `node --experimental-strip-types --test packages/node/log.test.ts packages/node/log-worker.test.ts` — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(node): implicit log context and DEBUG namespaces`

---

### Task 5: Request log context in session.middleware()

**Files:**
- Create: `packages/express/req-log-context.ts`, `packages/express/req-log-context.test.ts`
- Modify: `packages/express/session.ts` (`middleware()`), `packages/express/session.test.ts`

**Interfaces:**
- Consumes: `withLogContext`, `log` (Task 4), `reqIp` from `./req-origin.js`.
- Produces: `export function reqLogFields (req: Request | IncomingMessage): { ip?: string, host: string }` and `export function sessionLogFields (state: SessionState): LogContext` (`userId`, `userName`, `accountKey`, `accountDep`, `accountName`; undefined values omitted).

- [ ] **Step 1: Write failing tests.** In `req-log-context.test.ts`, port the three ip cases of `events-log.test.ts` (X-Forwarded-For used, X-Client-IP ignored; no ip for in-cluster call) onto `reqLogFields`, plus host normalization: `example.com` kept, `data-fair:8080` → `'-'`, `localhost:5600` → `'-'`, missing → `'-'`; and `sessionLogFields` for an org account with department → `accountKey: 'organization.o1', accountDep: 'dep1'`. In `session.test.ts` (`describe('Session.middleware')`):

```ts
it('opens a log context with request and session fields for later handlers', async () => {
  const lines = captureLogs()              // same helper as Task 1, via _resetLogger from lib-node/log.js
  const session = new Session(); session.readState = async () => ({ lang: 'fr', user: testUser, account: { type: 'organization', id: 'org1', name: 'Test Org' }, accountRole: 'admin' })
  await session.middleware()(mockReq('GET', { host: 'example.com', 'x-forwarded-for': '203.0.113.7' }), mockRes(), () => { log.info('in route') })
  assert.equal(lines[0].userId, 'user1'); assert.equal(lines[0].accountKey, 'organization.org1'); assert.equal(lines[0].ip, '203.0.113.7'); assert.equal(lines[0].host, 'example.com')
})
it('hands session failures to next(err) inside the request scope', async () => {
  const lines = captureLogs()
  const session = new Session(); session.readState = async () => { throw Object.assign(new Error('bad'), { status: 401 }) }
  await session.middleware()(mockReq('GET', { host: 'example.com' }), mockRes(), (err?: any) => { log.warn(err.message, { code: 'unauthorized-req' }) })
  assert.equal(lines[0].host, 'example.com'); assert.equal(lines[0].code, 'unauthorized-req')
})
it('logging a scoped session from the middleware does not trigger the scope check', ...) // scoped state, route never marks scope checked, next() called, line has userId
```

Update the existing test `sync accessors after a failed middleware do not throw a TypeError`: the middleware now resolves and calls `next(err)`; assert `next` received an error with status 401 instead of `assert.rejects`.

- [ ] **Step 2: Run** `node --experimental-strip-types --test packages/express/req-log-context.test.ts packages/express/session.test.ts` — Expected: new tests FAIL.
- [ ] **Step 3: Implement.** `middleware()` returns `(req, res, next) => withLogContext(reqLogFields(req), async () => { try { …existing body…; withLogContext(sessionLogFields(sessionState), next) } catch (err) { next(err) } })`. Session state comes from `loadState` (no `assertRouteCheckedScope`).
- [ ] **Step 4: Run** the same command — Expected: PASS.
- [ ] **Step 5: Commit** — `feat(express): session middleware opens the request log context`

---

### Task 6: Remove eventsLog and internalError, port the lib, docs

**Files:**
- Delete: `packages/express/events-log.ts`, `packages/express/events-log.test.ts`
- Modify: `packages/express/index.ts` (drop the events-log export), `packages/express/session.ts` (remove `reqForLogs`, `onLogsError`, `internalError` import) and its three `reqForLogs` tests, `packages/node/observer.ts` (remove `internalError`; port its `console.*`)
- Port to `log`: `packages/express/error-handler.ts`, `ws-server.ts`, `req-perf.ts`, `req-origin.ts`, `packages/node/locks.ts`, `events-queue.ts`, `mongo.ts`, `http-agents.ts`, `upgrade-scripts.ts`, `ws-client.ts`, `test-spies.ts`, `packages/node/session.ts`
- Modify: `eslint.config.mjs`, `packages/node/README.md`, `packages/express/README.md`

**Interfaces:**
- Consumes: `log`, `DebugFn` (Tasks 1–4).
- Produces: `upgrade-scripts.ts` `exec: (db: Db, debug: DebugFn) => Promise<void>` (replaces `Debugger`).

Porting rules (apply mechanically):
- `internalError(code, err)` → `log.error(<short msg>, { code, err })`; when the second arg is a string message → `log.error(message, { code })`.
- error-handler: `status >= 500` → `log.error('failure while serving http request', { code: 'http', err })`; 403 → `log.warn(err.message, { code: 'forbidden-req' })`; 401 → `log.warn(err.message, { code: 'unauthorized-req' })`; `debugModule('http-errors')` → `log.debugNs('http-errors')`.
- `Debug(ns)` / `debugModule(ns)` → `log.debugNs(ns)` (same namespace strings).
- `console.log` → `log.info`, `console.warn` → `log.warn`, `console.error` → `log.error` with a code (`observer` metrics failure: `code: 'observer-metrics'`), `console.debug` → `debugNs`.
- `packages/utils/json-schema.ts` stays as is (utils is dependency-free and runs in browsers).

- [ ] **Step 1: Delete, port, and remove** per the lists above. Then `grep -rn "internalError\|eventsLog\|events-log\|from 'debug'\|console\.\(log\|warn\|error\|info\|debug\)" packages/node packages/express --include=*.ts | grep -v '\.d\.ts' | grep -v '\.test\.ts'` — Expected: only `import createDebug from 'debug'` in `packages/node/log.ts` and the `console` call in the Observer startup banner if kept (port it too; expected empty otherwise).
- [ ] **Step 2: eslint** — add a block `{ files: ['packages/node/**/*.ts', 'packages/express/**/*.ts'], ignores: ['**/*.test.ts', '**/test-fixtures/**'], rules: { 'no-console': 'error' } }`. Run `npm run lint` — Expected: no errors.
- [ ] **Step 3: READMEs** — lib-node: replace the `internalError` paragraph with a "Logging" section (usage, levels table, fields table, `code` must be static, context rules from the spec's Implicit context section, worker propagation with `getLogContext`/`withLogContext`, OTel notes incl. `OTEL_LOGS_EXPORTER=none`, migration table from the spec's Rollout step 1); add `pino-pretty` to the optional peers table. lib-express: remove the events-log row, mention that `session.middleware()` opens the log context.
- [ ] **Step 4: Full gate** — `npm run quality` — Expected: build, lint and all tests pass.
- [ ] **Step 5: Commit**

```bash
git add -A packages eslint.config.mjs
git commit -m "feat!: unified logger replaces eventsLog and internalError

BREAKING CHANGE: eventsLog (lib-express) and internalError (lib-node/observer) are removed, use log from @data-fair/lib-node/log.js. Log output is now JSON lines on stdout (pretty in dev), EVENTS_LOG_LEVEL is removed.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
