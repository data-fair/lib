// same as use-ui-notif.js but in a module level singleton for convenience when not using SSR

import { getUiNotif } from './ui-notif.js'

// @ts-ignore
if (import.meta.env?.SSR) {
  throw new Error('this module uses a module level singleton, it cannot be used in SSR mode')
}

export default getUiNotif()
