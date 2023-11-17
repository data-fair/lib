import { computed } from 'vue'

// eslint-disable-next-line jsdoc/require-returns
/**
 * @param {import('@vueuse/core').UrlParams} searchParams
 */
export const useFilters = (searchParams) => {
  const filters = computed(() => {
    // TODO: use config.staticFilters ?
    // TODO: transmit concept filters from router.query
  })

  return { filters }
}
