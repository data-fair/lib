// write messages to a mongodb collection/queue for publication by ws-server.js and consumption by ws.js

/**
 * return a capped mongodb collection that acts as a simple queue
 * @param {import('mongodb').Db } db
 * @returns {Promise<import('mongodb').Collection>}
 */
export const initMessagesCollection = async (db) => {
  const collection = (await db.listCollections({ name: 'ws-messages' }).toArray())[0]
  if (!collection) await db.createCollection('ws-messages', { capped: true, size: 100000, max: 1000 })
  return db.collection('ws-messages')
}

/** @type {import('mongodb').Collection | null} */
let messagesCollection

/**
 * but that writes messages
 * @param {import('mongodb').Db} db
 */
export const init = async (db) => {
  // Write to pubsub channel
  messagesCollection = await initMessagesCollection(db)
  await messagesCollection.insertOne({ type: 'init' })
}

/**
 *
 * @param {string} channel
 * @param {any} data
 */
export const emit = async (channel, data) => {
  if (!messagesCollection) throw new Error('wsEmitter.init was not called before sending data')
  await messagesCollection.insertOne({ type: 'message', channel, data, date: new Date().toISOString() })
}
