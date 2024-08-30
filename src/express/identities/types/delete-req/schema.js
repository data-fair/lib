export default {
  $id: 'https://github.com/data-fair/lib/express/identities/delete-req',
  title: 'Delete identity req',
  'x-exports': ['validate', 'types'],
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
        }
      }
    }
  }
}
