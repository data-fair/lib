// simply a module level singleton of useUrlSearchParams from vueuse
// adapted only in none-ssr context
import { useUrlSearchParams } from '@vueuse/core'

export default useUrlSearchParams('history')
