export default {
  $id: 'https://github.com/data-fair/lib/notification',
  'x-exports': ['types', 'validate'],
  title: 'Notification',
  type: 'object',
  additionalProperties: false,
  required: ['title', 'topic', 'sender', 'recipient', 'date'],
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
      title: 'Site d\'origine de la souscription',
      readOnly: true
    },
    title: {
      type: 'string',
      title: 'Titre'
    },
    body: {
      type: 'string',
      title: 'Contenu'
    },
    htmlBody: {
      type: 'string',
      title: 'Contenu HTML'
    },
    locale: {
      type: 'string',
      title: 'Langue de la notification',
      enum: ['fr', 'en']
    },
    icon: {
      type: 'string',
      title: 'URL de l\'icone de la notification'
    },
    // sender is the owner of the topic
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
      title: 'Sorties',
      items: {
        type: 'string',
        oneOf: [{
          const: 'devices',
          title: 'recevoir la notification sur vos appareils configurés'
        }, {
          const: 'email',
          title: 'recevoir la notification par email'
        }]
      }
    },
    url: {
      type: 'string',
      title: 'défini explicitement ou calculé à partir de subscription.urlTemplate et event.urlParams',
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
      description: 'propriétés libres qui varient en fonction du type de notification'
    }
  }
}
