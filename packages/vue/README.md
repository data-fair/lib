# @data-fair/lib-vue

Composables and utilities for Vue 3 applications of the data-fair stack (services UIs, data-fair applications…): session, data fetching, URL state, websockets, UI notifications.

## Install

```sh
npm i @data-fair/lib-vue
```

Peer dependencies: `vue` 3 and `ofetch` 1. Optional peers, needed only by the modules that use them:

| Peer | Needed by |
| --- | --- |
| `vue-router` 4 or 5 | `leave-guard.js` (`session.js` and `reactive-search-params.js` accept a router but do not import it) |
| `reconnecting-websocket` 4 | `ws.js` |
| `dayjs` 1 | `locale-dayjs.js` |
| `@vueuse/core` >=10 | `auto-scroll-bottom.js` |

## Modules

Import each module by its path, with the `.js` extension.

| Import path | Description |
| --- | --- |
| `@data-fair/lib-vue/session.js` | Reactive session of the simple-directory user (identity, active account, roles, lang, theme, site info) and its actions (login, logout, switch organization, admin mode…). |
| `@data-fair/lib-vue/fetch.js` | `useFetch`: reactive GET with ofetch, refetched when the URL or query changes, errors sent to ui-notif. |
| `@data-fair/lib-vue/edit-fetch.js` | `useEditFetch`: fetch a resource, edit a local copy, save it back (PATCH or PUT) with a dirty flag. |
| `@data-fair/lib-vue/async-action.js` | `useAsyncAction`: wrap an async function with `loading`, `error` and success/error notifications. |
| `@data-fair/lib-vue/ui-notif.js` | Shared UI notification (displayed by `@data-fair/lib-vuetify/ui-notif.vue`, or posted to the parent frame in an iframe). |
| `@data-fair/lib-vue/reactive-search-params.js` | URL query parameters as a reactive object, plus typed helpers (`useStringSearchParam`, `useBooleanSearchParam`, `useNumberSearchParam`, `useStringsArraySearchParam`). |
| `@data-fair/lib-vue/ws.js` | `useWS`: websocket client with channel subscriptions and automatic reconnection. |
| `@data-fair/lib-vue/locale-dayjs.js` | A dayjs instance in the session language, with the `localizedFormat`, `relativeTime` and `duration` plugins. |
| `@data-fair/lib-vue/owner.js` | `useDisplayOwner`: labels of owners whose department was deleted. |
| `@data-fair/lib-vue/leave-guard.js` | `useLeaveGuard`: confirm before leaving a page (route change or unload) with unsaved changes. |
| `@data-fair/lib-vue/concept-filters.js` | Keep the `_c_` concept filters (and `_d_<datasetId>_` dataset filters) of the search params. |
| `@data-fair/lib-vue/selection.js` | Parse inter-app selection filters (`_c_…` / `_d_…` targeting a visualization's selection field). |
| `@data-fair/lib-vue/deep-diff.js` | `computedDeepDiff` / `watchDeepDiff`: computed and watch that ignore changes of reference without changes of content. |
| `@data-fair/lib-vue/auto-scroll-bottom.js` | `useAutoScrollBottom`: stick to the bottom of a growing region (logs, chat) until the user scrolls up. |
| `@data-fair/lib-vue/format/bytes.js`, `format/field.js` | Re-exports of `@data-fair/lib-utils/format/*` kept for compatibility. |
| `@data-fair/lib-vue/vite.js` | `autoImports` preset for `unplugin-auto-import` (Vue, vue-router, vue-i18n and the composables above) and `ClosePlugin`. |

`reactive-search-params-global.js` and `locale-dayjs-global.js` are module-level singletons kept for older non-SSR apps; prefer the plugins below.

## Setup

Session, search params, ui-notif and locale-dayjs are Vue plugins: create them once in `main.ts`, then use the matching composable in components.

```ts
import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createSession } from '@data-fair/lib-vue/session.js'
import { createReactiveSearchParams } from '@data-fair/lib-vue/reactive-search-params.js'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'

(async function () {
  const router = createRouter({ history: createWebHistory('/my-service/'), routes })
  const session = await createSession({ directoryUrl: '/simple-directory', siteInfo: true })

  createApp(App)
    .use(router)
    .use(createReactiveSearchParams(router))
    .use(session)
    .use(createUiNotif())
    .use(createLocaleDayjs(session.state.lang))
    .mount('#app')
})()
```

`siteInfo: true` loads the site colors and themes, required by `vuetifySessionOptions` of `@data-fair/lib-vuetify`.

## Session

```ts
import { useSession, useSessionAuthenticated } from '@data-fair/lib-vue/session.js'

const session = useSession()
session.user.value // undefined when anonymous
session.account.value // active account (user or organization, with optional department)
session.login()

// in a page that requires a logged in user (throws otherwise)
const { user, account, accountRole } = useSessionAuthenticated()
```

Roles, admin mode and organization switching are covered by the [data-fair-session skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-session).

## Fetch and actions

```ts
import { computed } from 'vue'
import { ofetch } from 'ofetch'
import { useFetch } from '@data-fair/lib-vue/fetch.js'
import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'

const params = computed(() => ({ size: 20, q: search.value }))
const items = useFetch<{ results: Item[] }>('/my-service/api/items', { query: params })
// items.data, items.loading, items.error, items.refresh()

const remove = useAsyncAction(async (id: string) => {
  await ofetch(`/my-service/api/items/${id}`, { method: 'DELETE' })
  await items.refresh()
}, { success: 'Item deleted' })
// remove.execute(id), remove.loading
```

`useFetch` options: `query`, `watch` (default `true`), `immediate` (default `true`), `waitFor` (no request while it is `false`), `notifError` (default `true`).

## Search params

```ts
import { useReactiveSearchParams, useStringSearchParam, useBooleanSearchParam } from '@data-fair/lib-vue/reactive-search-params.js'

const searchParams = useReactiveSearchParams() // Record<string, string>, synced with the URL
const q = useStringSearchParam('q') // computed ref, the param is removed when it equals the default
const showAll = useBooleanSearchParam('all') // stored as '1' / '0'
```

## Websockets

```ts
import { useWS } from '@data-fair/lib-vue/ws.js'

// one socket per path, shared by all callers; the subscription ends with the component scope
useWS('/my-service/api/')?.subscribe<Notification>(`user:${userId}:notifications`, (notification) => {
  notifications.value.unshift(notification)
})
```

Server side and channel permissions: [data-fair-ws skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-ws).

## Owners with a deleted department

A department deleted in simple-directory keeps its id on the resources it owned but loses its `departmentName`. `useDisplayOwner` builds the label in the session language: `Ancien département (<id>)` / `Former department (<id>)`.

```ts
import { useDisplayOwner } from '@data-fair/lib-vue/owner.js'

const { departmentLabel, displayOwner } = useDisplayOwner()
departmentLabel(owner.department, owner.departmentName) // "Direction" | "Former department (head)" | undefined
displayOwner(owner) // same owner, with departmentName filled when the department was deleted
```

`@data-fair/lib-vuetify/owner-avatar.vue` applies it itself: pass it the raw owner. Use `departmentLabel` for text labels and `displayOwner` only for a component that reads `departmentName` directly. Outside a component, use the pure `formatDepartmentLabel(lang, department, departmentName)`.

## Data-fair applications

For applications (visualizations embedded by data-fair: `window.APPLICATION`, config schema, filters convention, selection), see the [data-fair-app skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-app).
