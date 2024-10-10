import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import * as simpleObject from './types/simple-object/index.js'
import * as objectWithReference from './types/object-with-reference/index.js'

describe('build.js script', () => {
  it('should build a simple schema and expose validation function', async () => {
    const obj = { str2: 'Str 2' }
    if (simpleObject.validate(obj)) {
      // here obj is typed as SimpleObject
    }
    // default value was written as x-ajv was used in schema
    assert.deepEqual(obj, { str1: 'Str 1', str2: 'Str 2' })
  })

  it('should build a simple schema and expose a type assertion function', async () => {
    const obj = { str2: 'Str 2' }
    simpleObject.assertValid(obj)
    // here obj is typed as SimpleObject

    // default value was written as x-ajv was used in schema
    assert.deepEqual(obj, { str1: 'Str 1', str2: 'Str 2' })
  })

  it('should support resolving references', async () => {
    assert.deepEqual(objectWithReference.resolvedSchema, {
      $id: 'https://github.com/data-fair/lib-test/object-with-reference-resolved',
      title: 'object with reference',
      type: 'object',
      'x-exports': ['types', 'validate', 'resolvedSchema'],
      properties: {
        str: { type: 'string', default: 'val1' },
        str4: { type: 'string', const: 'Str 4' }
      }
    })
  })
})
