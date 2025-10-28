// made for https://github.com/unplugin/unplugin-auto-import
import { autoImports as vueAutoImports } from '@data-fair/lib-vue/vite.js'

export const autoImports = [
  ...vueAutoImports,
  {
    '@data-fair/lib-vuetify/date-match-filter.vue': [['default', 'dfDateMatchFilter']],
    '@data-fair/lib-vuetify/date-range-picker.vue': [['default', 'dfDateRangePicker']],
    '@data-fair/lib-vuetify/lang-switcher.vue': [['default', 'dfLangSwitcher']],
    '@data-fair/lib-vuetify/navigation-right.vue': [['default', 'dfNavigationRight']],
    '@data-fair/lib-vuetify/owner-avatar.vue': [['default', 'dfOwnerAvatar']],
    '@data-fair/lib-vuetify/owner-pick.vue': [['default', 'dfOwnerPick']],
    '@data-fair/lib-vuetify/personal-menu.vue': [['default', 'dfPersonalMenu']],
    // I don't understand why but search-address.vue breaks some typescript checks
    // '@data-fair/lib-vuetify/search-address.vue': [['default', 'dfSearchAddress']],
    '@data-fair/lib-vuetify/theme-switcher.vue': [['default', 'dfThemeSwitcher']],
    '@data-fair/lib-vuetify/tutorial-alert.vue': [['default', 'dfTutorialAlert']],
    '@data-fair/lib-vuetify/ui-notif-alert.vue': [['default', 'dfUiNotifAlert']],
    '@data-fair/lib-vuetify/ui-notif.vue': [['default', 'dfUiNotif']],
    '@data-fair/lib-vuetify/ui-user-avatar.vue': [['default', 'dfUserAvatar']]
  }
]

export const settingsPath = new URL(import.meta.resolve('@data-fair/lib-vuetify/style/settings.scss')).pathname
