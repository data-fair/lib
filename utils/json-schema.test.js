import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import jsonSchema from './json-schema.js'

describe('json-schema utility functions', () => {
  it('should remove properties', async () => {
    const schema = jsonSchema({
      type: 'object',
      required: ['a', 'b'],
      properties: {
        a: { type: 'string' },
        b: { type: 'string' }
      }
    }).removeProperties('a').schema
    assert.deepEqual(schema, {
      type: 'object',
      required: ['b'],
      properties: {
        b: { type: 'string' }
      }
    })
  })

  it('should resolve x-i18n keywords', async () => {
    const i18nSchema = {
      type: 'object',
      title: 'an object with i18n annotations',
      'x-i18n-title': {
        fr: 'un objet',
        en: 'an object'
      },
      properties: {
        a: {
          type: 'string',
          title: 'a property',
          'x-i18n-title': {
            fr: 'une propriété'
          }
        }
      }
    }

    assert.deepEqual(jsonSchema(i18nSchema).resolveXI18n('fr').schema, {
      type: 'object',
      title: 'un objet',
      properties: {
        a: {
          type: 'string',
          title: 'une propriété'
        }
      }
    })

    assert.deepEqual(jsonSchema(i18nSchema).resolveXI18n('en').schema, {
      type: 'object',
      title: 'an object',
      properties: {
        a: {
          type: 'string',
          title: 'a property'
        }
      }
    })
  })
})
