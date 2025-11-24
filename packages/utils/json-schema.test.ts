import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import jsonSchema, { makeLocalDefs } from '@data-fair/lib-utils/json-schema.js'

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

  it('should transform abolute references to local definitions', async () => {
    const schema = makeLocalDefs({
      'http://test.com/schema1': {
        type: 'object',
        properties: {
          a: { type: 'string' },
          b: { $ref: 'http://test.com/schema2' },
          c: { $ref: '#/$defs/c' },
          d: { $ref: 'http://test.com/schema3#/$defs/g' },
        },
        $defs: {
          c: { type: 'string' }
        }
      },
      'http://test.com/schema2': {
        type: 'object',
        properties: {
          d: { type: 'string' },
          e: { $ref: 'http://test.com/schema3' }
        }
      },
      'http://test.com/schema3': {
        type: 'object',
        properties: {
          f: { type: 'string' }
        },
        $defs: {
          g: { type: 'string' }
        }
      }
    }, 'http://test.com/schema1')
    assert.equal(schema.properties.b.$ref, '#/$defs/schema2')
    assert.equal(schema.properties.c.$ref, '#/$defs/c')
    assert.ok(schema.$defs.schema2)
    assert.ok(schema.$defs.schema3)
    assert.ok(schema.$defs.c)
    assert.ok(schema.$defs.d)
  })

  it('should create a Patch schema from a base schema', async () => {
    const schema = jsonSchema({
      type: 'object',
      title: 'My schema',
      required: ['a'],
      properties: {
        a: { type: 'string' },
        b: { type: 'string' },
        c: { type: 'string', readOnly: true }
      }
    }).makePatchSchema().schema
    assert.deepEqual(schema, {
      type: 'object',
      title: 'My schema patch',
      properties: {
        a: { type: 'string' },
        b: { anyOf: [{ type: 'string' }, { type: 'null' }] }
      }
    })
  })

  it('should add a property with its $defs and definitions', async () => {
    const schema = jsonSchema({
      type: 'object',
      properties: {
        existing: { type: 'string' }
      }
    }).addProperty('newProp', {
      $id: 'should-be-removed',
      type: 'object',
      properties: {
        subProp: { type: 'string' }
      },
      $defs: {
        subDef: { type: 'number' }
      },
      definitions: {
        subDefinition: { type: 'boolean' }
      }
    }).schema

    assert.deepEqual(schema, {
      type: 'object',
      properties: {
        existing: { type: 'string' },
        newProp: {
          type: 'object',
          properties: {
            subProp: { type: 'string' }
          }
        }
      },
      $defs: {
        subDef: { type: 'number' }
      },
      definitions: {
        subDefinition: { type: 'boolean' }
      }
    })

    // Check that $id was removed from the property schema
    assert.ok(!('$id' in schema.properties.newProp))
  })
})
