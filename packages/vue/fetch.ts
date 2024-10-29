import type { QueryObject } from 'ufo'
import type { Ref } from 'vue'
import { ofetch } from 'ofetch'
import { withQuery } from 'ufo'
import { computed, isRef, watch, ref } from 'vue'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'

type UseFetchOptions = {
  query?: QueryObject | Ref<QueryObject>,
  watch?: Boolean
}

export function useFetch<T> (url: string | Ref<string> | (() => string), options: UseFetchOptions = {}) {
  const { sendUiNotif } = useUiNotif()

  if (typeof url === 'function') url = computed(url)
  const fullUrl = computed(() => {
    let fullUrl = isRef(url) ? url.value : url
    const query = isRef(options.query) ? options.query.value : options.query
    if (query) fullUrl = withQuery(fullUrl, query)
    return fullUrl
  })

  const data = ref<T | null>(null)
  const loading = ref(false)

  let abortController: AbortController | undefined
  const refresh = async () => {
    if (abortController) abortController.abort()
    loading.value = true
    abortController = new AbortController()
    try {
      data.value = await ofetch(fullUrl.value, { signal: abortController.signal })
    } catch (error: any) {
      if (error.name !== 'AbortError') sendUiNotif({ msg: '', error })
    }
    loading.value = false
  }

  const initialFetch = async () => {
    if (loading.value || data.value) return
    await refresh()
  }

  if (options.watch !== false) {
    watch(fullUrl, refresh, { immediate: true })
  }

  return { data, loading, refresh, initialFetch }
}

export default useFetch
