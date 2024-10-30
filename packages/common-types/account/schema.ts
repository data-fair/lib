// TODO: remove this, duplicate of session/schema.ts

export default {
  $id: 'https://github.com/data-fair/lib/account',
  'x-exports': ['types', 'validate'],
  type: 'object',
  title: 'account',
  required: ['type', 'id', 'name'],
  properties: {
    type: {
      type: 'string',
      enum: ['user', 'organization']
    },
    id: {
      type: 'string'
    },
    name: {
      type: 'string'
    },
    department: {
      type: 'string'
    },
    departmentName: {
      type: 'string'
    }
  },
  $defs: {
    accountKeys: {
      type: 'object',
      title: 'account keys',
      required: ['type', 'id'],
      additionalProperties: false,
      properties: {
        type: {
          type: 'string',
          enum: ['user', 'organization']
        },
        id: {
          type: 'string'
        },
        department: {
          type: 'string'
        }
      }
    }
  }
}
