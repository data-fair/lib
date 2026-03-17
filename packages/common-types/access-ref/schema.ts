/* eslint-disable no-template-curly-in-string */
export default {
  $id: 'https://github.com/data-fair/lib/access-ref',
  'x-exports': ['types', 'validate'],
  title: 'Access Ref',
  type: 'object',
  oneOf: [
    {
      title: "Un membre de l'organisation",
      layout: { if: "context.owner.type === 'organization'" },
      required: ['mode', 'type', 'id'],
      properties: {
        mode: { type: 'string', const: 'member' },
        type: { type: 'string', const: 'user' },
        id: {
          type: 'string',
          layout: {
            getItems: {
              url: '/simple-directory/api/organization/${context.owner.id}/members',
              itemsResults: 'data.results',
              itemTitle: 'item.name',
              itemValue: 'item.id',
              itemIcon: '`/simple-directory/api/avatars/user/${item.id}/avatar.png`'
            }
          }
        }
      }
    },
    {
      title: 'Un email',
      required: ['mode', 'type', 'email'],
      properties: {
        mode: { type: 'string', const: 'member' },
        type: { type: 'string', const: 'user' },
        email: { type: 'string', title: 'Adresse mail' }
      }
    },
    {
      title: 'Une organisation partenaire',
      layout: { if: "context.owner.type === 'organization'" },
      required: ['mode', 'type', 'id'],
      properties: {
        mode: { type: 'string', const: 'member' },
        type: { type: 'string', const: 'organization' },
        department: { type: 'string', const: '*' },
        roles: { type: 'array', const: [] },
        id: {
          type: 'string',
          layout: {
            getItems: {
              url: '/simple-directory/api/organization/${context.owner.id}/partners',
              itemsResults: 'data.results',
              itemTitle: 'item.name',
              itemValue: 'item.id',
              itemIcon: '`/simple-directory/api/avatars/organization/${item.id}/avatar.png`'
            }
          }
        }
      }
    },
    {
      title: 'Un role ou département de mon organisation',
      layout: { if: "context.owner.type === 'organization'" },
      required: ['mode', 'type', 'id'],
      properties: {
        mode: { type: 'string', const: 'internal' },
        type: { type: 'string', const: 'organization' },
        id: { type: 'string' },
        department: {
          type: 'string',
          layout: {
            getItems: {
              url: '/simple-directory/api/organization/${context.owner.id}/departments',
              itemsResults: '[...data.results, {id: "*", name: "Tous les départements"}, {id: "-", name: "Racine de l\'organisation uniquement"}]',
              itemTitle: 'item.name',
              itemValue: 'item.id'
            }
          }
        },
        roles: {
          type: 'array',
          items: {
            type: 'string'
          },
          layout: {
            getItems: {
              url: '/simple-directory/api/organization/${context.owner.id}/roles',
              itemsResults: 'data.results',
              itemTitle: 'item.name',
              itemValue: 'item.id'
            }
          }
        }
      }
    }
  ]
}
