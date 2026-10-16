# @data-fair/lib-vuetify

Vuetify 4 components shared by the Vue 3 UIs of the data-fair stack (services UIs, data-fair applications…): personal menu, notifications, owner and user avatars, error and empty states, theme and language switchers, plus the Vuetify options derived from the session.

## Install

```sh
npm i @data-fair/lib-vuetify
```

Peer dependencies (all required): `vuetify` 4, `vue-i18n` 10 or 11, `ofetch` 1 and `@data-fair/lib-vue` ^1.31.1.

Components are published as `.vue` sources with `<i18n>` blocks: the app compiles them with `@vitejs/plugin-vue`, `@intlify/unplugin-vue-i18n` and `vite-plugin-vuetify`. Most of them use the session and ui-notif plugins of `@data-fair/lib-vue`.

## Components

| Import path | Description |
| --- | --- |
| `@data-fair/lib-vuetify/personal-menu.vue` | Account menu: login, logout, switch account, admin mode, planned deletion warning. |
| `@data-fair/lib-vuetify/user-avatar.vue` | Avatar of the current user, optionally with the active organization as a secondary avatar (`show-account`). |
| `@data-fair/lib-vuetify/owner-avatar.vue` | Avatar and tooltip of a resource owner (user, organization, department; deleted departments handled). |
| `@data-fair/lib-vuetify/owner-pick.vue` | Radio group to choose the owner of a resource among the accounts of the user. |
| `@data-fair/lib-vuetify/ui-notif.vue` | Snackbar queue displaying the notifications of `@data-fair/lib-vue/ui-notif.js` (silent in an iframe, the parent displays them). |
| `@data-fair/lib-vuetify/ui-notif-alert.vue` | Inline alert for one notification (e.g. the `notif` of `useAsyncAction`). |
| `@data-fair/lib-vuetify/layout-fetch-error.vue` | Error page for a failed fetch (not found, forbidden with account switch, server error). |
| `@data-fair/lib-vuetify/layout-empty-state.vue` | Empty list state: no data, no search result, optional create button. |
| `@data-fair/lib-vuetify/theme-switcher.vue` | Theme menu (system, default, dark, high contrast) bound to the session. |
| `@data-fair/lib-vuetify/lang-switcher.vue` | Language menu bound to the session. |
| `@data-fair/lib-vuetify/navigation-right.vue` | Right navigation drawer for large screens (actions, filters, table of contents). |
| `@data-fair/lib-vuetify/toc.vue` | Table of contents of the page sections, for the right drawer. |
| `@data-fair/lib-vuetify/section-tabs.vue` | Page section card with title, subtitle, illustration and optional tabs. |
| `@data-fair/lib-vuetify/tutorial-alert.vue` | Dismissable help message, remembered per id. |
| `@data-fair/lib-vuetify/search-field.vue` | Standard search text field. |
| `@data-fair/lib-vuetify/search-address.vue` | French address autocomplete (IGN geocoding API), emits the selected coordinates. |
| `@data-fair/lib-vuetify/date-range-picker.vue` | Date range input. |
| `@data-fair/lib-vuetify/date-match-filter.vue` | Date picker producing a value for the `_c_date_match` filter of data-fair. |
| `@data-fair/lib-vuetify/scroll-to-top.vue` | Floating "scroll to top" button. |
| `@data-fair/lib-vuetify/themed-svg.vue` | Inline undraw / manypixels illustration recolored with the theme (`themed-svg-source.js` for the raw function). |
| `@data-fair/lib-vuetify/colors-preview.vue` | Preview of a site theme's colors with contrast warnings (used to configure themes). |

Other entry points:

| Import path | Description |
| --- | --- |
| `@data-fair/lib-vuetify` | `vuetifySessionOptions(session, cspNonce?)`: Vuetify options (theme, colors, locale, component defaults) from the session. `defaultOptions` is its deprecated predecessor. |
| `@data-fair/lib-vuetify/vite.js` | `componentsResolver` for `unplugin-vue-components` (`<DfPersonalMenu>`, `<df-owner-avatar>`…), `autoImports` (re-exported from lib-vue) and `settingsPath` for `vite-plugin-vuetify`. |
| `@data-fair/lib-vuetify/style/global.scss` | Global Vuetify styles of the stack. `default.scss` is deprecated. |
| `@data-fair/lib-vuetify/style/settings.scss` | Vuetify SASS settings, pass it through `settingsPath`. |

## Setup

```ts
// main.ts
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import '@data-fair/lib-vuetify/style/global.scss'

// session created with createSession({ ..., siteInfo: true }) from @data-fair/lib-vue/session.js
const vuetify = createVuetify({
  ...vuetifySessionOptions(session, cspNonce),
  icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
})
```

```ts
// vite.config.ts
import Vuetify from 'vite-plugin-vuetify'
import Components from 'unplugin-vue-components/vite'
import { settingsPath, componentsResolver } from '@data-fair/lib-vuetify/vite.js'

export default defineConfig({
  plugins: [
    // Vue(), VueI18nPlugin()…
    Vuetify({ styles: { configFile: settingsPath } }),
    Components({ resolvers: [componentsResolver] })
  ]
})
```

## Usage

```vue
<template>
  <v-app>
    <v-app-bar>
      <v-spacer />
      <personal-menu />
    </v-app-bar>
    <v-main><router-view /></v-main>
    <ui-notif />
  </v-app>
</template>

<script setup lang="ts">
import personalMenu from '@data-fair/lib-vuetify/personal-menu.vue'
import uiNotif from '@data-fair/lib-vuetify/ui-notif.vue'
</script>
```

`owner-avatar.vue` takes the raw owner of a resource and labels deleted departments itself (see `useDisplayOwner` in [`@data-fair/lib-vue`](https://www.npmjs.com/package/@data-fair/lib-vue)):

```vue
<owner-avatar :owner="dataset.owner" />
```

For data-fair applications (theme, dark mode, embedding), see the [data-fair-app skill](https://github.com/data-fair/lib/tree/main/skills/data-fair-app).
