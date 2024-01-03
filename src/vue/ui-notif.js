import { ref, inject } from 'vue'
import inIframe from '../in-iframe.js'

/**
 * @typedef {import('./ui-notif-types.js').UiNotif} UiNotif
 * @typedef {import('./ui-notif-types.js').PartialUiNotif} PartialUiNotif
 */

/**
 * @param {PartialUiNotif | string} notif
 * @returns {UiNotif}
 */
function getFullNotif (notif) {
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
  /** @type {import('vue').Ref<null | UiNotif>} */
  const current = ref(null)

  const send = (/** @type {PartialUiNotif} */partialNotif) => {
    current.value = getFullNotif(partialNotif)
  }
  return { current, send }
}

// uses pattern for SSR friendly plugin/composable, cf https://antfu.me/posts/composable-vue-vueday-2021#shared-state-ssr-friendly
export const uiNotifKey = Symbol('uiNotif')
export function createUiNotif () {
  const uiNotif = getUiNotif()
  return { install (/** @type {import('vue').App} */app) { app.provide(uiNotifKey, uiNotif) } }
}
export function useUiNotif () {
  const session = inject(uiNotifKey)
  if (!session) throw new Error('useUiNotif requires using the plugin createUiNotif')
  return /** @type {ReturnType<typeof getUiNotif>} */(session)
}
export default useUiNotif
