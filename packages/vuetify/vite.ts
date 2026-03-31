/**
 * Re-export of {@link autoImports} from `@data-fair/lib-vue/vite.js`.
 *
 * Composables-only preset for {@link https://github.com/unplugin/unplugin-auto-import unplugin-auto-import}.
 * Does not include components — use {@link componentsResolver} with
 * {@link https://github.com/unplugin/unplugin-vue-components unplugin-vue-components} for that.
 */
export { autoImports } from '@data-fair/lib-vue/vite.js'

/**
 * Map of PascalCase component names to their module paths.
 * Used internally by {@link componentsResolver}.
 */
const components: Record<string, string> = {
  DfDateMatchFilter: '@data-fair/lib-vuetify/date-match-filter.vue',
  DfDateRangePicker: '@data-fair/lib-vuetify/date-range-picker.vue',
  DfLangSwitcher: '@data-fair/lib-vuetify/lang-switcher.vue',
  DfNavigationRight: '@data-fair/lib-vuetify/navigation-right.vue',
  DfOwnerAvatar: '@data-fair/lib-vuetify/owner-avatar.vue',
  DfOwnerPick: '@data-fair/lib-vuetify/owner-pick.vue',
  DfPersonalMenu: '@data-fair/lib-vuetify/personal-menu.vue',
  DfScrollToTop: '@data-fair/lib-vuetify/scroll-to-top.vue',
  DfSearchAddress: '@data-fair/lib-vuetify/search-address.vue',
  DfSearchField: '@data-fair/lib-vuetify/search-field.vue',
  DfSectionTabs: '@data-fair/lib-vuetify/section-tabs.vue',
  DfThemedSvg: '@data-fair/lib-vuetify/themed-svg.vue',
  DfThemeSwitcher: '@data-fair/lib-vuetify/theme-switcher.vue',
  DfToc: '@data-fair/lib-vuetify/toc.vue',
  DfTutorialAlert: '@data-fair/lib-vuetify/tutorial-alert.vue',
  DfUiNotifAlert: '@data-fair/lib-vuetify/ui-notif-alert.vue',
  DfUiNotif: '@data-fair/lib-vuetify/ui-notif.vue',
  DfUserAvatar: '@data-fair/lib-vuetify/user-avatar.vue'
}

/**
 * Resolver for {@link https://github.com/unplugin/unplugin-vue-components unplugin-vue-components}.
 *
 * Resolves `Df`-prefixed component names (e.g. `<DfPersonalMenu>` or `<df-personal-menu>`)
 * to their corresponding `@data-fair/lib-vuetify/*.vue` module.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { componentsResolver } from '@data-fair/lib-vuetify/vite.js'
 * import Components from 'unplugin-vue-components/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     Components({ resolvers: [componentsResolver] })
 *   ]
 * })
 * ```
 */
export const componentsResolver = (name: string) => {
  if (components[name]) return components[name]
}

export const settingsPath = new URL(import.meta.resolve('@data-fair/lib-vuetify/style/settings.scss')).pathname
