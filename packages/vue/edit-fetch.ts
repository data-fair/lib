import { ref, watch, type Ref } from 'vue'
import { ofetch } from 'ofetch'
import { useFetch, type UseFetchOptions } from './fetch.js'
import useAsyncAction, { AsyncActionOptions } from './async-action.js'
import equal from 'fast-deep-equal'

type UseEditFetchOptions = UseFetchOptions & {
  patch?: boolean
  saveOptions?: AsyncActionOptions
}

type OptionalUrl = string | null | undefined

export function useEditFetch<T extends Record<string, any>> (url: OptionalUrl | Ref<OptionalUrl> | (() => OptionalUrl), options: UseEditFetchOptions = {}) {
  const fetch = useFetch<T>(url, options)
  const serverData = ref<T | null>(null)
  const data = ref<T | null>(null)
  watch(fetch.data, () => {
    // TODO: check for local changes before overwriting ?
    serverData.value = fetch.data.value
    data.value = fetch.data.value
  })
  const save = useAsyncAction(async () => {
    if (!data.value || !serverData.value || !fetch.data.value) throw new Error('cannot save data that has not been fetched yet')
    if (options.patch) {
      const patch: any = {}
      for (const key of Object.keys(data.value)) {
        if (!equal(data.value[key], serverData.value[key])) patch[key] = data.value[key]
      }
      if (!Object.keys(patch).length) return
      serverData.value = await ofetch<T>(fetch.fullUrl.value!, { method: 'PATCH', body: patch })
    } else {
      // TODO: add if-unmodified-since header ?
      serverData.value = await ofetch<T>(fetch.fullUrl.value!, { method: 'PUT', body: data.value })
    }
    serverData.value = data.value
  }, options.saveOptions)
  return {
    fetch,
    data,
    serverData,
    save
  }
}

export default useEditFetch
