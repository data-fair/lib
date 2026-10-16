# @data-fair/lib-validation

Small helpers to apply [ajv](https://ajv.js.org/) validation functions and turn their errors into readable, localized (fr/en, via `ajv-i18n`) messages. It is the runtime used by the `assertValid` / `returnValid` functions that [`@data-fair/lib-types-builder`](https://www.npmjs.com/package/@data-fair/lib-types-builder) generates, so a service that runs generated validators needs it installed.

## Install

```sh
npm i @data-fair/lib-validation
```

No peer dependencies.

## Modules

| Import path | Description |
| --- | --- |
| `@data-fair/lib-validation` | `assertValid(validate, data, options?)`, `errorsText(errors, varName?, lang?)` and the `AssertValidOptions` type. |

## Usage

In most cases you do not call this package directly: use the `assertValid` / `returnValid` exported by a type generated with `df-build-types`, they take the same options.

```ts
import { returnValid } from '#types/ui-log/index.js'

const uiLog = returnValid(req.body, { lang: 'fr', name: 'body' })
```

With any ajv `ValidateFunction`:

```ts
import { assertValid, errorsText } from '@data-fair/lib-validation'

// throws httpError(400, message) from @data-fair/lib-utils/http-errors.js
assertValid<MyType>(validate, data, { lang: 'en', name: 'body' })

// throws a plain Error instead of a 400, for data that does not come from a client (config, etc.)
assertValid<MyConfig>(validate, config, { lang: 'en', name: 'config', internal: true })

// only build the message
if (!validate(data)) console.log(errorsText(validate.errors, 'data', 'en'))
```

Options: `lang` (`'fr'` by default, `'en'` supported), `name` (prefix of the message, `'data'` by default), `internal`.
