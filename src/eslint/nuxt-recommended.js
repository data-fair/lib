import { deprecatedModules } from './recommended.js'

// this is a temporary submodule, see https://github.com/vuetifyjs/eslint-plugin-vuetify/issues/93#issuecomment-2296968464
// @ts-ignore
import pluginVuetify from '../../eslint-plugin-vuetify/src/configs/flat/base.js'

const restrictedModules = deprecatedModules.concat([
  { name: 'vite-plugin-vuetify', message: 'Pleas use @data-fair/lib/nuxt.js' },
  { name: '@data-fair/lib/vue/session.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/vue/reactive-search-params.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/vue/reactive-search-params-global.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/locale-dayjs.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/locale-dayjs-global.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/vuetify.js', message: 'Please use auto-import.' }
])

/** @type {import('eslint').Linter.Config[]} */
export default [{
  rules: {
    'no-restricted-imports': ['error', ...restrictedModules],
    'no-restricted-modules': ['error', ...deprecatedModules.filter(dm => !dm.importNames)]
  }
}, pluginVuetify]
