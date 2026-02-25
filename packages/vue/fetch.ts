import type { QueryObject } from 'ufo'
import type { Ref } from 'vue'
import { ofetch } from 'ofetch'
import { withQuery } from 'ufo'
import { computed, watch, ref, shallowRef, readonly, shallowReadonly, toValue } from 'vue'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { MaybeRefOrGetter } from 'vue'

export type UseFetchOptions = {
  query?: MaybeRefOrGetter<QueryObject>,
  watch?: Boolean
  notifError?: Boolean
  immediate?: Boolean
  waitFor?: MaybeRefOrGetter<Boolean>
}

type OptionalUrl = string | null | undefined

export function useFetch<T> (url: MaybeRefOrGetter<OptionalUrl>, options: UseFetchOptions = {}): { data: Ref<T | null>, fullUrl: Ref<string | null>, loading: Ref<boolean>, initialized: Ref<boolean>, error: Ref<any>, refresh: (() => Promise<T | null>) } {
  const { sendUiNotif } = useUiNotif()

  if (typeof url === 'function') url = computed(url)
  const fullUrl = computed(() => {
    let fullUrl = toValue(url)
    const waitFor = toValue(options.waitFor)
    if (waitFor === false) return null
    if (!fullUrl) return null
    const query = toValue(options.query)
    if (query) fullUrl = withQuery(fullUrl, query)
    return fullUrl
  })

  const data = shallowRef(null) as Ref<T | null>
  const loading = ref(false)
  const initialized = ref(false)
  const error = shallowRef<any>(null)

  let abortController: AbortController | undefined
  const refresh = async () => {
    initialized.value = true
    if (!fullUrl.value) return null
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
    watch(fullUrl, () => {
      if (options.immediate !== false || initialized.value) refresh()
    }, { immediate: true })
  }

  return {
    initialized: readonly(initialized),
    fullUrl: readonly(fullUrl),
    data: shallowReadonly(data),
    loading: readonly(loading),
    error: shallowReadonly(error),
    refresh,
  }
}

export default useFetch
