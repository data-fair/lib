# @data-fair/lib

Shared code of the [data-fair](https://github.com/data-fair) stack: functions, types, json schemas, Express middlewares, Vue composables and Vuetify components used by every service (data-fair, portals, simple-directory, events, processings, catalogs…) and by applications and processing plugins.

This is an npm-workspaces monorepo. Each package is published independently in the `@data-fair` namespace with the `lib-` prefix; its README documents its modules and usage.

| Package | What it's for |
| --- | --- |
| [`@data-fair/lib-utils`](./packages/utils) | Dependency-less or dependency-light utility functions, usable in Node and in the browser. |
| [`@data-fair/lib-validation`](./packages/validation) | Small validation utils, mostly wrapping ajv. |
| [`@data-fair/lib-common-types`](./packages/common-types) | Shared json schemas and the types and validation functions built from them (session, account, event…). |
| [`@data-fair/lib-types-builder`](./packages/types-builder) | The `df-build-types` tool: builds types, validation functions and resolved schemas from json schemas. |
| [`@data-fair/lib-node`](./packages/node) | Server-side Node.js utilities: SSRF-safe HTTP clients, observer and metrics, upgrade scripts, websockets, mongo, locks… |
| [`@data-fair/lib-express`](./packages/express) | Express middlewares and helpers: session, errors, websocket server, SPA serving, identities webhooks… |
| [`@data-fair/lib-vue`](./packages/vue) | Composables and utilities for Vue 3 applications: session, fetch, reactive search params, websockets, notifications… |
| [`@data-fair/lib-vuetify`](./packages/vuetify) | Vuetify components shared by the stack UIs: personal menu, owner pickers, theme and language switchers… |
| [`@data-fair/lib-processing-dev`](./packages/processing-dev) | Development and test utilities for processing plugins. |
| [`@data-fair/lib-dev`](./packages/dev) | The dev environment of the services, for humans and agents: `df-dev` (setup, zellij session, status, logs, restart), `df-worktree`, `df-mem-cap`. |

## Coding agent skills

[`skills/`](./skills) holds skills for AI coding agents working in the data-fair stack (sessions, websockets, upgrade scripts, security, applications, processings, portals…). See [`skills/README.md`](./skills/README.md) for the list and how to install them.

## Contributing

Building, testing, hooks and releasing are described in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

## License

[MIT](./LICENSE)
