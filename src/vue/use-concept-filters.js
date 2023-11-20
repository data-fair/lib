import { computed } from 'vue'

/**
 * @param {import('@vueuse/core').UrlParams} searchParams
 */
export default (searchParams) => {
  /** @type {import('vue').ComputedRef<Record<string, string>>} */
  const conceptFilters = computed(() => {
    /** @type {Record<string, string>} */
    const conceptFilters = {}
    for (const key of Object.keys(searchParams)) {
      if (key.startsWith('_c_')) {
        if (Array.isArray(searchParams[key])) throw new Error('concept filters cannot be arrays')
        conceptFilters[key] = /** @type {string} */(searchParams[key])
      }
    }
    return conceptFilters
  })

  return { conceptFilters }
}
