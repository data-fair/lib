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

## Websockets and identities

- Websocket server: [`data-fair-ws` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-ws).
- Identity webhooks (renames, GDPR deletions): [`data-fair-identities` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-identities).
- `reqIsInternal()` alone never grants a privilege: see the [`data-fair-security` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-security).
