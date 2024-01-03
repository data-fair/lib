import { computed } from 'vue'

// eslint-disable-next-line jsdoc/require-returns
/**
 * @param {Record<string, string>} searchParams
 */
export const useFilters = (searchParams) => {
  const filters = computed(() => {
    // TODO: use config.staticFilters ?
    // TODO: transmit concept filters from router.query
  })

  return { filters }
}
