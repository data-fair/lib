export default {
  $id: 'https://github.com/data-fair/lib/catalog',
  'x-exports': ['types'],
  type: 'object',
  additionalProperties: false,
  $defs: {
    capability: {
      type: 'string',
      description: `The list of capabilities that a catalog can have.
 - listDatasets: The catalog can list datasets and get one dataset
 - search: The catalog can use a search param in the listDatasets method
 - pagination: The catalog can paginate the results of the listDatasets method
 - publishDataset: The catalog can publish and delete datasets`,
      enum: [
        'listDatasets',
        'publishDataset',
        'search',
        'pagination',
        'additionalFilters'
      ]
    },
    metadata: {
      type: 'object',
      description: 'The metadata of the catalog plugin',
      required: ['title', 'description', 'icon', 'capabilities'],
      additionalProperties: false,
      properties: {
        title: {
          description: 'The title of the plugin to be displayed in the UI',
          type: 'string'
        },
        description: {
          description: 'The description of the plugin to be displayed in the UI',
          type: 'string'
        },
        icon: {
          description: 'The SVG Path icon of the plugin',
          type: 'string'
        },
        capabilities: {
          description: 'The list of capabilities that a catalog can have.',
          type: 'array',
          items: {
            $ref: '#/$defs/capability'
          }
        }
      }
    },
    catalogDataset: {
      type: 'object',
      description: 'The normalized dataset format',
      required: ['id', 'title'],
      additionalProperties: false,
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        description: {
          type: 'string'
        },
        keywords: {
          type: 'array',
          items: {
            type: 'string'
          }
        },
        origin: {
          type: 'string'
        },
        image: {
          type: 'string'
        },
        license: {
          type: 'string'
        },
        frequency: {
          type: 'string'
        },
        private: {
          type: 'boolean'
        },
        resources: {
          type: 'array',
          items: {
            $ref: '#/$defs/catalogResourceDataset'
          }
        }
      },
    },
    catalogResourceDataset: {
      type: 'object',
      description: 'The normalized resource format',
      required: ['id', 'title', 'format', 'url'],
      additionalProperties: false,
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        format: {
          type: 'string'
        },
        url: {
          type: 'string'
        },
        fileName: {
          type: 'string'
        },
        mimeType: {
          type: 'string'
        },
        size: {
          type: 'number'
        }
      }
    },
    publication: {
      type: 'object',
      required: ['catalogId', 'status'],
      additionalProperties: false,
      properties: {
        publicationId: {
          type: 'string',
          description: 'Id of this publication, for a better search in database'
        },
        catalogId: {
          type: 'string',
          description: 'Id of the catalog where the resource is published'
        },
        remoteDatasetId: {
          type: 'string',
          description: 'Id of the dataset in the remote catalog'
        },
        remoteResourceId: {
          type: 'string',
          description: 'Id of the resource in the dataset in the remote catalog, used if a DataFair dataset is published as a resource in a remote catalog'
        },
        isResource: {
          type: 'boolean',
          description: 'True if the publication is a resource, false or undefined if it is a dataset '
        },
        status: {
          type: 'string',
          description: 'A simple flag to clearly identify the publications that were successful. If "error" then the error key should be defined.',
          enum: ['waiting', 'published', 'error', 'deleted']
        },
        publishedAt: {
          type: 'string',
          description: 'Date of the last update for this publication',
          format: 'date-time'
        },
        error: {
          type: 'string'
        }
      }
    }
  }
}
