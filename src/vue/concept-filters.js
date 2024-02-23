// filter reactiveSearchParams to conceptFilters (params prefixed by _c_)

import { reactive, watch } from 'vue'

/**
 * @param {Record<string, string>} reactiveSearchParams
 */
export function useConceptFilters (reactiveSearchParams) {
  const conceptFilters = reactive(/** @type {Record<string, string>} */({}))

  watch(reactiveSearchParams, () => {
    for (const key of Object.keys(reactiveSearchParams)) {
      if (key.startsWith('_c_')) conceptFilters[key] = reactiveSearchParams[key]
    }
    for (const key of Object.keys(conceptFilters)) {
      if (reactiveSearchParams[key] === undefined) delete conceptFilters[key]
    }
  }, { immediate: true })

  return conceptFilters
}
