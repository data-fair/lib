// made for https://github.com/unplugin/unplugin-auto-import
import { autoImports as vueAutoImports } from '@data-fair/lib-vue/vite.js'

export const autoImports = [
  ...vueAutoImports,
  {
    '@data-fair/lib-vuetify/personal-menu.vue': [['default', 'dfPersonalMenu']],
    '@data-fair/lib-vuetify/tutorial-alert.vue': [['default', 'dfTutorialAlert']],
    '@data-fair/lib-vuetify/user-avatar.vue': [['default', 'dfUserAvatar']]
  }
]
