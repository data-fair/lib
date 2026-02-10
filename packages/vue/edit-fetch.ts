import { ref, watch, computed, type Ref } from 'vue'
import { ofetch } from 'ofetch'
import { useFetch, type UseFetchOptions } from './fetch.js'
import useAsyncAction, { AsyncActionOptions } from './async-action.js'
import equal from 'fast-deep-equal'
import clone from '@data-fair/lib-utils/clone.js'

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
    serverData.value = clone(fetch.data.value)
    data.value = clone(fetch.data.value)
  })

  const hasDiff = computed(() => !equal(data.value, serverData.value))

  const getPatch = () => {
    if (!data.value || !serverData.value) return null
    const patch: any = {}
    for (const key of Object.keys(data.value)) {
      if (!equal(data.value[key], serverData.value[key])) patch[key] = data.value[key]
    }
    for (const key of Object.keys(serverData.value)) {
      if (!(key in data.value)) patch[key] = null
    }
    return patch
  }

  const save = useAsyncAction(async () => {
    if (!data.value || !serverData.value || !fetch.data.value) throw new Error('cannot save data that has not been fetched yet')
    if (options.patch) {
      const patch = getPatch()
      if (!Object.keys(patch).length) return
      serverData.value = await ofetch<T>(fetch.fullUrl.value!, { method: 'PATCH', body: patch })
    } else {
      // TODO: add if-unmodified-since header ?
      serverData.value = await ofetch<T>(fetch.fullUrl.value!, { method: 'PUT', body: data.value })
    }
    serverData.value = clone(data.value)
  }, options.saveOptions)
  return {
    fetch,
    data,
    serverData,
    hasDiff,
    save
  }
}

export default useEditFetch
