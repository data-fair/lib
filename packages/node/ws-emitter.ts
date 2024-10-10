// write messages to a mongodb collection/queue for publication by ws-server.js and consumption by ws.js

import type { Db, Collection } from 'mongodb'

// return a capped mongodb collection that acts as a simple queue
export const initMessagesCollection = async (db: Db) => {
  const collection = (await db.listCollections({ name: 'ws-messages' }).toArray())[0]
  if (!collection) await db.createCollection('ws-messages', { capped: true, size: 100000, max: 1000 })
  return db.collection('ws-messages')
}

let messagesCollection: Collection | undefined

export const init = async (db: Db) => {
  messagesCollection = await initMessagesCollection(db)
  await messagesCollection.insertOne({ type: 'init' })
}

export const emit = async (channel: string, data: any) => {
  if (!messagesCollection) throw new Error('wsEmitter.init was not called before sending data')
  await messagesCollection.insertOne({ type: 'message', channel, data, date: new Date().toISOString() })
}
