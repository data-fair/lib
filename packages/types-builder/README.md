# @data-fair/lib-types-builder

The `df-build-types` command: it compiles the JSON schemas of a project into TypeScript types, standalone ajv validation functions, resolved schemas and vjsf form components. Data-fair services (data-fair, events, portals, processings…) and processing plugins run it as their `build-types` script, so the schema stays the single source of truth.

## Install

```sh
npm i -D @data-fair/lib-types-builder
```

Optional peer dependency: `@koumoul/vjsf-compiler` (`^1.5.0`), only needed by the `vjsf` and `compiledLayout` exports.

The generated validators import `@data-fair/lib-validation` and ajv runtime helpers at run time: add `@data-fair/lib-validation` and `ajv-formats` to the regular `dependencies` of the code that runs them.

## Modules

| Entry | Description |
| --- | --- |
| `df-build-types [dir]` (bin) | Scans `dir` (default `./`) for `schema.json`, `schema.js` or `schema.ts` files and generates their exports. |

## Usage

Put each schema in its own directory, and wire the command in `package.json`:

```
api/types/
├── subscription/
│   └── schema.js        # or schema.json / schema.ts, default export
└── webhook/
    └── schema.json
```

```json
"scripts": {
  "build-types": "df-build-types ./"
}
```

Run it from the project root (it reads `./package.json` and keeps a cache in `./node_modules/.cache`). `node_modules`, `data` and dot directories are not scanned. A `schema.ts` is loaded with a plain `import()`, which relies on Node.js native type stripping.

### Options

| Option | Description |
| --- | --- |
| `--vjsf-dir <dir>` | Where the `vjsf` export writes its `.vue` components (required by that export). |
| `--no-cache` | Rebuild every schema; by default a schema whose content did not change is skipped. |
| `--mjs` | Write `.mjs` files instead of `.js`. |

### What it generates

For each schema, in a `.type/` directory next to it (gitignore `.type/`, never commit it):

- `index.js` and `index.d.ts` with the requested exports;
- `validate.js`, `resolved-schema.json`, `local-defs-schema.json`, `compiled-layout-<locale>.js` depending on the exports.

If the directory has no `index.js`, `index.ts` or `index.d.ts`, it also creates an `index.js` and `index.d.ts` that re-export `./.type/index.js`. Write your own `index.ts` to add code next to the generated exports.

The main type is named after the schema `title` (PascalCase), or the directory name. The schema `$id` defaults to the directory name.

### Schema keywords

`x-exports` lists what to generate, `["types", "validate"]` by default:

| Value | Generates |
| --- | --- |
| `types` | TypeScript types (json-schema-to-typescript). |
| `validate` | `validate(data)` type guard, `assertValid(data, options?)` and `returnValid(data, options?)`, which throw a localized 400 error (see [`@data-fair/lib-validation`](https://www.npmjs.com/package/@data-fair/lib-validation)). |
| `schema` | `schema` export, the schema as written. |
| `resolvedSchema` | `resolvedSchema` export, all `$ref` dereferenced. |
| `resolvedSchemaJson` | `.type/resolved-schema.json`. |
| `localDefsSchema` | `localDefsSchema` export, the external `$ref` gathered under a local `$defs`. |
| `localDefsSchemaJson` | `.type/local-defs-schema.json`. |
| `vjsf` | A compiled vjsf form component `vjsf-<name>.vue` in `--vjsf-dir` (one per locale plus a wrapper taking a `locale` prop when there are several locales). |
| `compiledLayout` | `.type/compiled-layout-<locale>.js` exporting `compiledLayout`. |

Other keywords: `x-jstt` (json-schema-to-typescript options), `x-ajv` (ajv options), `x-vjsf` (vjsf compiler options, `compName` renames the component), `x-vjsf-locales` (default `["fr"]`).

`$ref` can target the other schemas of the project by `$id`, and the shared schemas of [`@data-fair/lib-common-types`](https://www.npmjs.com/package/@data-fair/lib-common-types) (`https://github.com/data-fair/lib/session-state`, `account`, `application`, `event`, `catalog`, `theme`, `access-ref`).

### Using the generated code

```ts
// '#types/*' is a package.json "imports" alias to the types directory
import type { Subscription } from '#types/subscription/index.js'
import { returnValid } from '#types/ui-log/index.js'

const uiLog = returnValid(req.body, { lang: 'fr', name: 'body' })
```

See also the [vjsf skill](https://github.com/data-fair/lib/tree/main/skills/vjsf) for form schemas and the [data-fair-processing skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-processing) for processing plugins.
