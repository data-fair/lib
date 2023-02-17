# @data-fair/lib

A collection of javascript functions, components, types, etc to help work inside the data-fair stack.

All dependencies are declared as optional peer dependencies, you should install them yourself as required by your usage.

```sh
npm i @data-fair/lib
```

- [Types](#types)
  - [SessionState](#sessionstate)
- [Vue](#vue)
  - [useSession](#usesession)
- [Express](#express)
  - [session](#session)
  - [reqBuilder](#reqbuilder)


## Types

Some shared contracts, typescript types, etc.

### SessionState

Describes the current session, the logged in user, their organizations, etc. Usually used on the client side through useSession and on the server side through the session middleware.

```ts
import { type SessionState } from '@data-fair/lib/types/session-state'
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

### reqBuilder

This module implements a strategy similar to [Fastify](https://www.fastify.io/docs/latest/Reference/Validation-and-Serialization/) for validation and serialization. But it is a simple optional tool used to improve our apis, not a framework.

  - validation of body, query and response
  - type casting
    - the schemas act as type guards
    - the user is responsible for ensuring coherence of the schema and the type (see json-schema-to-typescript, json-schema-to-ts, typebox, etc.)
  - fast response serialization using [fast-json-stringify](https://www.npmjs.com/package/fast-json-stringify)
  - headers are not included for concision and because they are much less frequently manipulated on a per-route basis

Install peer dependencies:

```sh
npm i ajv ajv-formats ajv-errors ajv-i18n fast-json-stringify flatstr
```

```ts
import { reqBuilder } from '@data-fair/lib/express/req'

const listReq = reqBuilder<MyQuery, MyBody, MyResponse>(myQuerySchema, myBodySchema, myResponseSchema)
router.post('', asyncHandler(async (req, res) => {
  // query and body are safe and typed with user defined MyQuery and MyBody types
  // send is a function that expects a value with type MyResponse and will perform fast serialization into the HTTP response
  const { query, body, send } = listReq(req, res)
  const results = await ...
  send({ count: results.length, results })
}))
```