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
    sender: { $ref: 'https://github.com/data-fair/lib/session-state#/$defs/account', title: 'Emitter' },
    topic: {
      type: 'object',
      additionalProperties: false,
      required: ['key'],
      properties: {
        key: {
          type: 'string',
          title: 'Clé du sujet'
        },
        title: {
          type: 'string',
          title: 'Libellé du sujet'
        }
      }
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
    }
  }
}
