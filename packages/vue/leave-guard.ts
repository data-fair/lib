// maybe this will be a part of vueuse someday https://github.com/vueuse/vueuse/issues/4350

import type { MaybeRefOrGetter } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'
import { toValue, onMounted, onUnmounted } from 'vue'

const messages: Record<string, string> = {
  fr: 'Attention ! La page contient des modifications non enregistrées.',
  en: 'Warning ! The page contains unsaved modifications.'
}

type LeaveGuardOptions = {
  locale?: MaybeRefOrGetter<string>,
  message?: string
}

export const useLeaveGuard = (isDirty: MaybeRefOrGetter<boolean>, options?: LeaveGuardOptions) => {
  const getMessage = () => options?.message ?? messages[options?.locale ? toValue(options.locale) : 'en'] ?? messages.en

  // vue router guard
  onBeforeRouteLeave(() => {
    if (!toValue(isDirty)) return
    return window.confirm(getMessage())
  })

  // browser guard
  const handleWindowClose = (e: BeforeUnloadEvent) => {
    if (!toValue(isDirty)) return
    e.preventDefault()
    e.returnValue = getMessage()
  }
  onMounted(() => window.addEventListener('beforeunload', handleWindowClose))
  onUnmounted(() => window.removeEventListener('beforeunload', handleWindowClose))
}

export default useLeaveGuard
