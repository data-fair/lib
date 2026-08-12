# File templates — data-fair processing TS/ESM migration

Exact boilerplate for the modern template (Node 24, ESM, native `--experimental-strip-types`, no build step). Replace `<plugin-name>` (e.g. `transform-csv`) and `<Plugin title>`. Reference implementations: `processing-hello-world` (canonical), `processing-majic` (download-zip → transform-csv → upload, closest to most plugins).

## package.json — the parts that change

```jsonc
{
  "main": "index.ts",              // was index.js
  "type": "module",                // add
  "scripts": {
    "lint": "eslint .",
    "lint-fix": "eslint --fix .",
    "prepare": "husky || true",
    "build-types": "export NODE_OPTIONS='--experimental-strip-types' && df-build-types ./config && df-build-types ./types",
    "test-base": "NODE_ENV=test node --experimental-strip-types --test-force-exit --test-concurrency=1 --test --test-reporter=spec --test-reporter-destination=stdout",
    "test": "npm run test-base test-it/*.ts"
  },
  "imports": { "#types/*": "./types/*" },   // add "#config": "./lib/config.ts" only if code reads runtime config
  "license": "AGPL-3.0-only",
  "dependencies": { /* keep RUNTIME deps; drop node-builtin shims (util, path) AND grep-confirmed-unused deps (dayjs, draftlog, iconv-lite); add @types/* under devDeps. Prefer csv-parse + csv-stringify over the combined `csv` package. */ },
  "devDependencies": {
    "@commitlint/cli": "^19.8.1",
    "@commitlint/config-conventional": "^19.8.1",
    "@data-fair/lib-common-types": "^1.21.0",
    "@data-fair/lib-processing-dev": "^0.3.0",
    "@data-fair/lib-types-builder": "^1.14.0",
    "@data-fair/lib-utils": "^1.11.0",
    "@types/fs-extra": "^11.0.4",
    "@types/pump": "^1.1.3",
    "config": "^4.4.1",
    "debug": "^4.4.0",
    "eslint": "^9.26.0",
    "husky": "^9.1.7",
    "neostandard": "^0.12.1",
    "typescript": "^5.8.3",
    "ws": "^8.19.0"
  },
  "files": ["processing-config-schema.json", "./lib/**/*"]
}
```

Removed devDeps: `@data-fair/processings-test-utils`, `mocha`, `standard`, old `eslint@8`.
**Do NOT change `version`** (releases are automated).

**LICENSE:** the field becomes `AGPL-3.0-only` — also replace the `LICENSE` file content with the AGPL-3.0-only text. Never delete `LICENSE`, and never leave the field and file inconsistent.

The MIT→AGPL switch is a **standalone org policy, not a side effect of this migration**: it applies by default to every processings *and* catalogs plugin, migrated or not. Doing it outside a TS migration is legitimate.

Copy the LICENSE from a known-good source — `registry/LICENSE` or `processing-datasets-list/LICENSE` (md5 starts `4ae09d45`, 661 lines, verbatim FSF text).

⚠️ Do **not** copy from `data-fair`, `agents`, `metrics` or `notify`: those carry a reformatted variant whose FSF copyright header was replaced by `Copyright (C) 2020 Koumoul`, which contradicts the "changing it is not allowed" clause the file itself still contains, and which also has a `not to s ue` text corruption. Verify after copying:

```sh
md5sum LICENSE | cut -c1-8            # → 4ae09d45
grep -c 'to s ue' LICENSE             # → 0
grep -c 'Free Software Foundation, Inc.' LICENSE   # → ≥1
```

The project's own copyright belongs in the README or a `NOTICE` file, never inside `LICENSE`.

## tsconfig.json (new)

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "moduleResolution": "NodeNext",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "allowJs": true,
    "checkJs": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "exclude": ["node_modules", ".type", "test-it"]
}
```

## eslint.config.mjs (new) — replaces .eslintrc.js + .eslintignore (delete both)

```js
import neostandard from 'neostandard'
import dfLibRecommended from '@data-fair/lib-utils/eslint/recommended.js'

export default [
  { ignores: ['config/*', '**/.type/', 'data/', 'node_modules/', 'test/'] },
  ...dfLibRecommended,
  ...neostandard({ ts: true })
]
```

## commitlint.config.ts (new)

```ts
export default { extends: ['@commitlint/config-conventional'] }
```

## .nvmrc (new)

```
24
```

## .husky/ (new — three files, no shebang needed with husky v9)

`.husky/pre-commit`:
```
npm run lint
```
`.husky/commit-msg`:
```
npx --no-install commitlint --edit ""
```
`.husky/pre-push`:
```
npm run test
```

## .gitignore — ensure these lines

```
node_modules/
.type/
data/
```
`.type/` dirs are **generated** by `df-build-types`; never commit them.

## config/ — default.js → default.mjs, plus config/type/

`config/default.mjs`:
```js
// Override these values locally by creating a config/local-test.mjs file (gitignored)
export default {
  /** Base URL of the data-fair instance to connect to. @example "https://staging-koumoul.com/data-fair" */
  dataFairUrl: null,
  /** API key for authenticating requests to data-fair. Generate one in your data-fair settings. */
  dataFairAPIKey: null
}
```

`config/type/schema.ts` (JSON-schema-as-TS; `df-build-types` turns it into `config/type/.type/`):
```ts
export default {
  $id: 'https://github.com/data-fair/processing-<plugin-name>/config',
  'x-exports': ['types', 'validate'],
  type: 'object',
  title: 'Config',
  additionalProperties: false,
  required: ['dataFairUrl', 'dataFairAPIKey'],
  properties: {
    dataFairUrl: { type: 'string' },
    dataFairAPIKey: { type: 'string' }
  }
}
```

`config/type/index.ts`:
```ts
export * from './.type/index.js'
```

`config/local-test.mjs` stays gitignored; convert its `module.exports = {}` to `export default {}`.

## types/processingConfig/ (new) — types generated from the existing JSON schema

`types/processingConfig/schema.ts`:
```ts
export { default } from '../../processing-config-schema.json' with { type: 'json' }
```

`types/processingConfig/index.ts`:
```ts
export * from './.type/index.js'
```

## index.ts (new) — thin entry, replaces index.js

```ts
import type { PrepareFunction, RunFunction } from '@data-fair/lib-common-types/processings.js'
import type { ProcessingConfig } from './types/processingConfig/index.ts'

export const prepare: PrepareFunction<ProcessingConfig> = async (context) => {
  const prepare = (await import('./lib/prepare.ts')).default
  return prepare(context)
}

export const run: RunFunction<ProcessingConfig> = async (context) => {
  const { run } = await import('./lib/execute.ts')
  return run(context)
}

export const stop = async () => {
  const { stop } = await import('./lib/execute.ts')
  return stop()
}
```

## lib/prepare.ts (new) — no-op if the plugin has no secrets

```ts
import type { PrepareFunction } from '@data-fair/lib-common-types/processings.js'
import type { ProcessingConfig } from '#types/processingConfig/index.ts'

const prepare: PrepareFunction<ProcessingConfig> = async ({ processingConfig, secrets }) => {
  return { processingConfig, secrets }
}

export default prepare
```

## lib/execute.ts — the former `index.js` run(), typed, with graceful stop

```ts
import type { RunFunction, ProcessingContext } from '@data-fair/lib-common-types/processings.js'
import type { ProcessingConfig } from '#types/processingConfig/index.ts'
import download from './download.ts'
import process, { setShouldBeStopped, isStopped } from './process.ts'
import upload from './upload.ts'

export const stop = async (): Promise<void> => { setShouldBeStopped(true) }

export const run: RunFunction<ProcessingConfig> = async (context) => {
  const { processingConfig, tmpDir, axios, log, patchConfig } = context
  setShouldBeStopped(false)

  await download(processingConfig, tmpDir, axios, log)
  await process(processingConfig, tmpDir, log)

  if (isStopped()) {                       // don't publish a truncated dataset
    await log.warning('Traitement interrompu, pas de publication')
    return
  }

  await upload(processingConfig, tmpDir, axios, log, patchConfig)

  if (processingConfig.clearFiles) await fs.emptyDir(tmpDir)
}
```

Stop flag lives in the streaming module (`process.ts`):
```ts
let shouldBeStopped = false
export const setShouldBeStopped = (v: boolean) => { shouldBeStopped = v }
export const isStopped = () => shouldBeStopped
// inside the row transform stream: if (shouldBeStopped) { /* stop pumping */ }
```

## Converting the business-logic lib/*.js files

- `module.exports = fn` → `export default fn` ; `module.exports = { a, b }` → `export const a = ...; export const b = ...`
- `const x = require('y')` → `import x from 'y'` (default) or `import { x } from 'y'` (named)
- `require('./transforms/' + t + '.js')` → `(await import('./transforms/' + t + '.ts')).default` (dynamic import returns a Promise)
- schema/data `.js` files (`module.exports = [ ... ]`) → `export default [ ... ]`, rename `.js` → `.ts`
- add types on function params: `(item: Record<string, string>)`, context params `: ProcessingContext<ProcessingConfig>`
- security: replace `exec(\`unzip ... ${x}\`)` with `execFile('unzip', ['-o', file, '-d', dir])` (no shell injection)
- always close file descriptors / end write streams even on the stop/early-return path

## test/test.js → test-it/index.ts (+ optional per-unit *.test.ts)

```ts
import { describe, it } from 'node:test'
import assert from 'assert'
import processingConfigSchema from '../processing-config-schema.json' with { type: 'json' }

describe('<Plugin title> processing', () => {
  it('exposes a processing config schema for users', () => {
    assert.equal(processingConfigSchema.type, 'object')
  })
})
```
Real run tests import `../index.ts` and use `@data-fair/lib-processing-dev/tests-utils.js` `testUtils.context({...}, config, false)`. Delete the old `test/` folder.

## .github/workflows/ (new)

`publish-staging.yml`:
```yaml
name: Publish main to Staging Registry
on:
  push:
    branches: [main, master]
permissions:
  contents: read
jobs:
  publish:
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - uses: data-fair/registry/.github/actions/publish-plugin@main
        with:
          registry-url: https://staging-koumoul.com/registry
          category: processing
          api-key: ${{ secrets.REGISTRY_API_KEY }}
```

`publish-production.yml`:
```yaml
name: Publish to Registry
on:
  push:
    tags: ['v*']
permissions:
  contents: read
jobs:
  publish:
    runs-on: ubuntu-latest
    if: github.ref_type == 'tag' && github.event_name == 'push'
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: data-fair/registry/.github/actions/publish-plugin@v0.4.0
        with:
          registry-url: https://koumoul.com/registry
          category: processing
          api-key: ${{ secrets.REGISTRY_API_KEY }}
```
