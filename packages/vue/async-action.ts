// similar to withUiNotif but more powerful

import { ref, readonly, shallowReadonly, shallowRef, type Ref } from 'vue'
import { type PartialUiNotif, type UiNotif, useUiNotif, getFullNotif, getErrorMsg } from './ui-notif.js'

type Finally = () => Promise<void>

type AsyncActionOptions = {
  error?: string,
  success?: PartialUiNotif,
  catch?: 'error' | 'success' | 'all',
  finally?: Finally
}

export function useAsyncAction<F extends (...args: any[]) => Promise<any>> (fn: F, options?: AsyncActionOptions | Finally): { execute: F, notif: Ref<UiNotif | undefined>, loading: Ref<boolean>, error: Ref<string | undefined> } {
  if (typeof options === 'function') {
    options = { finally: options }
  }
  const { sendUiNotif } = useUiNotif()
  const notif = shallowRef<UiNotif>()
  const loading = ref(false)
  const error = ref<string>()
  const execute = <F> async function (...args: any[]) {
    loading.value = true
    notif.value = undefined
    error.value = undefined
    try {
      const result = await fn(...args)
      if (options?.success) {
        const successNotif = getFullNotif(options?.success, 'success')
        notif.value = successNotif
        if (options?.catch !== 'success' && options?.catch !== 'all') {
          sendUiNotif(successNotif)
        }
      }
      loading.value = false
      return result
    } catch (err) {
      error.value = getErrorMsg(err)
      const errorNotif = getFullNotif({ msg: options?.error ?? '', error: err })
      notif.value = errorNotif
      if (options?.catch !== 'error' && options?.catch !== 'all') {
        sendUiNotif(errorNotif)
      }
      loading.value = false
    }
    if (options?.finally) {
      await options?.finally()
    }
  }

  return { execute, notif: shallowReadonly(notif), loading: readonly(loading), error: readonly(error) }
}

export default useAsyncAction
