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
  }
]
