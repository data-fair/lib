# @data-fair/lib-express

Express 5 middlewares and helpers shared by the web services of the data-fair stack: session reading, error handling, reverse-proxy aware request info, SPA serving, websocket server, identity webhooks.

## Install

```sh
npm i @data-fair/lib-express @data-fair/lib-node express
```

Peer dependencies: `@data-fair/lib-node@^2.15.0`, `express@5`, and `ws@8` (optional, only for `ws-server.js`).

## Modules

| Import path | Description |
| --- | --- |
| `@data-fair/lib-express` | Re-exports the small common pieces: `session.js`, `errorHandler`, events log, find utils, `httpError`, `req-origin.js`, `site.js`, `serve-spa.js`. |
| `@data-fair/lib-express/session.js` | `session` singleton: verifies the simple-directory session cookies, `session.middleware()`, `reqSession()` / `reqSessionAuthenticated()` / `reqAdminMode()` accessors. |
| `@data-fair/lib-express/error-handler.js` | Express error handler: maps errors to status codes, counts 5xx with `internalError`, hides 5xx details when `NODE_ENV=production`. |
| `@data-fair/lib-express/events-log.js` | `info` / `warn` / `alert` logs of sensitive events (audit, security), filtered by `EVENTS_LOG_LEVEL`. |
| `@data-fair/lib-express/req-origin.js` | Reverse-proxy aware request info: `reqOrigin()`, `reqHost()`, `reqIp()`, `reqIsInternal()`, `assertReqInternalSecret()`, `secretKeyMatches()`… |
| `@data-fair/lib-express/site.js` | `createSiteMiddleware(servicePathPart)`: extracts the site path prefix of the request, `reqSitePath()`, `reqSiteUrl()`. |
| `@data-fair/lib-express/serve-spa.js` | `createSpaMiddleware()`: serves a built SPA with UI config injection, cache headers and CSP. |
| `@data-fair/lib-express/find-utils.js` | `mongoSort()`, `mongoPagination()`, `mongoProjection()` from query parameters. |
| `@data-fair/lib-express/req-perf.js` | Per-route step durations in the `df_req_step_seconds` histogram. |
| `@data-fair/lib-express/ws-server.js` | Websocket server with channel subscriptions, fed by `@data-fair/lib-node/ws-emitter.js`. |
| `@data-fair/lib-express/identities/index.js` | `createIdentitiesRouter()`: receives the identity webhooks of simple-directory. |
| `@data-fair/lib-express/async-handler.js` | Deprecated: Express 5 handles async routes natively. |

## Session

The session reads the `id_token` cookies set by simple-directory and verifies them with its JWKS. Initialize it once with the URL of simple-directory, then apply the middleware:

```ts
import express from 'express'
import { session, reqSessionAuthenticated, errorHandler } from '@data-fair/lib-express'

session.init(config.privateDirectoryUrl)

const app = express()
app.use('/api', session.middleware()) // or { required: true }, { adminOnly: true }

app.get('/api/items', async (req, res) => {
  const { account, accountRole } = reqSessionAuthenticated(req) // 401 if not authenticated
  // ...
})

app.use(errorHandler)
```

Permissions, account roles, admin mode and the Vue side are covered by the [`data-fair-session` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-session).

### Scopes and bearer tokens

- `Authorization: Bearer <token>` is read before cookies, which are then never read. A token whose
  JWT header has `typ: at+jwt` is verified as an access token, and any failure is a 401. Any other
  bearer (empty, an API key, a session token, a token of another system) does not claim to be one:
  the request is anonymous.
- A token with a `scope` claim produces `sessionState.scopes` (a non-string claim is a 401). A service
  that enforces scopes calls `session.init(directoryUrl, lang, onlyDecode, { scopeAware: true })`;
  otherwise every scope-restricted session gets a 403. `scopeAware` is also honoured by lib-node's
  `SessionHandler` (`readStateFromCookie` / `readStateFromBearer`), so consumers that use it directly
  are closed by default too.
- An access token carries at most one organization membership (none = personal account); a token
  with several is refused with a 401.
- `requireScope('datasets:read')` guards a route. It reads the session through
  `session.reqWithScope(req, accepted)` (cached on the request), so it needs no
  `session.middleware()`. `assertReqScope(req, ...)` is the synchronous variant for routes
  behind the middleware. `hasScope` / `assertScope` do the same in code. A session without scopes is unrestricted.
  A granted umbrella such as `datasets` already covers `datasets:read`, so it need not be listed.
  "Write implies read" is expressed by listing the accepted scopes, e.g.
  `requireScope(['datasets:read', 'datasets:write'])` (any one of them is enough).
  Build these lists with `defineScopes` of `@data-fair/lib-common-types/scopes.js` rather than by
  hand: it adds the umbrella and the global tier scopes (`all:read`, `all:write`, `all:admin`).
- simple-directory signs scoped tokens and access tokens with a separate key set
  (`/.well-known/scoped-jwks.json`, key ids `scoped-...`). Older libs only know
  `/.well-known/jwks.json` and refuse those tokens, so a scoped token never acts with full role
  power on a service that was not upgraded. Access tokens split into cookies are refused, scoped
  tokens cannot carry superadmin claims and must expire, only RS256 is accepted.
- In a scope-aware service every route that reads the session must check a scope first:
  `requireScope(...)` / `assertReqScope(req, ...)`, or `allowAnyScope` / `markScopeChecked(req)`
  when any scope is fine (session machinery, public resources). Otherwise the session accessors
  (`session.req()`, `reqSession()` and friends) answer 403 to scoped sessions, also when only the
  raw `user.scope` claim is present. Unrestricted sessions are not concerned.
  - Mark scopes per route, with the narrowest scope the route needs.
  - Never apply `allowAnyScope` app-wide, outside the session machinery itself: it would open
    every route to every scope.
  - A mark lasts for the whole request: a route that checked a scope and calls `next()` into
    another handler passes the mark on to it.
- Scoped operations are usable from browsers on other domains: mount `session.bearerCors()` before
  the routes of a scope-aware service. A call carrying `Authorization: Bearer` is answered from any
  origin (`Access-Control-Allow-Origin: *`, never with credentials) and its preflight is answered
  directly. A bearer token is not ambient, so the origin adds nothing to it: its scopes are what
  limit it. Calls without a bearer token get no CORS header. The middleware does nothing unless
  the session is `scopeAware`, so enforcing scopes and opening scoped operations to browsers go
  together.
- Websockets (`ws-server`) refuse scoped sessions unless the service passes
  `start(server, db, canSubscribe, { channelScopes })`: `channelScopes(channel)` returns the scopes
  accepted on that channel (any of them), or `undefined` to refuse scoped sessions there (403).
  `canSubscribe` still applies afterwards. Scopes are checked per subscribe message, nothing is
  marked on the upgrade request.
- `session.reqForLogs(req)` reads the session for logging only; never use it for authorization.
  It never throws and ignores the scope check requirement; 401/403 refusals are silent, other
  errors are reported as internal errors.
- `session.readState`, `readStateFromCookie` and `readStateFromBearer` are raw readers: no route
  scope guard and no per-request cache. They are not meant for authorization.

## Websockets and identities

- Websocket server: [`data-fair-ws` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-ws).
- Identity webhooks (renames, GDPR deletions): [`data-fair-identities` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-identities).
- `reqIsInternal()` alone never grants a privilege: see the [`data-fair-security` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-security).
