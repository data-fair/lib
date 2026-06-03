// simple composable to display store a UI notification
// when embedded it is transmitted to the parent as a native d-frame notification message
// (['df-child', 'notif', notif]), or it can be displayed locally by @data-fair/lib-vuetify/ui-notif.vue

import type { App } from 'vue'
import { shallowRef, inject } from 'vue'
import inIframe from '@data-fair/lib-utils/in-iframe.js'

export type UiNotif = UiNotifBase | UiNotifError

type NotifType = 'default' | 'info' | 'success' | 'warning' | 'error'

export type PartialUiNotif = string | {
  type?: NotifType
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
  error?: any
  errorMsg: string
  clientError?: boolean
}

export function getErrorCode (error: any): number {
  if (typeof error === 'string') return 500
  if (typeof error.statusCode === 'number') return error.statusCode
  if (typeof error.response?.statusCode === 'number') return error.response?.statusCode
  if (typeof error.code === 'number') return error.code
  if (typeof error.response?.code === 'number') return error.response?.code
  return 500
}

export function getErrorMsg (error: any): string {
  if (typeof error === 'string') return error
  if (error.data && typeof error.data === 'string') return error.data
  if (error.response?.data && typeof error.response.data === 'string') return error.response.data
  if (error.statusText && typeof error.statusText === 'string') return error.statusText
  if (error.response?.statusText && typeof error.response?.statusText === 'string') return error.response?.statusText
  if (error.message) return error.message
  return 'erreur inconnue'
}

export function getFullNotif (notif: PartialUiNotif, defaultType: UiNotifBase['type'] = 'default'): UiNotif {
  if (typeof notif === 'string') return { msg: notif, type: defaultType }
  if (notif.error) {
    const code = getErrorCode(notif.error)
    return {
      ...notif,
      type: 'error',
      errorMsg: getErrorMsg(notif.error),
      clientError: code < 500
    } as UiNotifError
  }
  return {
    ...notif,
    type: notif.type ?? defaultType
  } as UiNotifBase
}

// native d-frame child -> parent notification payload, mirrors the `Notif`
// type from @data-fair/frame (lib/messages.ts), kept inline to avoid a
// dependency on @data-fair/frame from this foundational package
export type DFrameNotif = {
  type: 'default' | 'info' | 'success' | 'warning' | 'error'
  title: string
  detail?: string
}

// convert a resolved UiNotif into the native d-frame Notif shape; mirrors
// @data-fair/frame's convertVIframeUiNotif so the host renders notifications
// identically to the former v-iframe-compat path
export function toDFrameNotif (notif: UiNotif): DFrameNotif {
  if (notif.type === 'error') {
    return {
      type: notif.clientError ? 'warning' : 'error',
      title: notif.msg,
      detail: notif.errorMsg
    }
  }
  return {
    type: notif.type ?? 'default',
    title: notif.msg
  }
}

export const getUiNotif = () => {
  const notification = shallowRef(null as null | UiNotif)
  function sendUiNotif (partialNotif: PartialUiNotif) {
    const notif = notification.value = getFullNotif(partialNotif)
    if (inIframe) {
      // emit the native d-frame notification message consumed by an embedding
      // <d-frame> host; v-iframe is deprecated so the legacy
      // { vIframe: true, uiNotification } payload is no longer emitted
      window.parent.postMessage(['df-child', 'notif', toDFrameNotif(notif)], '*')
    } else {
      console.log('iframe notification', notif)
    }
  }
  return { notification, sendUiNotif }
}

// uses pattern for SSR friendly plugin/composable, cf https://antfu.me/posts/composable-vue-vueday-2021#shared-state-ssr-friendly
export const uiNotifKey = Symbol('uiNotif')
export function createUiNotif () {
  const uiNotif = getUiNotif()
  return { install (app: App) { app.provide(uiNotifKey, uiNotif) } }
}
export function useUiNotif () {
  const uiNotif = inject(uiNotifKey)
  if (!uiNotif) throw new Error('useUiNotif requires using the plugin createUiNotif')
  return uiNotif as ReturnType<typeof getUiNotif>
}
export default useUiNotif

export function withUiNotif<F extends (...args: any[]) => Promise<any>> (fn: F, errorMsg?: string, successNotif?: PartialUiNotif): F {
  const { sendUiNotif } = useUiNotif()
  console.warn('withUiNotif is deprecated, use useAsyncAction instead')
  return <F> async function (...args: any[]) {
    try {
      const result = await fn(...args)
      if (successNotif) sendUiNotif(getFullNotif(successNotif, 'success'))
      return result
    } catch (error) {
      sendUiNotif({ msg: errorMsg ?? '', error })
    }
  }
}
