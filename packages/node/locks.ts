import type { Db } from 'mongodb'
import { hostname } from 'node:os'
import { randomBytes } from 'node:crypto'
import Debug from 'debug'

const debug = Debug('locks')

const pid = randomBytes(8).toString('hex')

debug('locks with pid', pid)

let interval: ReturnType<typeof setInterval>

let _db: Db | undefined

const collection = () => {
  if (!_db) throw new Error('locks utils was not initialized')
  return _db?.collection<{ _id: string, pid: string, origin?: string, hostname: string, createdAt: Date }>('locks')
}

export const init = async (db: Db, ttl = 60) => {
  _db = db
  const locks = collection()
  await locks.createIndex({ pid: 1 })
  try {
    await locks.createIndex({ updatedAt: 1 }, { expireAfterSeconds: ttl })
  } catch (err) {
    console.log('Failure to create TTL index. Probably because the value changed. Try to update it.')
    db.command({ collMod: 'locks', index: { keyPattern: { updatedAt: 1 }, expireAfterSeconds: ttl } })
  }

  // prolongate lock acquired by this process while it is still active
  interval = setInterval(() => {
    locks.updateMany({ pid }, { $currentDate: { updatedAt: true } })
  }, (ttl / 2) * 1000)
}

export const stop = async () => {
  clearInterval(interval)
  if (_db) await collection().deleteMany({ pid })
}

export async function acquire (_id: string, origin?: string): Promise<boolean> {
  if (!_db) throw new Error('locks not initialized')
  debug('acquire', _id, origin)
  const locks = collection()
  try {
    await locks.insertOne({ _id, pid, origin, hostname: hostname(), createdAt: new Date() })
    try {
      await locks.updateOne({ _id }, { $currentDate: { updatedAt: true } })
    } catch (err) {
      await locks.deleteOne({ _id, pid })
      throw err
    }
    debug('acquire ok', _id)
    return true
  } catch (err: any) {
    if (err.code !== 11000) throw err
    // duplicate means the lock was already acquired
    debug('acquire ko', _id)
    return false
  }
}

export const release = async (_id: string, delay = 0) => {
  if (!_db) throw new Error('locks not initialized')
  debug('release', _id)
  const locks = collection()
  if (delay) {
    const date = new Date((new Date()).getTime() + delay)
    await locks.updateOne({ _id, pid }, { $unset: { pid: 1 }, $set: { delayed: true, updatedAt: date } })
  } else {
    await locks.deleteOne({ _id, pid })
  }
}
