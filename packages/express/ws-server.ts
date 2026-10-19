// Create a WebSocker server with scalable publish/subscribe system

// Bodies are simple JSON objects following theses conventions:

/*
Upstream examples:
{type: 'subscribe', channel: 'my_channel'}
{type: 'unsubscribe', channel: 'my_channel'}

Downstream examples:
{type: 'subscribe-confirm', channel: 'my_channel'}
{type: 'unsubscribe-confirm', channel: 'my_channel'}
{type: 'message', channel: 'my_channel', data: {...}, 'date': 'my_iso_date'}
{type: 'error', data: {...}}
*/

import type { Server, IncomingMessage } from 'node:http'
import type { Db, Collection } from 'mongodb'
import type { SessionState } from '@data-fair/lib-common-types/session/index.js'
import type { Message } from '@data-fair/lib-common-types/ws.js'
import { nanoid } from 'nanoid'
import { WebSocketServer } from 'ws'
import { assertScope } from '@data-fair/lib-common-types/session/index.js'
import { session, markScopeChecked } from '@data-fair/lib-express'
import { internalError } from '@data-fair/lib-node/observer.js'
import { initMessagesCollection } from '@data-fair/lib-node/ws-emitter.js'

let cursor: any
let wss: WebSocketServer | undefined
const subscribers: Record<string, Set<string>> = {}
const clients: Record<string, import('ws').WebSocket> = {}

const isAlive = Symbol('isActive')

type CanSubscribe = (channel: string, sessionState: SessionState, message: any) => Promise<boolean>
type ChannelScopes = (channel: string) => string[] | undefined

export type SubscribeDecision = { ok: true } | { ok: false, status: number, data: string }

// decides if a session can subscribe to a channel. Scope-restricted sessions are only accepted on
// channels for which the service declares accepted scopes, canSubscribe still applies afterwards
export const subscribeDecision = async (
  sessionState: SessionState,
  channel: string,
  message: any,
  canSubscribe: CanSubscribe,
  channelScopes?: ChannelScopes
): Promise<SubscribeDecision> => {
  const restricted = !!sessionState.scopes || sessionState.user?.scope !== undefined
  if (restricted) {
    const accepted = channelScopes?.(channel)
    if (!accepted) return { ok: false, status: 403, data: 'scope-restricted sessions cannot subscribe to this channel' }
    // a raw claim without parsed scopes cannot be matched (assertScope would let it through): refuse
    if (!sessionState.scopes) return { ok: false, status: 403, data: 'scope-restricted sessions cannot subscribe to this channel' }
    try {
      assertScope(sessionState, accepted)
    } catch (err: any) {
      return { ok: false, status: err.status ?? 403, data: err.message }
    }
  }
  if (!(!restricted && sessionState.user?.adminMode) && !await canSubscribe(channel, sessionState, message)) {
    return { ok: false, status: 403, data: 'Permission manquante.' }
  }
  return { ok: true }
}

// reads the session of the upgrade request and decides on one subscribe message.
// Scope checks are per channel, not per request. The route guard is satisfied on a per-message
// child of the upgrade request: a mark on the upgrade req itself would leak to every later
// channel of the connection. headers/socket resolve through the prototype, so boundIp still applies.
export const subscribeForRequest = async (
  req: IncomingMessage,
  channel: string,
  message: any,
  canSubscribe: CanSubscribe,
  channelScopes?: ChannelScopes
): Promise<SubscribeDecision> => {
  const scopedReq = Object.create(req)
  markScopeChecked(scopedReq)
  const sessionState = await session.req(scopedReq)
  return subscribeDecision(sessionState, channel, message, canSubscribe, channelScopes)
}

let stopped = false
// parse and validate a raw client frame. Must never throw on arbitrary input:
// a bare "null" used to pass the typeof guard and then crash the handler.
export const parseFrame = (str: string): { error: { type: 'error', status: number, data: any, channel?: string } } | { message: { channel: string, type: string, [k: string]: any } } => {
  let message
  try {
    message = JSON.parse(str)
  } catch (err: any) {
    return { error: { type: 'error', status: 400, data: err.message ?? err } }
  }
  if (!message || typeof message !== 'object' || !message.channel) {
    return { error: { type: 'error', status: 400, data: '"channel" is required' } }
  }
  if (!message.type || ['subscribe', 'unsubscribe'].indexOf(message.type) === -1) {
    return { error: { type: 'error', channel: message.channel, status: 400, data: 'type should be "subscribe" or "unsubscribe"' } }
  }
  return { message }
}

export const start = async (
  server: Server,
  db: Db,
  canSubscribe: CanSubscribe,
  options: { channelScopes?: ChannelScopes } = {}
) => {
  const messagesCollection = await initMessagesCollection(db)
  wss = new WebSocketServer({ server })
  wss.on('connection', async (ws, req) => {
    // Associate ws connections to ids for subscriptions
    const clientId = nanoid()
    clients[clientId] = ws

    // Manage subscribe/unsubscribe demands
    ws.on('message', async str => {
      if (stopped) return

      const parsed = parseFrame(str.toString())
      if ('error' in parsed) return ws.send(JSON.stringify(parsed.error))
      const message = parsed.message
      try {
        if (message.type === 'subscribe') {
          const decision = await subscribeForRequest(req, message.channel, message, canSubscribe, options.channelScopes)
          if (!decision.ok) {
            return ws.send(JSON.stringify({ type: 'error', channel: message.channel, status: decision.status, data: decision.data }))
          }
          subscribers[message.channel] = subscribers[message.channel] || new Set()
          subscribers[message.channel].add(clientId)
          return ws.send(JSON.stringify({ type: 'subscribe-confirm', channel: message.channel }))
        }
        if (message.type === 'unsubscribe') {
          subscribers[message.channel] = subscribers[message.channel] || new Set()
          subscribers[message.channel].delete(clientId)
          return ws.send(JSON.stringify({ type: 'unsubscribe-confirm', channel: message.channel }))
        }
      } catch (err: any) {
        const status = err.status ?? err.statusCode ?? 500
        const errorMessage: Message = { type: 'error', status, data: err.message ?? err, channel: message?.channel }
        if (status >= 500) internalError('ws-error', err)
        return ws.send(JSON.stringify(errorMessage))
      }
    })

    ws.on('close', () => {
      Object.keys(subscribers).forEach(channel => {
        subscribers[channel].delete(clientId)
      })
      delete clients[clientId]
    })

    ws.on('error', () => ws.terminate())

    // @ts-ignore
    ws[isAlive] = true
    ws.on('pong', () => {
      // @ts-ignore
      ws[isAlive] = true
    })
  })

  // standard ping/pong used to detect lost connections
  setInterval(function ping () {
    if (stopped || !wss) return
    for (const ws of wss.clients) {
      // @ts-ignore
      if (ws[isAlive] === false) { ws.terminate(); continue }
      // @ts-ignore
      ws[isAlive] = false
      ws.ping('', false, () => {})
    }
  }, 30000)

  await messagesCollection.insertOne({ type: 'init' })
  initCursor(db, messagesCollection)
}

export const stop = async () => {
  if (wss) wss.close()
  stopped = true
  if (cursor) await cursor.close()
}

// Listen to pubsub channel based on mongodb to support scaling on multiple processes

const initCursor = async (db: Db, messagesCollection: Collection) => {
  let nbCursors = 0
  while (true) {
    if (stopped) break
    if (nbCursors > 0) await new Promise(resolve => setTimeout(resolve, 1000))
    nbCursors++
    const startDate = new Date().toISOString()
    try {
      cursor = messagesCollection.find({}, { tailable: true, awaitData: true })
      for await (const doc of cursor) {
        if (doc && doc.type === 'message') {
          if (doc.date && doc.date < startDate) continue
          if (!subscribers[doc.channel]) continue
          for (const subscriber of subscribers[doc.channel]) {
            if (clients[subscriber]) clients[subscriber].send(JSON.stringify(doc))
          }
        }
      }
    } catch (err: any) {
      if (stopped) break
      console.log('WS tailable cursor was interrupted, reinit it', err && err.message)
    }
  }
}
