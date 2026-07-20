import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { readFileSync } from 'node:fs'
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

  it('should reuse the vjsf layout for the compiledLayout export', async () => {
    // site-patch exports both vjsf and compiledLayout: the compiledLayout export reuses the
    // layout already compiled+serialized for the vjsf component, so both must stay in sync
    const compiledLayoutCode = readFileSync(import.meta.dirname + '/types/site-patch/.type/compiled-layout-fr.js', 'utf8')
      .replace('/* eslint-disable */\n// @ts-nocheck\n\n', '')
      .replace('export const compiledLayout =', 'const compiledLayout =')
    const vjsfCode = readFileSync(import.meta.dirname + '/vjsf/vjsf-site-patch.vue', 'utf8')

    assert.ok(compiledLayoutCode.includes('const compiledLayout ='))
    assert.ok(vjsfCode.includes(compiledLayoutCode), 'the compiledLayout export should be the very layout embedded in the vjsf component')
  })
})
