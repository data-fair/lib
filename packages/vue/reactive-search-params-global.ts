// same as use-reactive-search-params.js but in a module level singleton for convenience when not using SSR

import { getReactiveSearchParams } from './reactive-search-params.js'

// @ts-ignore
if (import.meta.env?.SSR) {
  throw new Error('this module uses a module level singleton, it cannot be used in SSR mode')
}

export default getReactiveSearchParams()
