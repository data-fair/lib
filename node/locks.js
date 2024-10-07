import { hostname } from 'node:os'
import { randomBytes } from 'node:crypto'
import Debug from 'debug'

const debug = Debug('locks')

const pid = randomBytes(8).toString('hex')

debug('locks with pid', pid)

/** @type {ReturnType<setInterval>} */
let interval

/** @type {import('mongodb').Db | undefined} */
let _db

/**
 * @param {import('mongodb').Db} db
 * @param {number} [ttl]
 */
export const init = async (db, ttl = 60) => {
  const locks = db.collection('locks')
  await locks.createIndex({ pid: 1 })
  try {
    await locks.createIndex({ updatedAt: 1 }, { expireAfterSeconds: ttl })
  } catch (err) {
    console.log('Failure to create TTL index. Probably because the value changed. Try to update it.')
    db.command({ collMod: 'locks', index: { keyPattern: { updatedAt: 1 }, expireAfterSeconds: ttl } })
  }

  _db = db

  // prolongate lock acquired by this process while it is still active
  interval = setInterval(() => {
    // @ts-ignore
    locks.updateMany({ pid }, { $currentDate: { updatedAt: true } })
  }, (ttl / 2) * 1000)
}

export const stop = async () => {
  clearInterval(interval)
  if (_db) await _db.collection('locks').deleteMany({ pid })
}

/**
 * @param {string} _id
 * @param {string} [origin]
 * @returns {Promise<boolean>}
 */
export const acquire = async (_id, origin) => {
  if (!_db) throw new Error('locks not initialized')
  debug('acquire', _id, origin)
  const locks = _db.collection('locks')
  try {
    // @ts-ignore
    await locks.insertOne({ _id, pid, origin, hostname: hostname(), createdAt: new Date() })
    try {
      // @ts-ignore
      await locks.updateOne({ _id }, { $currentDate: { updatedAt: true } })
    } catch (err) {
      // @ts-ignore
      await locks.deleteOne({ _id, pid })
      throw err
    }
    debug('acquire ok', _id)
    return true
  } catch (/** @type {any} */err) {
    if (err.code !== 11000) throw err
    // duplicate means the lock was already acquired
    debug('acquire ko', _id)
    return false
  }
}

/**
 * @param {string} _id
 * @param {number} [delay ]
 */
export const release = async (_id, delay = 0) => {
  if (!_db) throw new Error('locks not initialized')
  debug('release', _id)
  const locks = _db.collection('locks')
  if (delay) {
    const date = new Date((new Date()).getTime() + delay)
    // @ts-ignore
    await locks.updateOne({ _id, pid }, { $unset: { pid: 1 }, $set: { delayed: true, updatedAt: date } })
  } else {
    // @ts-ignore
    await locks.deleteOne({ _id, pid })
  }
}
