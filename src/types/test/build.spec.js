import { describe, it } from 'node:test'
import { strict as assert } from 'assert'

describe('build.ts script', () => {
  it('should build a simple schema', async () => {
    const simpleObject = await import('./types/simple-object/index.js')
    /** @type {import('./types/simple-object/types.js').SimpleObject} */
    const o = simpleObject.validate({ str2: 'Str 2' })
    assert.deepEqual(o, { str1: 'Str 1', str2: 'Str 2' })
  })

  it('should support resolving references', async () => {
    const objectWithReference = await import('./types/object-with-reference/index.js')
    assert.deepEqual(objectWithReference.resolvedSchema, {
      $id: 'https://github.com/data-fair/lib-test/object-with-reference-resolved',
      title: 'object with reference',
      type: 'object',
      'x-exports': ['types', 'validate', 'stringify', 'resolvedSchema'],
      properties: {
        str: { type: 'string', default: 'val1' },
        str4: { type: 'string', const: 'Str 4' }
      }
    })
  })
})
