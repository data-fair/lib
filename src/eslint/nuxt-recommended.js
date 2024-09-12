import { deprecatedModules } from './recommended.js'

const restrictedModules = deprecatedModules.concat([
  { name: 'from vite-plugin-vuetify', message: 'Pleas use @data-fair/lib/nuxt.js' },
  { name: '@data-fair/lib/vue/session.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/vue/reactive-search-params.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/vue/reactive-search-params-global.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/locale-dayjs.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/locale-dayjs-global.js', message: 'Please use auto-import.' },
  { name: '@data-fair/lib/vuetify.js', message: 'Please use auto-import.' }
])

/** @type {import('eslint').Linter.Config} */
export default {
  rules: {
    'no-restricted-imports': ['error', ...restrictedModules],
    'no-restricted-modules': ['error', ...restrictedModules]
  }
}
