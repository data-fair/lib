# @data-fair/lib-common-types

The JSON schemas and TypeScript types shared across the data-fair stack (session state, accounts, events, notifications, themes, catalog and processing plugin contracts…), with their generated validators and a few helpers built on top of them. Services, Vue applications and plugins import it so that they all speak the same contracts.

## Install

```sh
npm i @data-fair/lib-common-types
```

Optional peer dependency: `tinycolor2` (v1), only needed by `theme/index.js`.

## Modules

Each directory module exports its generated types (and `validate` / `assertValid` / `returnValid` when listed) from `index.js`, and its raw JSON schema as the default export of `schema.js`.

| Import path | Description |
| --- | --- |
| `@data-fair/lib-common-types/session/index.js` | `SessionState`, `SessionStateAuthenticated`, `User`, `Account`… types, validators, and the `isAuthenticated`, `assertAuthenticated`, `assertAdminMode`, `getAccountRole`, `assertAccountRole`, `isValidAccountType`, `assertValidAccountType` helpers. |
| `@data-fair/lib-common-types/account/index.js` | `Account` (owner of a resource) and `AccountKeys` types, validators. |
| `@data-fair/lib-common-types/access-ref/index.js` | `AccessRef` permission target types, validators, `matchAccessRef(session, accessRef)` and `mongoFilterAccessRef(session)`. |
| `@data-fair/lib-common-types/application/index.js` | `Application`, `Dataset` and `Field` types, as seen by a data-fair application. |
| `@data-fair/lib-common-types/event/index.js` | `Event` types (events service). |
| `@data-fair/lib-common-types/notification/index.js` | `Notification` types, validators. |
| `@data-fair/lib-common-types/theme/index.js` | `Theme` / `Colors` types, `defaultTheme`, `fillTheme`, color contrast helpers (`getReadableColor`, `getOnColor`, `getColorsWarnings`, `getSiteColorsWarnings`…). |
| `@data-fair/lib-common-types/catalog/index.js` | The `CatalogPlugin` contract of catalog plugins and its context types. |
| `@data-fair/lib-common-types/processings.js` | The `PrepareFunction`, `RunFunction`, `ProcessingContext` and `LogFunctions` types of processing plugins. |
| `@data-fair/lib-common-types/ws.js` | `Message` type of the websocket protocol. |

## Usage

### Session

The session state is usually obtained through the session middleware of `@data-fair/lib-express` or `useSession` of `@data-fair/lib-vue`; this package provides its type and the checks. See the [data-fair-session skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-session).

```ts
import { type SessionState, assertAccountRole } from '@data-fair/lib-common-types/session/index.js'

// throws httpError(401) if not authenticated, httpError(403) if the active account does not have the role
assertAccountRole(sessionState, resource.owner, 'admin')
```

`getAccountRole(sessionState, account, { allAccounts?, acceptDepAsRoot? })` returns the role instead of throwing (`'admin'` in admin mode and for the user's own account, `null` if none).

### Referencing the shared schemas

Schemas built with [`@data-fair/lib-types-builder`](https://www.npmjs.com/package/@data-fair/lib-types-builder) can `$ref` the shared schemas by their `$id` (`https://github.com/data-fair/lib/<name>`):

```js
owner: { $ref: 'https://github.com/data-fair/lib/account' },
topic: { $ref: 'https://github.com/data-fair/lib/event#/$defs/topicRef' }
```

### Plugins

```ts
import type { PrepareFunction, RunFunction, ProcessingContext } from '@data-fair/lib-common-types/processings.js'
import type { CatalogPlugin } from '@data-fair/lib-common-types/catalog/index.js'
```

See the [data-fair-processing skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-processing).
