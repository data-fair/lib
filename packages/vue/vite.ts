/**
 * Preset for {@link https://github.com/unplugin/unplugin-auto-import unplugin-auto-import}.
 *
 * Auto-imports Vue, vue-router, vue-i18n built-ins and all data-fair composables
 * so they can be used in `<script setup>` without explicit import statements.
 *
 * @example
 * ```ts
 * // vite.config.ts
 * import { autoImports } from '@data-fair/lib-vue/vite.js'
 * import AutoImport from 'unplugin-auto-import/vite'
 *
 * export default defineConfig({
 *   plugins: [
 *     AutoImport({ imports: [...autoImports] })
 *   ]
 * })
 * ```
 */
export const autoImports = [
  'vue',
  'vue-i18n',
  'vue-router',
  {
    '@data-fair/lib-vue/session.js': ['useSession', 'useSessionAuthenticated'],
    '@data-fair/lib-vue/reactive-search-params.js': ['useReactiveSearchParams', 'useStringSearchParam', 'useBooleanSearchParam', 'useNumberSearchParam', 'useStringsArraySearchParam'],
    '@data-fair/lib-vue/locale-dayjs.js': ['useLocaleDayjs'],
    '@data-fair/lib-vue/concept-filters.js': ['useConceptFilters'],
    '@data-fair/lib-vue/ui-notif.js': ['useUiNotif', 'withUiNotif'],
    '@data-fair/lib-vue/fetch.js': ['useFetch'],
    '@data-fair/lib-vue/edit-fetch.js': ['useEditFetch'],
    '@data-fair/lib-vue/ws.js': ['useWS'],
    '@data-fair/lib-vue/async-action.js': ['useAsyncAction'],
    '@data-fair/lib-vue/leave-guard.js': ['useLeaveGuard'],
    '@data-fair/lib-vue/deep-diff.js': ['computedDeepDiff', 'watchDeepDiff'],
    '@data-fair/lib-vue/format/bytes.js': ['formatBytes'],
  }
]

// cf https://stackoverflow.com/questions/75839993/vite-build-hangs-forever/76920975#76920975
export function ClosePlugin () {
  return {
    name: 'ClosePlugin', // required, will show up in warnings and errors

    // use this to catch errors when building
    buildEnd (error: any) {
      if (error) {
        console.error(error)
        process.exit(1)
      } else {
        console.log('Build ended')
      }
    },

    // use this to catch the end of a build without errors
    closeBundle () {
      console.log('Bundle closed')
      process.exit(0)
    },
  }
}
