import reconnectingWebSocketModule from 'reconnecting-websocket'
import { ref, reactive, onScopeDispose } from 'vue'

// @ts-ignore
const ReconnectingWebSocket = /** @type {typeof reconnectingWebSocketModule.default} */ (reconnectingWebSocketModule)

/**
 * @param {string} path
 */
const getWS = (path) => {
  if (!window.WebSocket) return
  // @ts-ignore
  if (import.meta.env?.SSR) return
  const url = (window.location.origin + path).replace('http:', 'ws:').replace('https:', 'wss:')
  const ws = new ReconnectingWebSocket(url)

  const subscriptions = reactive(/** @type {Record<string, ((message: any) => void)[]>} */({}))
  const opened = ref(false)

  ws.addEventListener('open', () => {
    opened.value = true
    for (const channel of Object.keys(subscriptions)) {
      if (subscriptions[channel].length) {
        ws.send(JSON.stringify({ type: 'subscribe', channel }))
      } else {
        ws.send(JSON.stringify({ type: 'unsubscribe', channel }))
        delete subscriptions[channel]
      }
    }
  })
  ws.addEventListener('close', () => {
    opened.value = false
  })
  ws.onmessage = event => {
    /** @type {import('../node/ws-types.js').Message} */
    const body = JSON.parse(event.data)
    if (body.type === 'message') {
      if (subscriptions[body.channel]?.length) {
        for (const listener of subscriptions[body.channel]) {
          listener(body.data)
        }
      }
    }
  }

  /**
   * @template T
   * @param {string} channel
   * @param {(message: T) => void} listener
   */
  const subscribe = (channel, listener) => {
    if (!subscriptions[channel]) {
      subscriptions[channel] = []
      if (opened.value) ws.send(JSON.stringify({ type: 'subscribe', channel }))
    }
    subscriptions[channel].push(listener)

    onScopeDispose(() => {
      unsubscribe(channel, listener)
    })
  }

  /**
   * @param {string} channel
   * @param {(message: any) => void} listener
   */
  const unsubscribe = (channel, listener) => {
    if (subscriptions[channel]) {
      subscriptions[channel] = subscriptions[channel].filter(l => l !== listener)
      if (subscriptions[channel].length === 0 && opened.value) {
        ws.send(JSON.stringify({ type: 'unsubscribe', channel }))
        delete subscriptions[channel]
      }
    }
  }

  return { opened, ws, subscribe, unsubscribe }
}

/** @type {Record<string, ReturnType<typeof getWS>>} */
const sockets = {}

/**
 * @param {string} path
 */
export function useWS (path) {
  sockets[path] = sockets[path] ?? getWS(path)
  return sockets[path]
}

export default useWS
