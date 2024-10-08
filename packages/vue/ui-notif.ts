import type { App } from 'vue'
import { ref, inject } from 'vue'
import inIframe from '@data-fair/lib-utils/in-iframe.js'

export type UiNotif = UiNotifBase | UiNotifError

export interface PartialUiNotif {
  type?: 'default' | 'info' | 'success' | 'warning' | 'error'
  msg: string
  error?: any
  errorMsg?: string
}

interface UiNotifBase {
  type?: 'default' | 'info' | 'success' | 'warning'
  msg: string
}

interface UiNotifError {
  type: 'error'
  msg: string
  error: any
  errorMsg: string
}

function getFullNotif (notif: PartialUiNotif | string): UiNotif {
  if (typeof notif === 'string') return { msg: notif, type: 'default' }
  if (notif.error) {
    notif.type = 'error'
    notif.errorMsg = (notif.error.response && (notif.error.response.data || notif.error.response.status)) || notif.error.message || notif.error
  }
  notif.type = notif.type || 'default'
  if (inIframe) {
    window.top?.postMessage({ vIframe: true, uiNotification: notif }, '*')
  } else {
    console.log('notification', notif)
  }
  throw new Error('invalid UI notification')
}

export const getUiNotif = () => {
  const current = ref(null as null | UiNotif)

  const send = (partialNotif: PartialUiNotif) => {
    current.value = getFullNotif(partialNotif)
  }
  return { current, send }
}

// uses pattern for SSR friendly plugin/composable, cf https://antfu.me/posts/composable-vue-vueday-2021#shared-state-ssr-friendly
export const uiNotifKey = Symbol('uiNotif')
export function createUiNotif () {
  const uiNotif = getUiNotif()
  return { install (app: App) { app.provide(uiNotifKey, uiNotif) } }
}
export function useUiNotif () {
  const session = inject(uiNotifKey)
  if (!session) throw new Error('useUiNotif requires using the plugin createUiNotif')
  return session as ReturnType<typeof getUiNotif>
}
export default useUiNotif
