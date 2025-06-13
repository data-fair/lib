export default {
  $id: 'https://github.com/data-fair/lib/catalog',
  'x-exports': ['types'],
  type: 'object',
  title: 'Catalogs common types',
  additionalProperties: false,
  $defs: {
    capability: {
      type: 'string',
      description: `The list of capabilities that a catalog can have.
 - import: The plugin can list some resources organized in folders and import them
 - search: The plugin can use a search param in the listResources method
 - pagination: The plugin can paginate the results of the listResources method
 - additionalFilters: The plugin can use additional filters in the listResources method
 - importConfig: The plugin gives an import configuration schema
 - publishDataset: The plugin can publish a dataset
 - deletePublication: The plugin can delete a dataset or a resource published in a remote catalog`,
      enum: [
        'import',
        'search',
        'pagination',
        'additionalFilters',
        'importConfig',
        'publishDataset',
        'deletePublication'
      ]
    },
    metadata: {
      type: 'object',
      description: 'The metadata of the catalog plugin',
      required: ['title', 'description', 'capabilities'],
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
        capabilities: {
          description: 'The list of capabilities that a catalog can have.',
          type: 'array',
          items: {
            $ref: '#/$defs/capability'
          }
        }
      }
    },
    folder: {
      type: 'object',
      required: ['id', 'title', 'type'],
      additionalProperties: false,
      properties: {
        id: {
          type: 'string'
        },
        title: {
          type: 'string'
        },
        type: {
          const: 'folder',
        }
      },
    },
    resource: {
      type: 'object',
      description: 'The normalized resource to import from a remote catalog to Data Fair',
      required: ['id', 'title', 'type', 'format', 'url'],
      additionalProperties: false,
      properties: {
        id: {
          type: 'string',
          description: 'The unique identifier of the resource, independent of the folder it is in'
        },
        title: {
          type: 'string'
        },
        type: {
          const: 'resource',
        },
        description: {
          type: 'string',
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
        },
        keywords: {
          type: 'array',
          items: {
            type: 'string'
          }
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
        }
      }
    },
    publication: {
      type: 'object',
      additionalProperties: false,
      description: 'A small object that contains the information needed to publish or update a dataset or a resource',
      properties: {
        publicationSite: {
          type: 'string',
          description: 'The URL of the publication site where the user will be redirected from the remote catalog'
        },
        remoteDataset: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          description: 'Dataset from the remote catalog, used if a local dataset is published as a dataset on a remote catalog. If it is defined during publication, then the remote dataset must be updated.',
          properties: {
            id: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            url: {
              type: 'string',
              description: 'URL to view the dataset in the remote catalog'
            }
          }
        },
        remoteResource: {
          type: 'object',
          required: ['id'],
          additionalProperties: false,
          description: 'Dataset\'s resource from the remote catalog, used if a local dataset is published as a resource on a remote catalog. If it is defined during publication, then the remote resource must be updated.',
          properties: {
            id: {
              type: 'string',
            },
            title: {
              type: 'string',
            },
            url: {
              type: 'string',
              description: 'URL to view the resource in the remote catalog'
            }
          }
        },
        isResource: {
          type: 'boolean',
          description: 'If true, the publication is for a resource, otherwise it is for a dataset'
        }
      }
    }
  }
}
