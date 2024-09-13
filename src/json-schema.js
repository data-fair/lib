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

  /**
   * @param {string} locale
   * @param {string} [defaultLocale]
   */
  resolveXI18n (locale, defaultLocale = 'en') {
    resolveXI18n(this.schema, locale, defaultLocale)
    return this
  }
}

export const jsonSchema = (/** @type {import('ajv').SchemaObject} */schema) => new SchemaWrapper(schema)
export default jsonSchema

/**
 * A very simple implementation of some x-i18n-* annotations
 * WARNING: this is a naive implementation that will also apply to const values, examples, etc
 * @param {Record<string, any>} schema
 * @param {string} locale
 * @param {string} [defaultLocale]
 */
export const resolveXI18n = (schema, locale, defaultLocale = 'en') => {
  for (const [key, value] of Object.entries(schema)) {
    if (key.startsWith('x-i18n-')) {
      if (typeof value !== 'object') console.error(`i18n property ${key} should be an object`)
      const realKey = key.replace('x-i18n-', '')
      schema[realKey] = value[locale] ?? value[defaultLocale] ?? schema[realKey]
      delete schema[key]
    } else if (Array.isArray(value)) {
      for (const child of value) {
        resolveXI18n(child, locale, defaultLocale)
      }
    } if (typeof value === 'object') {
      resolveXI18n(value, locale, defaultLocale)
    }
  }
}
