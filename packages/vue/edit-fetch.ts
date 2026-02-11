import { ref, watch, computed, type Ref } from 'vue'
import { ofetch } from 'ofetch'
import { useFetch, type UseFetchOptions } from './fetch.js'
import useAsyncAction, { AsyncActionOptions } from './async-action.js'
import equal from 'fast-deep-equal'
import clone from '@data-fair/lib-utils/clone.js'

type UseEditFetchOptions = UseFetchOptions & {
  patch?: boolean
  saveOptions?: AsyncActionOptions
  fetchAfterSave?: boolean
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

  const getPatch = (oldData: any, newData: any) => {
    if (!oldData || !newData) return null
    const patch: any = {}
    for (const key of Object.keys(newData)) {
      if (!equal(newData[key], oldData[key])) patch[key] = newData[key]
    }
    for (const key of Object.keys(oldData)) {
      if (!(key in newData)) patch[key] = null
    }
    return patch
  }

  const save = useAsyncAction(async () => {
    if (!data.value || !serverData.value || !fetch.data.value) throw new Error('cannot save data that has not been fetched yet')
    let res: T
    const dataBeforeSave = clone(data.value)
    if (options.patch) {
      const patch = getPatch(serverData.value, data.value)
      if (!Object.keys(patch).length) return
      res = await ofetch<T>(fetch.fullUrl.value!, { method: 'PATCH', body: patch })
    } else {
      // TODO: add if-unmodified-since header ?
      res = await ofetch<T>(fetch.fullUrl.value!, { method: 'PUT', body: data.value })
    }
    if (options.fetchAfterSave || !res) {
      fetch.refresh()
    } else {
      serverData.value = clone(res)
      // case of server-side calculated properties, updatedAt, etc
      Object.assign(data.value, getPatch(dataBeforeSave, res))
    }
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
