// same as locale-dayjs but in a module level singleton for convenience when not using SSR

import { getLocaleDayjs } from './locale-dayjs.js'

// @ts-ignore
if (import.meta.env?.SSR) {
  throw new Error('this module uses a module level singleton, it cannot be used in SSR mode')
}

console.error('locale-dayjs-global is deprecated, please use create + use')

export const { locale, dayjs } = getLocaleDayjs()
