import type { IndexSpecification, CreateIndexesOptions, MongoClientOptions, IndexDirection, Db } from 'mongodb'
import { MongoClient, MongoError } from 'mongodb'

type IndexDirections = Record<string, IndexDirection>

export type IndexDefinitions = Record<string, Record<string, null | IndexDirections | [IndexDirections, CreateIndexesOptions]>>

export class Mongo {
  private _client: MongoClient | undefined
  private _db: Db | undefined

  get client () {
    if (!this._client) throw new Error('db was not connected')
    return this._client
  }

  get db () {
    if (!this._db) throw new Error('db was not connected')
    return this._db
  }

  connect = async (mongoUrl: string, options: MongoClientOptions = {}) => {
    if (this._client) {
      console.warn('db already connected')
      return
    }
    console.log('connecting to mongodb...')
    this._client = await MongoClient.connect(mongoUrl, { maxPoolSize: 5, ignoreUndefined: true, ...options })
    this._db = this._client.db()
    console.log('...ok')
  }

  // Create an index if it does not exist and manage overwriting existing and conflicting index definitions
  ensureIndex = async (collection: string, key: IndexSpecification, options: CreateIndexesOptions = {}) => {
    try {
      await this.db.collection(collection).createIndex(key, options)
    } catch (err) {
      if (options.name && err instanceof MongoError && (err.code === 85 || err.code === 86)) {
      // if the error is a conflict on keys or params of the index we automatically
      // delete then recreate the index
        console.log(`drop then recreate index ${collection}/${options.name}`)
        await this.db.collection(collection).dropIndex(options.name)
        await this.db.collection(collection).createIndex(key, options)
      } else {
        throw err
      }
    }
  }

  /**
   * create a bunch of indexes and overtwrite previous definitions
   * the structure forces giving names to indexes which is better for managing them properly
   */
  configure = async (indexDefinitions: IndexDefinitions) => {
    for (const collectionName in indexDefinitions) {
      try {
        await this.db.createCollection(collectionName)
      } catch (err) {
        // nothing TODO
      }
      for (const indexName in indexDefinitions[collectionName]) {
        let key: IndexDirections, options: CreateIndexesOptions
        const indexDefinition = indexDefinitions[collectionName][indexName]
        if (indexDefinition === null) {
          if (await this.db.collection(collectionName).indexExists(indexName)) {
            await this.db.collection(collectionName).dropIndex(indexName)
          }
          continue
        } else if (Array.isArray(indexDefinition)) {
          [key, options] = indexDefinition
          if (options.name && options.name !== indexName) throw new Error(`inconsistent index name ${indexName} or ${options.name}`)
          options.name = indexName
        } else {
          key = indexDefinition
          options = { name: indexName }
        }
        await this.ensureIndex(collectionName, key, options)
      }
    }
  }
}

const mongo = new Mongo()

export default mongo
