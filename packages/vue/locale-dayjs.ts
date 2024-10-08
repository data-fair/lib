import type { Dayjs, ConfigType } from 'dayjs'
import type { Ref, App } from 'vue'
import { inject, ref } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/en'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import relativeTime from 'dayjs/plugin/relativeTime.js'

// copied from relativeTime.d.ts because for some reason our exported type did not inherit this properly
type RelativeDayjs = Dayjs & {
  fromNow(withoutSuffix?: boolean): string
  from(compared: ConfigType, withoutSuffix?: boolean): string
  toNow(withoutSuffix?: boolean): string
  to(compared: ConfigType, withoutSuffix?: boolean): string
}

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)

// main functionality, use through the createLocaleDayjs plugin and useLocaleDayjs composable
// or as a global singleton through ./locale-dayjs-global.js
export function getLocaleDayjs (_locale?: Ref<string>) {
  const locale = _locale ?? ref('fr')
  return {
    locale,
    dayjs: (date?: string | number | dayjs.Dayjs | Date | null | undefined) => {
      return dayjs(date).locale(locale.value) as RelativeDayjs
    }
  }
}

// uses pattern for SSR friendly plugin/composable, cf https://antfu.me/posts/composable-vue-vueday-2021#shared-state-ssr-friendly
export const localeDayjsKey = Symbol('localeDayjs')
export function createLocaleDayjs (locale: Ref<string>) {
  const localeDayjs = getLocaleDayjs(locale)
  return { install (app: App) { app.provide(localeDayjsKey, localeDayjs) } }
}
export function useLocaleDayjs () {
  const localeDayjs = inject(localeDayjsKey)
  if (!localeDayjs) throw new Error('useLocaleDayjs requires using the plugin createLocaleDayjs')
  return localeDayjs as ReturnType<typeof getLocaleDayjs>
}
export default useLocaleDayjs
