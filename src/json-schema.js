// a few utility functions to manipulate json schemas

import clone from './clone.js'

class SchemaWrapper {
  /** @type {import('ajv').SchemaObject} */
  schema

  /**
   * @param {import('ajv').SchemaObject} schema
   */
  constructor (schema) {
    this.schema = clone(schema)
  }

  /**
   * @param {string | string[]} properties
   */
  removeProperties (properties) {
    if (typeof properties === 'string') properties = [properties]
    if (this.schema.properties) {
      for (const p of properties) {
        delete this.schema.properties[p]
      }
    }
    if (this.schema?.required && Array.isArray(this.schema.required)) {
      this.schema.required = this.schema.required.filter((/** @type {any} */r) => !properties.includes(r))
    }
    return this
  }

  removeReadonlyProperties () {
    /** @type {string[]} */
    const roProperties = []
    if (this.schema.properties) {
      for (const [key, property] of Object.entries(this.schema.properties)) {
        if (property.readOnly) roProperties.push(key)
      }
    }
    this.removeProperties(roProperties)
    return this
  }

  /**
   * @param {string | string[]} properties
   */
  removeFromRequired (properties) {
    if (this.schema?.required && Array.isArray(this.schema.required)) {
      this.schema.required = this.schema.required.filter((/** @type {any} */r) => !properties.includes(r))
    }
    return this
  }

  removeId () {
    delete this.schema.$id
    return this
  }

  /**
   * @param {string} append
   */
  appendTitle (append) {
    if (this.schema.title) this.schema.title = this.schema.title + append
    else this.schema.title = append
    return this
  }
}

export const jsonSchema = (/** @type {import('ajv').SchemaObject} */schema) => new SchemaWrapper(schema)
export default jsonSchema
