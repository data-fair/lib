import { inject, ref } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/en'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import relativeTime from 'dayjs/plugin/relativeTime.js'
dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

// main functionality, use through the createLocaleDayjs plugin and useLocaleDayjs composable
// or as a global singleton through ./locale-dayjs-global.js
export function getLocaleDayjs (/** @type {import('vue').Ref<string>?} */_locale) {
  const locale = _locale ?? ref('fr')
  return {
    locale,
    dayjs: (/** @type {(string | number | dayjs.Dayjs | Date | null | undefined)?} */date) => {
      return /** @type {import('./locale-dayjs-types.js').RelativeDayjs } */(dayjs(date).locale(locale.value))
    }
  }
}

// uses pattern for SSR friendly plugin/composable, cf https://antfu.me/posts/composable-vue-vueday-2021#shared-state-ssr-friendly
export const localeDayjsKey = Symbol('localeDayjs')
export function createLocaleDayjs (/** @type {import('vue').Ref<string>?} */locale) {
  const localeDayjs = getLocaleDayjs(locale)
  return { install (/** @type {import('vue').App} */app) { app.provide(localeDayjsKey, localeDayjs) } }
}
export function useLocaleDayjs () {
  const localeDayjs = inject(localeDayjsKey)
  if (!localeDayjs) throw new Error('useLocaleDayjs requires using the plugin createLocaleDayjs')
  return /** @type {ReturnType<typeof getLocaleDayjs>} */(localeDayjs)
}
export default useLocaleDayjs
