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

The simple (and most common) usage : you have a colorscheme, some data and want to generate an accompanying palette.

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

---

Your data doesn't follow the standard structure ? Or you simply want to generate a palette without any data to provide ?  
Well fear not, as `colors.js` also provides helper functions to generate color palettes !

**`generateGreyscale(start, end, steps)`**  
- Generates a palette composed of shades of grey, from a start to an end value, with a given number of steps (the bigger the steps, the more contrasted the palette will be).
- Returns an array of hex values.

```js
import { generateGreyscale } from '@data-fair/lib/color-scheme/colors.js'

const palette = generateGreyscale(0, 30, 5)
// palette will be an array of 30 hex values, from black to white
```

**`generateDynamicPalette(baseColors, paletteType, size)`**  
- Generates a palette of colors from a given array of base colors, with a given palette type and size.  
  - A complementary palette will generate a palette of colors that are complementary to the base colors.
  - A hues palette will generate a palette of colors that are different hues of the base colors.
- If the size is bigger than the amount of colors we can generate, shades of grey will be added to the palette.
- Returns an array of hex values.

```js
import { generateDynamicPalette } from '@data-fair/lib/color-scheme/colors.js'

const baseColors = ['#ff0000', '#00ff00', '#0000ff']
const paletteType = 'complementary' // or 'hues'
const size = 10

const palette = generateDynamicPalette(baseColors, paletteType, size)
// palette will be an array of 10 hex values, complementary to the base colors
```

**`generateHuesFromColor(colorHex, numColors = 10)`**  
- Generates a palette of colors that are different hues of a given color, with a given number of colors (defaults to 10).  
- Returns an array of hex values.

```js
import { generateHuesFromColor } from '@data-fair/lib/color-scheme/colors.js'

const colorHex = '#ff0000'
const numColors = 18

const palette = generateHuesFromColor(colorHex, numColors)
// palette will be an array of 18 hex values, different hues of red
```

**`generatePaletteFromColor(colorHex, numColors = 10)`**  
- Generates a palette of colors that are complementary and analogous to a given color, with a given number of colors (defaults to 10).  
- If the size is bigger than the amount of complementary colors we can generate, we will then add triadic colors to the palette.  
- Returns an array of hex values.

```js
import { generatePaletteFromColor } from '@data-fair/lib/color-scheme/colors.js'

const colorHex = '#ff0000'
const numColors = 30

const palette = generatePaletteFromColor(colorHex, numColors)
// palette will be an array of 30 hex values, complementary to red
```
