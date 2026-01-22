// made for https://github.com/unplugin/unplugin-auto-import

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
    '@data-fair/lib-vue/ws.js': ['useWS'],
    '@data-fair/lib-vue/async-action.js': ['useAsyncAction'],
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
