import reconnectingWebSocketModule from 'reconnecting-websocket'
import { ref, reactive, onScopeDispose } from 'vue'
import type { Message } from '@data-fair/lib-common-types/ws.js'

const ReconnectingWebSocket = reconnectingWebSocketModule as unknown as typeof reconnectingWebSocketModule.default

const getWS = (path: string) => {
  if (!window.WebSocket) return
  // @ts-ignore
  if (import.meta.env?.SSR) return
  const url = (window.location.origin + path).replace('http:', 'ws:').replace('https:', 'wss:')
  const ws = new ReconnectingWebSocket(url)

  const subscriptions = reactive({} as Record<string, ((message: any) => void)[]>)
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
  ws.onmessage = (event: any) => {
    const body = JSON.parse(event.data) as Message
    if (body.type === 'message') {
      if (subscriptions[body.channel]?.length) {
        for (const listener of subscriptions[body.channel]) {
          listener(body.data)
        }
      }
    }
  }

  function subscribe <T> (channel: string, listener: (message: T) => void) {
    if (!subscriptions[channel]) {
      subscriptions[channel] = []
      if (opened.value) ws.send(JSON.stringify({ type: 'subscribe', channel }))
    }
    subscriptions[channel].push(listener)

    onScopeDispose(() => {
      unsubscribe(channel, listener)
    })
  }

  const unsubscribe = (channel: string, listener: (message: any) => void) => {
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

const sockets: Record<string, ReturnType<typeof getWS>> = {}

export function useWS (path: string) {
  sockets[path] = sockets[path] ?? getWS(path)
  return sockets[path]
}

export default useWS
