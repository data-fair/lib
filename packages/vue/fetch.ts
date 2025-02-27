import type { QueryObject } from 'ufo'
import type { Ref } from 'vue'
import { ofetch } from 'ofetch'
import { withQuery } from 'ufo'
import { computed, isRef, watch, ref, shallowRef, readonly, shallowReadonly } from 'vue'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'

type UseFetchOptions = {
  query?: QueryObject | Ref<QueryObject>,
  watch?: Boolean
  notifError?: Boolean
}

type OptionalUrl = string | null | undefined

export function useFetch<T> (url: OptionalUrl | Ref<OptionalUrl> | (() => OptionalUrl), options: UseFetchOptions = {}): { data: Ref<T | null>, loading: Ref<boolean>, initialized: Ref<boolean>, error: Ref<any>, refresh: (() => Promise<T | null>) } {
  const { sendUiNotif } = useUiNotif()

  if (typeof url === 'function') url = computed(url)
  const fullUrl = computed(() => {
    let fullUrl = isRef(url) ? url.value : url
    if (!fullUrl) return null
    const query = isRef(options.query) ? options.query.value : options.query
    if (query) fullUrl = withQuery(fullUrl, query)
    return fullUrl
  })

  const data = shallowRef(null) as Ref<T | null>
  const loading = ref(false)
  const initialized = ref(false)
  const error = shallowRef<any>(null)

  let abortController: AbortController | undefined
  const refresh = async () => {
    if (!fullUrl.value) return null
    initialized.value = true
    error.value = null
    if (abortController) abortController.abort()
    loading.value = true
    abortController = new AbortController()
    try {
      data.value = await ofetch<T>(fullUrl.value, { signal: abortController.signal })
    } catch (err: any) {
      if (err.name !== 'AbortError' && err.cause?.name !== 'AbortError') {
        error.value = err
        if (options.notifError !== false) {
          sendUiNotif({ msg: '', error: err })
        }
      }
    }
    loading.value = false
    return data.value
  }

  if (options.watch !== false) {
    watch(fullUrl, refresh, { immediate: true })
  }

  return {
    initialized: readonly(initialized),
    data: shallowReadonly(data),
    loading: readonly(loading),
    error: shallowReadonly(error),
    refresh,
  }
}

export default useFetch
