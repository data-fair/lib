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
  required: ['title', 'topic', 'sender', 'date'],
  properties: {
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
    // sender is the owner of the topic
    sender: { $ref: '#/$defs/sender' },
    topic: { $ref: '#/$defs/topicRef' },
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
    }
  },
  $defs: {
    sender: {
      type: 'object',
      title: 'Emitter',
      additionalProperties: false,
      required: ['type', 'id', 'name'],
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
          deprecated: true,
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
