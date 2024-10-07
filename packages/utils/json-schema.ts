// a few utility functions to manipulate json schemas

import type { SchemaObject } from 'ajv'
import clone from './clone.js'

class SchemaWrapper {
  schema: SchemaObject

  constructor (schema: SchemaObject) {
    this.schema = clone(schema)
  }

  removeProperties (properties: string | string[]) {
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
    const roProperties: string[] = []
    if (this.schema.properties) {
      for (const [key, property] of Object.entries(this.schema.properties)) {
        if ((property as any).readOnly) roProperties.push(key)
      }
    }
    this.removeProperties(roProperties)
    return this
  }

  removeFromRequired (properties: string | string[]) {
    if (this.schema?.required && Array.isArray(this.schema.required)) {
      this.schema.required = this.schema.required.filter((/** @type {any} */r) => !properties.includes(r))
    }
    return this
  }

  removeId () {
    delete this.schema.$id
    return this
  }

  appendTitle (append: string) {
    if (this.schema.title) this.schema.title = this.schema.title + append
    else this.schema.title = append
    return this
  }

  resolveXI18n (locale: string, defaultLocale = 'en') {
    resolveXI18n(this.schema, locale, defaultLocale)
    return this
  }
}

export const jsonSchema = (schema: SchemaObject) => new SchemaWrapper(schema)
export default jsonSchema

/**
 * A very simple implementation of some x-i18n-* annotations
 * WARNING: this is a naive implementation that will also apply to const values, examples, etc
 */
export const resolveXI18n = (schema: Record<string, any>, locale: string, defaultLocale = 'en') => {
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
