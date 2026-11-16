export default {
  $id: 'https://github.com/data-fair/lib/notification',
  'x-exports': ['types', 'validate'],
  title: 'Notification',
  type: 'object',
  additionalProperties: false,
  required: ['title', 'topic', 'recipient', 'date'],
  properties: {
    _id: {
      type: 'string',
      title: 'Globally unique id'
    },
    eventId: {
      type: 'string',
      title: 'Globally unique id of the event source of this notification'
    },
    origin: {
      type: 'string',
      title: 'Origin site of the subscription',
      readOnly: true
    },
    title: {
      type: 'string',
      title: 'Title'
    },
    body: {
      type: 'string',
      title: 'Content'
    },
    htmlBody: {
      type: 'string',
      title: 'HTML content'
    },
    locale: {
      type: 'string',
      title: 'Language of the notification',
      description: 'Two letters code: the language of the subscription, any language offered by simple-directory',
      pattern: '^[a-z]{2}$'
    },
    icon: {
      type: 'string',
      title: 'URL of the notification icon'
    },
    // sender is the owner of the topic, topic is global if no sender is given
    sender: { $ref: 'https://github.com/data-fair/lib/event#/$defs/sender' },
    topic: { $ref: 'https://github.com/data-fair/lib/event#/$defs/topicRef' },
    recipient: {
      type: 'object',
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
    },
    outputs: {
      type: 'array',
      title: 'Outputs',
      items: {
        type: 'string',
        oneOf: [{
          const: 'devices',
          title: 'Receive the notification on your configured devices'
        }, {
          const: 'email',
          title: 'Receive the notification by email'
        }]
      }
    },
    url: {
      type: 'string',
      title: 'Explicitly defined, or computed from subscription.urlTemplate and event.urlParams',
    },
    date: {
      type: 'string',
      description: 'reception date',
      format: 'date-time'
    },
    new: {
      readOnly: true,
      type: 'boolean'
    },
    extra: {
      type: 'object',
      description: 'Free properties that vary depending on the type of notification'
    }
  }
}
