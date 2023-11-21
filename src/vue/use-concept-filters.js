import { computed } from 'vue'

/**
 * @param {import('@vueuse/core').UrlParams} reactiveSearchParams
 */
export default (reactiveSearchParams) => {
  /** @type {import('vue').ComputedRef<Record<string, string>>} */
  const conceptFilters = computed(() => {
    /** @type {Record<string, string>} */
    const conceptFilters = {}
    for (const key of Object.keys(reactiveSearchParams)) {
      if (key.startsWith('_c_')) {
        if (Array.isArray(reactiveSearchParams[key])) throw new Error('concept filters cannot be arrays')
        conceptFilters[key] = /** @type {string} */(reactiveSearchParams[key])
      }
    }
    return conceptFilters
  })

  return { conceptFilters }
}
