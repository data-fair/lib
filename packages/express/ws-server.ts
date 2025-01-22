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

import type { Server } from 'node:http'
import type { Db, Collection } from 'mongodb'
import type { SessionState } from '@data-fair/lib-common-types/session/index.js'
import type { Message } from '@data-fair/lib-common-types/ws.js'
import { nanoid } from 'nanoid'
import { WebSocketServer } from 'ws'
import { session } from '@data-fair/lib-express'
import { internalError } from '@data-fair/lib-node/observer.js'
import { initMessagesCollection } from '@data-fair/lib-node/ws-emitter.js'

let cursor: any
let wss: WebSocketServer | undefined
const subscribers: Record<string, Set<string>> = {}
const clients: Record<string, import('ws').WebSocket> = {}

const isAlive = Symbol('isActive')

let stopped = false
export const start = async (
  server: Server,
  db: Db,
  canSubscribe: (channel: string, sessionState: SessionState, message: any) => Promise<boolean>
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

      let message
      try {
        message = JSON.parse(str.toString())
      } catch (err: any) {
        const errorMessage = { type: 'error', status: 400, data: err.message ?? err, channel: message.channel }
        return ws.send(JSON.stringify(errorMessage))
      }
      try {
        if (!message.channel) {
          return ws.send(JSON.stringify({ type: 'error', status: 400, data: '"channel" is required' }))
        }
        if (!message.type || ['subscribe', 'unsubscribe'].indexOf(message.type) === -1) {
          return ws.send(JSON.stringify({ type: 'error', channel: message.channel, status: 400, data: 'type should be "subscribe" or "unsubscribe"' }))
        }
        if (message.type === 'subscribe') {
          const sessionState = await session.req(req)
          if (!await canSubscribe(message.channel, sessionState, message)) {
            return ws.send(JSON.stringify({ type: 'error', channel: message.channel, status: 403, data: 'Permission manquante.' }))
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
        const errorMessage: Message = { type: 'error', status: 500, data: err.message ?? err, channel: message.channel }
        internalError('ws-error', err)
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
      if (ws[isAlive] === false) return ws.terminate()
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
