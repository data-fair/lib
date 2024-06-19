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
  - [Observer](#observer)
  - [Upgrade scripts](#upgrade-scripts)
- [Processings](#processings)
  - [tests-utils.js](#tests-utilsjs)
- [Colors](#colors)
  - [colors.js](#colorsjs)


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
npm i -D ajv ajv-formats ajv-errors fast-json-stringify json-schema-to-typescript @bcherny/json-schema-ref-parser
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
npm i @vueuse/integrations ofetch jwt-decode debug universal-cookie
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
import { useSession, type Session } from '@data-fair/lib/vue/use-session'

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
npm i jsonwebtoken jwks-rsa cookie
```

```ts
import { asyncHandler, initSession } from '@data-fair/lib/express/index.js'
export const app = express()
const session = initSession({ directoryUrl: config.directoryUrl })
app.use(session.auth)

router.get('', asyncHandler(async (req, res) => {
  if (!req.session.account) { res.status(401).send(); return }
  ...
}))
```

## Nodejs

### Observer

Very light web server to expose prometheus metrics, export a cpu profile and maybe other incoming obervability features.

Install peer dependencies:

```sh
npm i prom-client debug
```

Run a mini webserver to observability functionalities:

```ts
import {startObserver, stopObserver} from '@data-fair/lib/node/observer.js'

...
await startObserver(port) // default port is 9090

...
await stopObserver()
```

Increment the shared "df_internal_error" metric and produce a corresponding log:

```ts
import { internalError } from '@data-fair/lib/node/observer.js'

internalError('http', 'failure while serving http request', err)
```

Define a custom prometheus metric and use it:

```ts
const myCounter = new Counter({
  name: 'df_my_counter',
  help: '...',
  labelNames: ['myLabel']
})

...
myCounter.inc({myLabel: 'label value'})
```

Define a custom service-level metric (a service-level metric value depends on a shared state of the system instead of only the activity of the current process):

```ts
import { servicePromRegistry } from '@data-fair/lib/node/observer.js'

new client.Gauge({
  name: 'df_my_gauge',
  help: '...',
  registers: [servicePromRegistry],
  async collect () {
    this.set(await db.collection('collection').estimatedDocumentCount())
  }
})
```

### Upgrade scripts

Scripts must be written in 'upgrade/{CURRENT VERSION}' directory. All scripts with a version number greater than or equal to the version of the service registered in the database will executed.

The scripts will be run automatically at startup of service.

Scripts are simple nodejs modules that export an object following UpgradeScript interface:

  - description: A short description string.
  - exec: An async function. It accepts a mongodb connection as first parameter and debug log method as second parameter.

WARNING: theoretically all scripts are run only once. But this cannot be strictly ensured therefore scripts should be idempotent. It means that running them multiple times should not create problems.

Install peer dependencies:

```sh
npm i semver debug
```

Run the scripts somewhere in app intialization:

```ts
import upgradeScripts from '@data-fair/lib/node/upgrade-scripts.js'

await upgradeScripts(db)
```


## Processings

### tests-utils.js
This utility provides a context generator for processing tests.

Install peer dependencies:

```sh
npm i --save-dev dayjs ws draftlog axios
```

In a classic processing test file, import with :
```js
import testsUtils from '@data-fair/lib/processings/tests-utils.js'
```

Or for a commonjs processing test file, import with :
```js
const testsUtils = require('@data-fair/lib/processings/tests-utils.js')
```

Then use the utility to generate a context and test the processing:
```js
const context = testsUtils.context({
  pluginConfig: {
    apiKey: config.apiKey
  },
  processingConfig: {
    datasetMode: 'create',
    dataset: { title: 'Titre du jeu de donnée' },
    // Autres paramètres de configuration
  },
  tmpDir: 'data'
}, config, false)

await processing.run(context)
```


## Colors

### colors.js

A simple yet complete color palette generator.

Install peer dependencies :

```sh
npm i chroma-js
```

Use case : you have a colorscheme, some data and want to generate an accompanying palette.

**`getColors(colorscheme, data, size, vuetifyColors = null)`**
- Generates a palette of colors from a given colorscheme, data and size.
- If vuetifyColors is provided, the palette will be composed of the app's theme primary and secondary colors (case where the colorscheme type is vuetify-theme).
- Returns an array of hex values.

```js
import getColors from '@data-fair/lib/color-scheme/colors.js'

const colorscheme = {
  type: 'qualitative',
  name: 'Accent'
}
const data = {
  ... // some data
}

const palette = getColors(colorscheme, data, data.results.length)
```

The colorscheme is a standardized object that describes the colorscheme as a json-schema. More info about the structure it must follow can be found here : [`color-scheme/schema.json`](https://github.com/data-fair/lib/blob/main/src/color-scheme/schema.json)
