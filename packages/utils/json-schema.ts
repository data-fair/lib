// a few utility functions to manipulate json schemas

import type { SchemaObject } from 'ajv'
import clone from './clone.js'

class SchemaWrapper {
  schema: SchemaObject

  constructor (schema: SchemaObject) {
    this.schema = clone(schema)
  }

  clone () {
    return new SchemaWrapper(this.schema)
  }

  removeProperties (properties: string | string[]) {
    if (typeof properties === 'string') properties = [properties]
    if (this.schema.properties) {
      for (const p of properties) {
        delete this.schema.properties[p]
      }
    }
    if (this.schema?.required && Array.isArray(this.schema.required)) {
      this.schema.required = this.schema.required.filter((r: any) => !properties.includes(r))
    }
    return this
  }

  pickProperties (properties: string | string[]) {
    if (typeof properties === 'string') properties = [properties]
    const removedProperties: string[] = []
    if (this.schema.properties) {
      for (const key of Object.keys(this.schema.properties)) {
        if (!properties.includes(key)) removedProperties.push(key)
      }
    }
    this.removeProperties(removedProperties)
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
      this.schema.required = this.schema.required.filter((r: any) => !properties.includes(r))
    }
    return this
  }

  makeNullable (properties: string | string []) {
    if (typeof properties === 'string') properties = [properties]
    for (const p of properties) {
      if (this.schema.properties?.[p]) {
        this.schema.properties[p] = { anyOf: [this.schema.properties[p], { type: 'null' }] }
      }
    }
    return this
  }

  removeId () {
    delete this.schema.$id
    return this
  }

  removeRequired () {
    delete this.schema.required
    return this
  }

  appendTitle (append: string) {
    if (this.schema.title) this.schema.title = this.schema.title + append
    else this.schema.title = append
    return this
  }

  /**
   * Add a subschema to the current schema
   * - delete `$id` from the subschema
   * - merge `$defs` and `definitions` from the subschema to the current schema
   * @param key the key of the property to add
   * @param propertySchema the subschema to add
   */
  addProperty (key: string, propertySchema: SchemaObject) {
    const clonedPropertySchema = clone(propertySchema)
    delete clonedPropertySchema.$id

    if (!this.schema.properties) this.schema.properties = {}
    this.schema.properties[key] = clonedPropertySchema

    if (!this.schema.$defs) this.schema.$defs = {}

    for (const defProp of ['$defs', 'definitions']) {
      if (clonedPropertySchema[defProp]) {
        if (!this.schema[defProp]) this.schema[defProp] = {}

        // Check if any definitions already exist at the root
        for (const defKey in clonedPropertySchema[defProp]) {
          if (defKey in this.schema[defProp]) {
            throw new Error(`Definition "${defKey}" already exists in the schema's ${defProp}.`)
          }
        }

        Object.assign(this.schema[defProp], clonedPropertySchema[defProp])
        delete clonedPropertySchema[defProp]
      }
    }

    return this
  }

  resolveXI18n (locale: string, defaultLocale = 'en') {
    resolveXI18n(this.schema, locale, defaultLocale)
    return this
  }

  set (schemaPatch: Partial<SchemaObject>) {
    Object.assign(this.schema, schemaPatch)
    return this
  }

  makePatchSchema (properties?: string[]) {
    if (!properties) {
      this.removeReadonlyProperties()
      properties = Object.keys(this.schema.properties ?? {})
    } else {
      this.pickProperties(properties)
    }
    const nullable = []
    for (const property of properties) {
      if (!this.schema.required?.includes(property)) nullable.push(property)
    }
    this.removeRequired()
    this.makeNullable(nullable)
    this.appendTitle(' patch')
    if (this.schema.$id) this.schema.$id = this.schema.$id + '-patch'
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
        if (typeof child === 'object') {
          resolveXI18n(child, locale, defaultLocale)
        }
      }
    } if (typeof value === 'object') {
      resolveXI18n(value, locale, defaultLocale)
    }
  }
}

// recurse a JSON object and transform absolute refs to local refs in $defs
export const makeLocalDefs = (schemas: Record<string, any>, schemaId: string) => {
  const schema = clone(schemas[schemaId])
  const localDefsSchemas = {}
  recurseLocalDefs(localDefsSchemas, schemas, schemaId, schema)
  schema.$defs = localDefsSchemas
  return schema
}

const recurseLocalDefs = (
  localDefsSchemas: Record<string, Record<string, any>>,
  schemas: Record<string, Record<string, any>>,
  schemaId: string,
  schemaFragment: Record<string, any>
) => {
  for (const [key, value] of Object.entries(schemaFragment)) {
    if (key === '$ref') {
      if (!value.startsWith('#')) {
        const fullId = new URL(value, schemaId).href
        const refId = value.split('/').pop()
        if (!localDefsSchemas[refId]) {
          localDefsSchemas[refId] = clone(schemas[fullId])
          recurseLocalDefs(localDefsSchemas, schemas, fullId, localDefsSchemas[refId])
        }
        schemaFragment[key] = `#/$defs/${refId}`
      }
    } else if (key === '$defs') {
      for (const [defKey, defValue] of Object.entries(value as Record<string, any>)) {
        localDefsSchemas[defKey] = clone(defValue)
        recurseLocalDefs(localDefsSchemas, schemas, schemaId, localDefsSchemas[defKey])
      }
    } else if (typeof value === 'object') {
      recurseLocalDefs(localDefsSchemas, schemas, schemaId, value)
    }
  }
}
