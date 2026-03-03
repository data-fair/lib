# WebSocket Library Source API

Abridged source of the three library modules. Read this only when you need to
understand internal behavior or debug an issue.

---

## `@data-fair/lib-node/ws-emitter` (`packages/node/ws-emitter.ts`)

```ts
import type { Db, Collection } from 'mongodb'

// Creates or reuses a capped MongoDB collection as a message queue.
export const initMessagesCollection = async (db: Db) => {
  const collection = (await db.listCollections({ name: 'ws-messages' }).toArray())[0]
  if (!collection) await db.createCollection('ws-messages', { capped: true, size: 100000, max: 1000 })
  return db.collection('ws-messages')
}

let messagesCollection: Collection | undefined

// Must be called once per process before emit().
export const init = async (db: Db) => {
  if (messagesCollection) return
  messagesCollection = await initMessagesCollection(db)
  await messagesCollection.insertOne({ type: 'init' })
}

// Write a message to the capped collection for delivery by ws-server.
export const emit = async (channel: string, data: any) => {
  if (!messagesCollection) throw new Error('wsEmitter.init was not called before sending data')
  await messagesCollection.insertOne({
    type: 'message', channel, data, date: new Date().toISOString()
  })
}
```

Key details:
- Capped collection: 100KB, max 1000 docs. Old messages are auto-evicted.
- `init()` is idempotent — safe to call multiple times.
- `emit()` throws if `init()` wasn't called.

---

## `@data-fair/lib-express/ws-server` (`packages/express/ws-server.ts`)

```ts
import type { Server } from 'node:http'
import type { Db } from 'mongodb'
import type { SessionState } from '@data-fair/lib-common-types/session/index.js'
import { WebSocketServer } from 'ws'
import { session } from '@data-fair/lib-express'

// In-memory subscription tracking
const subscribers: Record<string, Set<string>> = {}  // channel -> set of clientIds
const clients: Record<string, WebSocket> = {}         // clientId -> ws connection

export const start = async (
  server: Server,
  db: Db,
  canSubscribe: (channel: string, sessionState: SessionState, message: any) => Promise<boolean>
) => { /* ... */ }

export const stop = async () => { /* ... */ }
```

Lifecycle:
1. `start()` creates a `WebSocketServer` on the HTTP server.
2. Each connection gets a `nanoid()` client ID.
3. On `subscribe` message: calls `session.req(req)` to get the session, then
   `canSubscribe(channel, sessionState, message)`. Admin mode bypasses the check.
4. A tailable cursor on `ws-messages` streams new documents to matching subscribers.
5. Ping/pong every 30s detects dead connections.
6. `stop()` closes the WSS and the cursor.

---

## `@data-fair/lib-vue/ws` (`packages/vue/ws.ts`)

```ts
import ReconnectingWebSocket from 'reconnecting-websocket'
import { ref, reactive, onScopeDispose } from 'vue'

function getWS(path: string) {
  const url = (window.location.origin + path).replace('http:', 'ws:').replace('https:', 'wss:')
  const ws = new ReconnectingWebSocket(url)
  const subscriptions = reactive({} as Record<string, ((msg: any) => void)[]>)
  const opened = ref(false)

  // On open: re-subscribe to all active channels
  // On message: dispatch to matching channel listeners
  // subscribe(channel, listener): adds listener, sends subscribe msg if first
  // unsubscribe(channel, listener): removes listener, sends unsubscribe msg if last
  // onScopeDispose auto-unsubscribes

  return { opened, ws, subscribe, unsubscribe }
}

// Singleton per path
const sockets: Record<string, ReturnType<typeof getWS>> = {}

export function useWS(path: string) {
  sockets[path] = sockets[path] ?? getWS(path)
  return sockets[path]
}
```

Key details:
- `useWS` returns `undefined` during SSR (checks `import.meta.env?.SSR`).
- `opened` is a reactive `ref<boolean>` — can be watched to show connection status.
- Multiple calls with the same path share one connection.
- Subscriptions re-sent on every reconnect automatically.

---

## `@data-fair/lib-node/ws-client` (`packages/node/ws-client.ts`)

```ts
import { type Message } from '@data-fair/lib-common-types/ws.js'
import { type Account } from '@data-fair/lib-common-types/session/index.js'
import EventEmitter from 'node:events'
import WebSocket from 'ws'

type logFn = (msg: string, ...args: any[]) => void

export interface WsClientOpts {
  log?: { info: logFn, error: logFn, debug: logFn }
  url: string
  headers?: Record<string, string>
  apiKey?: string
  adminMode?: boolean
  account?: Account
}

export type FullWsClientOpts = WsClientOpts & Required<Pick<WsClientOpts, 'log'>>

// Generic WS client with auto-reconnect, JSON parsing, channel subscriptions.
export class WsClient extends EventEmitter {
  private _channels: string[]
  private _ws: WebSocket | undefined
  opts: FullWsClientOpts

  constructor(opts: WsClientOpts) { /* defaults log to console */ }

  // Opens a WebSocket connection (converts http:// to ws://)
  private async _connect(): Promise<WebSocket> { /* ... */ }

  // Reconnects and re-subscribes to all channels
  private async _reconnect() { /* ... */ }

  // Subscribe to a channel. Sends apiKey + account in the subscribe message.
  // Waits for subscribe-confirm or throws on error.
  async subscribe(channel: string, force = false, timeout = 2000) { /* ... */ }

  // Subscribe (unless skipSubscribe) then wait for a message matching the filter.
  // Returns the message data (or full Message if fullMessage=true).
  // Rejects on timeout (default 5 min).
  async waitFor(
    channel: string,
    filter?: (message: Message) => boolean,
    timeout = 300000,
    skipSubscribe = false,
    fullMessage = false
  ): Promise<Message> { /* ... */ }

  // Terminates the WebSocket connection.
  close() { /* ... */ }
}

// Specialized client for Data Fair dataset journal events.
export class DataFairWsClient extends WsClient {
  // Subscribes to `datasets/${datasetId}/journal` and waits for the given
  // eventType. Throws if an 'error' event arrives first.
  async waitForJournal(datasetId: string, eventType: string, timeout = 300000) { /* ... */ }
}
```

Key details:
- Extends `EventEmitter` — emits `'message'` events with parsed `Message` objects.
- Auto-reconnect on connection error: calls `_reconnect()` which re-subscribes all channels.
- `subscribe()` sends `{ type: 'subscribe', channel, apiKey?, account? }` — the server's
  `canSubscribe` callback receives apiKey and account via the `message` parameter.
- `waitFor()` by default returns just `message.data`; pass `fullMessage=true` to get
  the full `Message` envelope (used internally for subscribe-confirm handling).
- Used in `@data-fair/lib-processing-dev/tests-utils.ts` to create `DataFairWsClient`
  instances for processing plugin integration tests.

---

## `@data-fair/lib-common-types/ws` (`packages/common-types/ws.ts`)

```ts
export interface Message {
  type: string
  channel: string
  data?: any
  status?: number
}
```
