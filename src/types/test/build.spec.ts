/* eslint-disable @typescript-eslint/no-var-requires */
import { strict as assert } from 'assert'
import { type SimpleObject } from './types/simple-object'

describe('build.ts script', () => {
  it('should build a simple schema', () => {
    const simpleObject = require('./types/simple-object')
    const o: SimpleObject = simpleObject.validate({ str2: 'Str 2' })
    assert.deepEqual(o, { str1: 'Str 1', str2: 'Str 2' })
  })

  it('should support resolving references', () => {
    const objectWithReference = require('./types/object-with-reference')
    assert.deepEqual(objectWithReference.resolvedSchema, {
      title: 'object with reference',
      type: 'object',
      'x-exports': ['resolvedSchema'],
      properties: {
        str: { type: 'string', default: 'val1' },
        str4: { type: 'string', const: 'Str 4' }
      }
    })
  })
})
