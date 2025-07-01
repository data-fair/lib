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
 - search: The plugin can use the search param 'q' in the list method
 - pagination: The plugin can paginate the results of the list method
 - additionalFilters: The plugin can use additional filters in the list method
 - importConfig: The plugin gives an import configuration schema
 - publishDataset: The plugin can publish a dataset
 - deletePublication: The plugin can delete a dataset or a resource published in a remote catalog
 - thumbnail: The plugin provides a thumbnail image`,
      enum: [
        'import',
        'search',
        'pagination',
        'additionalFilters',
        'importConfig',
        'publishDataset',
        'deletePublication',
        'thumbnail'
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
        },
        thumbnailPath: {
          description: 'Optional path of the thumbnail image from the root of the plugin to be displayed in the UI.',
          type: 'string',
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
      required: ['id', 'title', 'filePath', 'format'],
      additionalProperties: false,
      properties: {
        id: {
          type: 'string',
          description: 'The unique identifier of the resource, independent of the folder it is in'
        },
        title: {
          type: 'string',
          description: 'The title of the resource'
        },
        description: {
          type: 'string',
        },
        filePath: {
          type: 'string',
          description: 'The path to the downloaded resource file.',
        },
        format: {
          type: 'string',
          description: 'The format of the resource, e.g. csv, json, xml, etc. It is displayed in the UI of catalogs.',
        },
        // https://www.w3.org/TR/vocab-dcat-2/#Property:dataset_frequency and https://www.dublincore.org/specifications/dublin-core/collection-description/frequency/
        frequency: {
          type: 'string',
          description: 'The frequency of the resource updates, if available. It can be one of the following values: triennial, biennial, annual, semiannual, threeTimesAYear, quarterly, bimonthly, monthly, semimonthly, biweekly, threeTimesAMonth, weekly, semiweekly, threeTimesAWeek, daily, continuous or irregular.',
          enum: ['', 'triennial', 'biennial', 'annual', 'semiannual', 'threeTimesAYear', 'quarterly', 'bimonthly', 'monthly', 'semimonthly', 'biweekly', 'threeTimesAMonth', 'weekly', 'semiweekly', 'threeTimesAWeek', 'daily', 'continuous', 'irregular']
        },
        image: {
          type: 'string',
          description: 'The URL of the image representing the resource, if available'
        },
        license: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'href'],
          properties: {
            title: {
              type: 'string',
              description: 'Short title for the license'
            },
            href: {
              type: 'string',
              description: 'The URL where the license can be read'
            }
          }
        },
        keywords: {
          type: 'array',
          description: 'The list of keywords associated with the resource, if available',
          items: {
            type: 'string'
          }
        },
        mimeType: {
          type: 'string',
          description: 'The Mime type of the resource, if available'
        },
        origin: {
          type: 'string',
          description: 'The URL where the original data can be found'
        },
        schema: {
          type: 'object',
          additionalProperties: true,
          description: 'The schema of the resource, if available'
        },
        size: {
          type: 'number',
          description: 'The size of the resource in bytes, if available. It is displayed in the UI of catalogs.'
        }
      }
    },
    publication: {
      type: 'object',
      additionalProperties: false,
      description: 'A small object that contains the information needed to publish or update a dataset or a resource',
      properties: {
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
