const i18nMsg = (title: string) => ({
  type: 'object',
  title: `Internationalized ${title} `,
  patternProperties: {
    '.*': { type: 'string' }
  }
  // properties: ['fr', 'en'].reduce((/** @type {Record<string, any>} */props, locale) => { props[locale] = { type: 'string', title: locale }; return props }, {})
})

export default {
  $id: 'https://github.com/data-fair/lib/event',
  'x-exports': ['types'],
  title: 'Event',
  type: 'object',
  additionalProperties: false,
  required: ['title', 'topic', 'date'],
  properties: {
    _id: {
      type: 'string',
      title: 'Globally unique id'
    },
    title: {
      oneOf: [{
        type: 'string',
        title: 'Title'
      }, i18nMsg('title')]
    },
    body: {
      oneOf: [{
        type: 'string',
        title: 'Content'
      }, i18nMsg('content')]
    },
    htmlBody: {
      oneOf: [{
        type: 'string',
        title: 'HTML content'
      }, i18nMsg('HTML content')]
    },
    icon: {
      type: 'string',
      title: 'URL of event icon'
    },
    // sender is the owner of the topic, topic is global if no sender is given
    sender: { $ref: '#/$defs/sender' },
    // originator is the account/user who triggered the event
    originator: {
      type: 'object',
      properties: {
        internalProcess: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' }
          }
        },
        apiKey: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            title: { type: 'string' }
          }
        },
        user: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              title: 'User ID'
            },
            name: {
              type: 'string',
              title: 'User name'
            },
            email: {
              type: 'string',
              title: 'User email'
            },
            admin: {
              type: 'boolean',
              title: 'User was working as a platform admin'
            }
          }
        },
        organization: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              title: 'Organization ID'
            },
            name: {
              type: 'string',
              title: 'Organization name'
            },
            department: {
              type: 'string',
              title: 'Organization department'
            },
            departmentName: {
              type: 'string',
              title: 'Organization department name'
            }
          }
        }
      }
    },
    topic: { $ref: '#/$defs/topicRef' },
    url: {
      type: 'string',
      title: 'explicitly defined url, alternative is to use urlTemplate in subscription and urlParams',
    },
    urlParams: {
      type: 'object',
      title: 'used to fill subscription.urlTemplate and so create notification.url',
      patternProperties: {
        '.*': { type: 'string' }
      }
    },
    visibility: {
      type: 'string',
      title: 'Visibility',
      enum: ['public', 'private'],
      default: 'private'
    },
    date: {
      type: 'string',
      title: 'Reception date',
      format: 'date-time'
    },
    extra: {
      type: 'object',
      description: 'Free properties that varie depending on the type of event'
    },
    resource: {
      type: 'object',
      title: 'The main resource concerned by the event',
      additionalProperties: false,
      required: ['type', 'id'],
      properties: {
        type: {
          type: 'string',
          title: 'Type'
        },
        id: {
          type: 'string',
          description: 'The unique id of the resource'
        },
        title: {
          type: 'string',
          description: 'The display name of the resource'
        }
      }
    },
    subscribedRecipient: {
      type: 'object',
      title: 'Optional recipient target of the event',
      required: ['id'],
      properties: {
        id: {
          type: 'string',
          description: 'The unique id of the user'
        },
        name: {
          type: 'string',
          description: 'The display name of the user'
        }
      }
    }
  },
  $defs: {
    sender: {
      type: 'object',
      title: 'Emitter',
      additionalProperties: false,
      required: ['type', 'id'],
      properties: {
        type: {
          type: 'string',
          enum: ['user', 'organization'],
          title: 'Type'
        },
        id: {
          type: 'string',
          description: 'The unique id of the user or organization'
        },
        name: {
          type: 'string',
          description: 'The display name of the user or organization'
        },
        role: {
          type: 'string',
          description: 'If this is set and owner is an organization, this restrict ownership to users of this organization having this role or admin role'
        },
        department: {
          type: 'string',
          description: 'If this is set and owner is an organization, this gives ownership to users of this organization that belong to this department'
        },
        departmentName: {
          type: 'string',
          description: 'The display name of the department'
        }
      }
    },
    topicRef: {
      type: 'object',
      additionalProperties: false,
      required: ['key'],
      properties: {
        key: {
          type: 'string',
          title: 'Topic key'
        },
        title: {
          type: 'string',
          title: 'Topic title'
        }
      }
    }
  }
}
