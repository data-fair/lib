# @data-fair/lib

A collection of javascript functions, components, types, etc to help work inside the data-fair stack.

All dependencies are declared as optional peer dependencies, you should install them yourself as required by your usage.

```sh
npm i @data-fair/lib
```

- [Types](#types)
  - [SessionState](#sessionstate)
  - [build.ts](#buildts)
- [Vue](#vue)
  - [useSession](#usesession)
- [Express](#express)
  - [session](#session)
- [Nodejs](#nodejs)
  - [Prometheus](#prometheus)


## Types

Some shared contracts, typescript types, etc.

### SessionState

Describes the current session, the logged in user, their organizations, etc. Usually used on the client side through useSession and on the server side through the session middleware.

```ts
import { type SessionState } from '@data-fair/lib/types/session-state'
```

### build.ts


This module implements a strategy similar to [Fastify](https://www.fastify.io/docs/latest/Reference/Validation-and-Serialization/) for validation and serialization. But it is a simple optional tool used to improve our apis, not a framework.

  - validation of body and query is encouraged (headers are not usually included because they are much less frequently manipulated on a per-route basis)
  - type casting : the schemas act as type guards
  - fast response serialization using [fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify)
  - use json-schema-to-typescript to create coherent schemas and types
  - a provided script helps building a typescript module with types, compiled validation function and compiled serialization function

Create a directory structure compatible with the build script:

```
types/
├── my-type
│   └── schema.json

```

Schemas can contain instructions to generate optional functionalities:
```json
  "x-exports": ["types", "validate", "stringify", "schema"],
```

In the types directory install build peer dependencies:
```sh
npm i -D ajv ajv-formats ajv-errors fast-json-stringify json-schema-to-typescript
```

In the types directory's package.json create this script:

```json
  "scripts": {
    "build": "node node_modules/@data-fair/lib/types/build.js ./ && tsc"
  },
```

Running this script should fill the types directory like so:

```
types/
├── my-type
│   ├── index.d.ts
│   ├── index.js
│   ├── index.ts
│   ├── schema.json
│   └── validate.js
```

In the nodejs service, install peer dependencies:

```sh
npm i ajv-i18n flatstr
```

Then in a route use the built modules:

```ts
import * as myBodySchema from 'types/my-body'
import * as myQuerySchema from 'types/my-query'
import * as myResponseSchema from 'types/my-response'

router.post('', asyncHandler(async (req, res) => {
  // after these lines body and query will be typed and the schema will be validated
  // a 400 error is thrown in case of failure
  const body = myQuerySchema.validate(req.body, req.session.lang, 'body')
  const query = myQuerySchema.validate(req.query, req.session.lang, 'query')
  
  const result = await ...

  res.type('json').send(myResponseSchema.stringify(result))
}))
```

## Vue

### useSession

This composable for Vue 3 provides a reactive session state and useful methods (login, logout, etc).

Install peer dependencies:

```sh
npm i @vueuse/integrations ofetch jwt-decode debug
```

Use as a nuxt plugin in js (plugins/session.js):

```ts
import { useSession } from '@data-fair/lib/vue/use-session'

export default defineNuxtPlugin(async (nuxtApp) => {
  const session = await useSession({req: nuxtApp.ssrContext?.event.node.req})
  return { provide: { session } }
})
```

Use as a nuxt plugin in typescript (plugins/session.ts):

```ts
import { useSession } from '@data-fair/lib/vue/use-session'
import { Session } from '@data-fair/lib/vue/use-session.d'

declare module '#app' {
  interface NuxtApp {
    $session: Session
  }
}
declare module 'vue' {
  interface ComponentCustomProperties {
    $session: Session
  }
}

export default defineNuxtPlugin(async (nuxtApp) => {
  const session = await useSession({req: nuxtApp.ssrContext?.event.node.req})
  return { provide: { session } }
})

```

## Express

### session

This middleware provides a thin layer for connecting to simple-directory using jwks, validating session tokens and casting to the SessionState type (see section payload). This module extends the standard express Request type to add the session property, this way all access to req.session is fully typed and safe.

Install peer dependencies:

```sh
npm i jsonwebtoken jwks-rsa express-async-handler cookie
```

```ts
import { initSession } from '@data-fair/lib/express/session'
export const app = express()
const session = initSession({ directoryUrl: config.directoryUrl })
app.use(session.auth)

router.get('', (req, res) => {
  if (!req.session.account) { res.status(401).send(); return }
  ...
})
```

## Nodejs

### Prometheus

Every Web service and all other processes (workers, etc) should expose prometheus metrics for monitoring.

Install peer dependencies:

```sh
npm i prom-client
```

Run a mini webserver to serve metrics:

```ts
import * as prometheus from '@data-fair/lib/node/prometheus'

...
await prometheus.start(config.prometheus.port)

...
await prometheus.stop()
```

Increment the shared "df_internal_error" metric and produce a corresponding log:

```ts
import * as prometheus from '@data-fair/lib/node/prometheus'

app.use(function (err: HttpError, _req: Request, res: Response, next: NextFunction) {
  ...
  if (status >= 500) {
    prometheus.internalError('http', 'failure while serving http request', err)
    // TODO: prometheus
  }
  ...
})
```

Define a custom metric and use it:

```ts
const myCounter = new Counter({
  name: 'df_my_counter',
  help: '...',
  labelNames: ['myLabel']
})

...
myCounter.inc({myLabel: 'label value'})
```

Define a custom global metric (a global metric value depends on a shared state instead of only the activity of the current process):

```ts
import * as prometheus from '@data-fair/lib/node/prometheus'

new client.Gauge({
  name: 'df_my_gauge',
  help: '...',
  registers: [prometheus.globalRegistry],
  async collect () {
    this.set(await db.collection('collection').estimatedDocumentCount())
  }
})
```