export const deprecatedModules = [
  { name: 'event-to-promise', message: 'Please use @data-fair/lib/event-promise.js' },
  { name: '@koumoul/sd-vue', message: 'Please use @data-fair/lib/vue/session.js' },
  { name: '@koumoul/sd-express', message: 'Please use @data-fair/lib/express/session.js' },
  { name: '@data-fair/sd-vue', message: 'Please use @data-fair/lib/vue/session.js' },
  { name: '@data-fair/sd-express', message: 'Please use @data-fair/lib/express/session.js' },
  { name: '@data-fair/processings-test-utils', message: 'Please use @data-fair/lib/processings/test-utils.js' },
  { name: 'rfdc', message: 'Please use @data-fair/lib/clone.js' },
  { name: 'http-errors', message: 'Please use @data-fair/lib/http-errors.js' },
  { name: 'original-url', message: 'Please use @data-fair/lib/express/req-origin.js' }
]

/** @type {import('eslint').ESLint.ConfigData} */
export default {
  rules: {
    'no-restricted-imports': ['error', ...deprecatedModules],
    'no-restricted-modules': ['error', ...deprecatedModules]
  }
}
