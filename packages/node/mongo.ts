import type { IndexSpecification, CreateIndexesOptions, MongoClientOptions } from 'mongodb'
import { MongoClient, MongoError } from 'mongodb'

export type IndexDefinitions = Record<string, Record<string, IndexSpecification | [IndexSpecification, CreateIndexesOptions]>>

export class Mongo {
  private _client: MongoClient | undefined

  get client () {
    if (!this._client) throw new Error('db was not connected')
    return this._client
  }

  get db () {
    return this.client.db()
  }

  connect = async (mongoUrl: string, options: MongoClientOptions = {}) => {
    if (this._client) {
      console.warn('db already connected')
      return
    }
    console.log('connecting to mongodb...')
    this._client = await MongoClient.connect(mongoUrl, { maxPoolSize: 5, ignoreUndefined: true, ...options })
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
      for (const indexName in indexDefinitions[collectionName]) {
        let key, options
        if (Array.isArray(indexDefinitions[collectionName][indexName])) {
          [key, options] = indexDefinitions[collectionName][indexName] as [import('mongodb').IndexSpecification, import('mongodb').CreateIndexesOptions]
          if (options.name && options.name !== indexName) throw new Error(`inconsistent index name ${indexName} or ${options.name}`)
          options.name = indexName
        } else {
          key = /** @type {import('mongodb').IndexSpecification} */(indexDefinitions[collectionName][indexName])
          options = { name: indexName }
        }
        await this.ensureIndex(collectionName, key, options)
      }
    }
  }
}

const mongo = new Mongo()

export default mongo
