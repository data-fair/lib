// import type { Dayjs, ConfigType } from 'dayjs'
import type { App } from 'vue'
import { inject } from 'vue'
import dayjs from 'dayjs'
import 'dayjs/locale/fr.js'
import 'dayjs/locale/en.js'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import relativeTime from 'dayjs/plugin/relativeTime.js'
import duration, { CreateDurationType } from 'dayjs/plugin/duration.js'

export type { ConfigType as DayjsConfigType } from 'dayjs'

// for some reason our exported type did not inherit overloads by plugins
/* type RelativeDayjs = Omit<Dayjs, 'add' | 'subtract'> & {
  // copied from relativeTime.d.ts
  fromNow(withoutSuffix?: boolean): string
  from(compared: ConfigType, withoutSuffix?: boolean): string
  toNow(withoutSuffix?: boolean): string
  to(compared: ConfigType, withoutSuffix?: boolean): string
  // copied from duration.d.ts
  add(duration: Duration): RelativeDayjs
  subtract(duration: Duration): RelativeDayjs
} */
declare module 'dayjs' {
  interface Dayjs {
    fromNow(withoutSuffix?: boolean): string
    from(compared: ConfigType, withoutSuffix?: boolean): string
    toNow(withoutSuffix?: boolean): string
    to(compared: ConfigType, withoutSuffix?: boolean): string
  }
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
    duration: ((...args) => {
      // @ts-ignore
      return dayjs.duration(...args).locale(locale)
    }) as CreateDurationType,
    dayjs: ((...args) => {
      // @ts-ignore
      return dayjs(...args).locale(locale)
    }) as typeof dayjs
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
