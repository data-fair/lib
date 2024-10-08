export default {
  $id: 'https://github.com/data-fair/lib/application',
  title: 'Application',
  'x-exports': ['types'],
  type: 'object',
  required: [
    'id',
    'title',
    'exposedUrl',
    'href',
    'wsUrl',
    'owner',
    'configuration'
  ],
  properties: {
    id: {
      type: 'string',
      description: 'Globally unique identifier of the application'
    },
    title: {
      type: 'string',
      description: 'Short title of the application'
    },
    exposedUrl: {
      type: 'string',
      description: 'The URL where this application is exposed'
    },
    href: {
      type: 'string',
      description: 'The URL where this resource can be fetched'
    },
    wsUrl: {
      type: 'string',
      description: 'The URL where this application can be accessed through a websocket'
    },
    owner: {
      $ref: 'https://github.com/data-fair/lib/account#/$defs/accountKeys'
    },
    configuration: {
      type: 'object',
      description: 'A free format configuration object used by applications. A minimal common structure is used to ensure proper linking between applications and datasets and remote services',
      additionalProperties: true,
      properties: {
        datasets: {
          type: 'array',
          items: {
            $ref: '#/$defs/dataset'
          }
        }
      }
    }
  },
  $defs: {
    dataset: {
      type: [
        'object',
        'null'
      ],
      required: [
        'href',
        'id',
        'title',
        'finalizedAt'
      ],
      properties: {
        href: {
          type: 'string'
        },
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        key: {
          type: 'string',
          description: 'Not the id of the dataset, but a key inside this configuration object to define the role of the dataset in this context.'
        },
        schema: {
          type: 'array',
          items: {
            $ref: '#/$defs/field'
          }
        },
        finalizedAt: {
          type: 'string',
          format: 'date-time'
        }
      }
    },
    field: {
      type: 'object',
      required: [
        'key',
        'type'
      ],
      properties: {
        key: {
          type: 'string'
        },
        type: {
          type: 'string'
        },
        format: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        'x-originalName': {
          type: 'string'
        },
        'x-group': { type: 'string' },
        'x-refersTo': {
          deprecated: true,
          type: ['string', 'null']
        },
        'x-concept': {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' },
            primary: { type: 'boolean' }
          }
        },
        'x-labels': {
          type: 'object',
          additionalProperties: {
            type: 'string'
          }
        },
        'x-labelsRestricted': {
          type: 'boolean'
        }
      }
    }
  }
}
