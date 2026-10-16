# @data-fair/lib-processing-dev

Development utilities for data-fair processing plugins: build a processing context to run a plugin from its tests against a real data-fair instance.

## Install

```sh
npm i -D @data-fair/lib-processing-dev ws
```

No peer dependencies. `tests-utils.js` uses the websocket client of `@data-fair/lib-node`, which needs `ws` (an optional peer dependency of `@data-fair/lib-node`).

## Modules

| Import path | Description |
| --- | --- |
| `@data-fair/lib-processing-dev/tests-utils.js` | `context()`: builds a `ProcessingContext` for tests (colored logs, axios and websocket client authenticated on data-fair with an API key, `patchConfig`, `cleanup`). |

## tests-utils.js

`context(initialContext, config, debug?, testDebug?)`:

- `initialContext`: the parts of the context the plugin reads (`pluginConfig`, `processingConfig`, `secrets`, `tmpDir`…),
- `config`: `{ dataFairUrl, dataFairAPIKey }`, the data-fair instance to run against,
- `debug` / `testDebug`: print `log.debug` / `log.testDebug` messages.

```ts
import { context as testContext } from '@data-fair/lib-processing-dev/tests-utils.js'
import * as processing from '../index.ts'

const context = testContext({
  pluginConfig: { apiKey: config.apiKey },
  processingConfig: {
    datasetMode: 'create',
    dataset: { title: 'Test dataset' }
  },
  tmpDir: 'data'
}, config, false)

await processing.run(context)
await context.cleanup() // closes the websocket, deletes the dataset created through patchConfig
```

`context.axios` only partly mimics the axios instance of the processings worker (no retries, no SSRF protection, different error shape). The [`data-fair-processing` skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-processing) details the differences, the `prepare` / `run` / `stop` contract and how processing tests are set up.
