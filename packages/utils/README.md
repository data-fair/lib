# @data-fair/lib-utils

Small dependency-less or dependency-light utility functions shared by the data-fair stack: services (Node.js), Vue applications and processings. Every module is a standalone ES module imported by its file path.

## Install

```sh
npm i @data-fair/lib-utils
```

Optional peer dependency: `dayjs` (v1), only needed by `format/date-tz.js` and `format/field.js`.

`marked-vuetify.js`, `sanitize-html.js` and `eslint/recommended.js` only import types from `marked`, `sanitize-html` and `eslint`: install those packages yourself where you use them.

## Modules

| Import path | Description |
| --- | --- |
| `@data-fair/lib-utils/http-errors.js` | `httpError(status, message?, { expose? })` and the `HttpError` class, without costly stack traces for 4xx in production. |
| `@data-fair/lib-utils/clone.js` | Fast deep clone (a light ESM copy of rfdc) handling dates, maps, sets and buffers. |
| `@data-fair/lib-utils/json-schema.js` | `jsonSchema(schema)` wrapper to derive schemas (pick/remove properties, PATCH and PUT variants…), `resolveXI18n`, `makeLocalDefs`. |
| `@data-fair/lib-utils/micro-template.js` | `microTemplate(txt, params)` replaces `{param}` placeholders in a string. |
| `@data-fair/lib-utils/event-promise.js` | `eventPromise(emitter, event, { timeout? })` waits for one event of a Node.js `EventEmitter` (rejects on `error` or after 60s by default). |
| `@data-fair/lib-utils/marked-vuetify.js` | `marked` extension rendering markdown with Vuetify classes (`markedVuetify`, `createMarkedVuetify({ density, headingClasses })`). |
| `@data-fair/lib-utils/sanitize-html.js` | `getSanitizeOpts(defaults)` shared `sanitize-html` options (adds `img`, `class` attributes). |
| `@data-fair/lib-utils/filters/index.js` | Converts the shared `Filtres` filter objects to REST params (`filter2params`, `filters2params`) or to a lucene query string (`filter2qs`, `filters2qs`, deprecated); `escape`, `filterByDate`. |
| `@data-fair/lib-utils/format/field.js` | Formats dataset column values for display (`formatFieldValue`, `formatFieldValues`, `formatField`, `getFieldLabel`). |
| `@data-fair/lib-utils/format/bytes.js` | `formatBytes(bytes, locale = 'fr')` human readable sizes (`1,2 Mo`). |
| `@data-fair/lib-utils/format/date-tz.js` | `dateTimeInOwnTimeZone(value)` returns a dayjs date kept in the offset carried by the string; `explicitOffsetMinutes`. |
| `@data-fair/lib-utils/format/attachment.js` | `attachmentFilename(url)` and `webPageLabel(url)` short labels for attachment and web page columns. |
| `@data-fair/lib-utils/maps.js` | `bbox2zoom(bbox)` and `svgToDataURL(svgStr)`. |
| `@data-fair/lib-utils/in-iframe.js` | `inIframe` boolean, true when the page runs inside an iframe (browser only). |
| `@data-fair/lib-utils/webgl-supported.js` | `isWebglSupported()` (browser only). |
| `@data-fair/lib-utils/eslint/recommended.js` | ESLint flat config forbidding imports of modules replaced by the lib (`rfdc`, `http-errors`, `event-to-promise`…). |

## Usage

### HTTP errors

```ts
import { httpError } from '@data-fair/lib-utils/http-errors.js'

if (!dataset) throw httpError(404, 'dataset not found')
// a 5xx message is hidden by the error handler unless exposed explicitly
throw httpError(502, 'remote service unavailable', { expose: true })
```

### Deriving schemas

`jsonSchema()` clones the schema, every method returns the wrapper so calls chain, and `.schema` holds the result.

```ts
import jsonSchema from '@data-fair/lib-utils/json-schema.js'
import pageSchema from '#types/page/schema.js'

export default {
  ...jsonSchema(pageSchema)
    .pickProperties(['title', 'owner'])
    .removeRequired()
    .schema,
  $id: 'https://github.com/data-fair/portals/pages/patch-req-body',
  'x-exports': ['validate', 'types']
}
```

`makePatchSchema(properties?)` and `makePutSchema()` produce the usual PATCH (nothing required, optional properties nullable, readOnly removed) and PUT (readOnly never required) variants.

### Markdown with Vuetify classes

```ts
import { marked } from 'marked'
import sanitizeHtml from 'sanitize-html'
import { markedVuetify } from '@data-fair/lib-utils/marked-vuetify.js'
import { getSanitizeOpts } from '@data-fair/lib-utils/sanitize-html.js'

marked.use(markedVuetify)
const html = sanitizeHtml(marked.parse(markdown) as string, getSanitizeOpts(sanitizeHtml.defaults))
```

### ESLint

```js
// eslint.config.js
import neostandard from 'neostandard'
import dfLibRecommended from '@data-fair/lib-utils/eslint/recommended.js'

export default [
  ...dfLibRecommended,
  ...neostandard({ ts: true })
]
```
