import type { QueryObject } from 'ufo'
import type { Ref } from 'vue'
import { ofetch } from 'ofetch'
import { withQuery } from 'ufo'
import { computed, isRef, watch, ref } from 'vue'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'

type UseFetchOptions = {
  query?: QueryObject | Ref<QueryObject>,
}

export function useFetch<T> (url: string | Ref<string>, options: UseFetchOptions = {}) {
  const { sendUiNotif } = useUiNotif()
  const fullUrl = computed(() => {
    let fullUrl = isRef(url) ? url.value : url
    const query = isRef(options.query) ? options.query.value : options.query
    if (query) fullUrl = withQuery(fullUrl, query)
    return fullUrl
  })

  const data = ref<T | null>(null)
  const loading = ref(false)

  const refresh = async () => {
    loading.value = true
    try {
      data.value = await ofetch(fullUrl.value)
    } catch (error: any) {
      sendUiNotif({ msg: '', error })
    }
    loading.value = false
  }

  watch(fullUrl, refresh, { immediate: true })

  return { data, loading, refresh }
}

export default useFetch
