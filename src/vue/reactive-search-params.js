// simply a module level singleton of useUrlSearchParams from vueuse
// adapted only in none-ssr context
import { useUrlSearchParams } from '@vueuse/core'

// this typing is not really correct (values can be arrays if repeated in the URL)
// but it's enough for our use case as we always use single values and URL with repeated values are not generated
/** @type {Record<string, string>} */
export default useUrlSearchParams('history')
