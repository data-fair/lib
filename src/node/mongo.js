import { MongoClient, MongoError } from 'mongodb'

// const debug = Debug('db')

/**
 * @typedef {import('./mongo-types.js').IndexDefinitions} IndexDefinitions
 */

export class Mongo {
  /**
   * @type {import('mongodb').MongoClient | undefined}
   * @private
   */
  _client

  get client () {
    if (!this._client) throw new Error('db was not connected')
    return this._client
  }

  get db () {
    return this.client.db()
  }

  /**
   * @param {string} mongoUrl
   * @param {import('mongodb').MongoClientOptions} options
   */
  connect = async (mongoUrl, options = {}) => {
    if (this._client) {
      console.warn('db already connected')
      return
    }
    console.log('connecting to mongodb...')
    this._client = await MongoClient.connect(mongoUrl, { maxPoolSize: 5, ...options })
    console.log('...ok')
  }

  /**
   * Create an index if it does not exist and manage overwriting existing and conflicting index definitions
   * @param {string} collection
   * @param {import('mongodb').IndexSpecification} key
   * @param {import('mongodb').CreateIndexesOptions} options
   */
  ensureIndex = async (collection, key, options = {}) => {
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
   * @param {IndexDefinitions} indexDefinitions
   */
  configure = async (indexDefinitions) => {
    for (const collectionName in indexDefinitions) {
      for (const indexName in indexDefinitions[collectionName]) {
        let key, options
        if (Array.isArray(indexDefinitions[collectionName][indexName])) {
          [key, options] = /** @type {[import('mongodb').IndexSpecification, import('mongodb').CreateIndexesOptions]} */(indexDefinitions[collectionName][indexName])
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
