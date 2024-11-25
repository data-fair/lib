// import type { Dayjs, ConfigType } from 'dayjs'
import type { App } from 'vue'
import { inject } from 'vue'
import dayjs, { type Dayjs, ConfigType } from 'dayjs'
import 'dayjs/locale/fr'
import 'dayjs/locale/en'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import duration, { type Duration } from 'dayjs/plugin/duration.js'

export type { ConfigType as DayjsConfigType } from 'dayjs'

// for some reason our exported type did not inherit overloads by plugins
type RelativeDayjs = Dayjs & {
  // copied from relativeTime.d.ts
  fromNow(withoutSuffix?: boolean): string
  from(compared: ConfigType, withoutSuffix?: boolean): string
  toNow(withoutSuffix?: boolean): string
  to(compared: ConfigType, withoutSuffix?: boolean): string
  // copied from duration.d.ts
  add(duration: Duration): RelativeDayjs
  subtract(duration: Duration): RelativeDayjs
}

dayjs.extend(localizedFormat)
dayjs.extend(relativeTime)
dayjs.extend(duration)

// main functionality, use through the createLocaleDayjs plugin and useLocaleDayjs composable
// or as a global singleton through ./locale-dayjs-global.js
export function getLocaleDayjs (locale?: string) {
  locale = locale ?? 'fr'
  return {
    locale,
    duration: (dur: duration.DurationUnitsObjectType) => {
      return dayjs.duration(dur).locale(locale)
    },
    dayjs: (date?: string | number | dayjs.Dayjs | Date | null | undefined) => {
      return dayjs(date).locale(locale) as RelativeDayjs
    }
  }
}

// uses pattern for SSR friendly plugin/composable, cf https://antfu.me/posts/composable-vue-vueday-2021#shared-state-ssr-friendly
export const localeDayjsKey = Symbol('localeDayjs')
export function createLocaleDayjs (locale?: string) {
  const localeDayjs = getLocaleDayjs(locale)
  return { install (app: App) { app.provide(localeDayjsKey, localeDayjs) } }
}
export function useLocaleDayjs () {
  const localeDayjs = inject(localeDayjsKey)
  if (!localeDayjs) throw new Error('useLocaleDayjs requires using the plugin createLocaleDayjs')
  return localeDayjs as ReturnType<typeof getLocaleDayjs>
}
export default useLocaleDayjs
