# lib
A collection of javascript functions, components, types, etc to help work inside the data-fair stack.

All dependencies are declared as optional peer dependencies, you should install them yourself as required by your usage.

```sh
npm i @data-fair/lib
```

## Vue

### useSession

This composable for Vue 3 provides a reactive session state and useful methods (login, logout, etc).

Install peer dependencies:

```sh
npm i @vueuse/integrations ofetch jwt-decode debug
```

Use as a nuxt plugin in js (plugins/session.js):

```js
import { useSession } from '@data-fair/lib/vue/use-session'

export default defineNuxtPlugin(async (nuxtApp) => {
  const session = await useSession({req: nuxtApp.ssrContext?.event.node.req})
  return { provide: { session } }
})
```

Use as a nuxt plugin in typescript (plugins/session.ts):

```ts
import { useSession } from '@data-fair/lib/vue/use-session'
import { Session } from '@data-fair/lib/vue/use-session.d'

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