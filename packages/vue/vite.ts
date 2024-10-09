// made for https://github.com/unplugin/unplugin-auto-import

export const autoImports = [
  'vue',
  'vue-i18n',
  'vue-router',
  {
    '@data-fair/lib-vue/session.js': ['useSession'],
    '@data-fair/lib-vue/reactive-search-params.js': ['useReactiveSearchParams'],
    '@data-fair/lib-vue/locale-dayjs.js': ['useLocaleDayjs'],
    '@data-fair/lib-vue/concept-filters.js': ['useConceptFilters'],
    '@data-fair/lib-vue/ui-notif.js': ['useUiNotif']
  }
]
