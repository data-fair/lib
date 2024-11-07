import type { Db } from 'mongodb'
import { hostname } from 'node:os'
import { randomBytes } from 'node:crypto'
import Debug from 'debug'

const debug = Debug('locks')

export class Locks {
  pid: string
  private interval: ReturnType<typeof setInterval> | undefined
  private _db: Db | undefined
  get db () {
    if (!this._db) throw new Error('locks utils was not initialized')
    return this._db
  }

  get collection () {
    return this.db.collection<{ _id: string, pid: string, origin?: string, hostname: string, createdAt: Date }>('locks')
  }

  constructor () {
    this.pid = randomBytes(8).toString('hex')
    debug('locks with pid', this.pid)
  }

  start = async (db: Db, ttl = 60) => {
    this._db = db
    await this.collection.createIndex({ pid: 1 })
    try {
      await this.collection.createIndex({ updatedAt: 1 }, { expireAfterSeconds: ttl })
    } catch (err) {
      console.log('Failure to create TTL index. Probably because the value changed. Try to update it.')
      db.command({ collMod: 'locks', index: { keyPattern: { updatedAt: 1 }, expireAfterSeconds: ttl } })
    }

    // prolongate lock acquired by this process while it is still active
    this.interval = setInterval(() => {
      this.collection.updateMany({ pid: this.pid }, { $currentDate: { updatedAt: true } })
    }, (ttl / 2) * 1000)
  }

  stop = async () => {
    clearInterval(this.interval)
    if (this._db) await this.collection.deleteMany({ pid: this.pid })
  }

  acquire = async (_id: string, origin?: string): Promise<boolean> => {
    debug('acquire', _id, origin)
    try {
      await this.collection.insertOne({ _id, pid: this.pid, origin, hostname: hostname(), createdAt: new Date() })
      try {
        await this.collection.updateOne({ _id }, { $currentDate: { updatedAt: true } })
      } catch (err) {
        await this.collection.deleteOne({ _id, pid: this.pid })
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

  release = async (_id: string, delay = 0) => {
    debug('release', _id)
    if (delay) {
      const date = new Date((new Date()).getTime() + delay)
      await this.collection.updateOne({ _id, pid: this.pid }, { $unset: { pid: 1 }, $set: { delayed: true, updatedAt: date } })
    } else {
      await this.collection.deleteOne({ _id, pid: this.pid })
    }
  }
}

const locks = new Locks()

export default locks
