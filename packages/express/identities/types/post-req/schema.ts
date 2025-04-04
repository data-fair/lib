export default {
  $id: 'https://github.com/data-fair/lib/express/identities/post-req',
  title: 'Post identity req',
  'x-exports': ['validate', 'types'],
  'x-jstt': { additionalProperties: false },
  type: 'object',
  required: ['params', 'body'],
  properties: {
    params: {
      type: 'object',
      additionalProperties: false,
      required: ['type', 'id'],
      properties: {
        type: {
          type: 'string',
          enum: ['user', 'organization']
        },
        id: {
          type: 'string'
        }
      }
    },
    body: {
      type: 'object',
      required: ['name'],
      properties: {
        name: {
          type: 'string'
        },
        organizations: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'role'],
            properties: {
              id: {
                type: 'string'
              },
              name: {
                type: 'string'
              },
              department: {
                type: 'string'
              },
              role: {
                type: 'string'
              }
            }
          }
        },
        departments: {
          type: 'array',
          items: {
            type: 'object',
            required: ['id', 'name'],
            properties: {
              id: {
                type: 'string'
              },
              name: {
                type: 'string'
              }
            }
          }
        }
      }
    }
  }
}
