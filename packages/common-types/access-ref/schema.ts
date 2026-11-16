/* eslint-disable no-template-curly-in-string */
export default {
  $id: 'https://github.com/data-fair/lib/access-ref',
  'x-exports': ['types', 'validate'],
  title: 'Access Ref',
  'x-i18n-title': {
    fr: 'Référence d\'accès',
    en: 'Access Ref',
    es: 'Referencia de acceso',
    it: 'Riferimento di accesso',
    pt: 'Referência de acesso',
    de: 'Zugriffsreferenz'
  },
  type: 'object',
  discriminator: {
    propertyName: 'mode'
  },
  oneOfLayout: {
    emptyData: true
  },
  oneOf: [
    {
      title: 'An organization member',
      'x-i18n-title': {
        fr: "Un membre de l'organisation",
        en: 'An organization member',
        es: 'Un miembro de la organización',
        it: "Un membro dell'organizzazione",
        pt: 'Um membro da organização',
        de: 'Ein Organisationsmitglied'
      },
      layout: { if: "context.owner.type === 'organization'" },
      required: ['mode', 'type', 'id'],
      additionalProperties: false,
      properties: {
        mode: { type: 'string', const: 'member' },
        type: { type: 'string', const: 'user' },
        id: {
          type: 'string',
          title: 'Member',
          'x-i18n-title': {
            fr: 'Membre',
            en: 'Member',
            es: 'Miembro',
            it: 'Membro',
            pt: 'Membro',
            de: 'Mitglied'
          },
          layout: {
            getItems: {
              url: '/simple-directory/api/organizations/${context.owner.id}/members',
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
      title: 'An email',
      'x-i18n-title': {
        fr: 'Un email',
        en: 'An email',
        es: 'Un correo electrónico',
        it: "Un'email",
        pt: 'Um email',
        de: 'Eine E-Mail'
      },
      required: ['mode', 'type', 'email'],
      additionalProperties: false,
      properties: {
        mode: { type: 'string', const: 'member' },
        type: { type: 'string', const: 'user' },
        email: {
          type: 'string',
          format: 'email',
          title: 'Email address',
          'x-i18n-title': {
            fr: 'Adresse mail',
            en: 'Email address',
            es: 'Dirección de correo',
            it: 'Indirizzo email',
            pt: 'Endereço de email',
            de: 'E-Mail-Adresse'
          }
        }
      }
    },
    {
      title: 'A partner organization',
      'x-i18n-title': {
        fr: 'Une organisation partenaire',
        en: 'A partner organization',
        es: 'Una organización asociada',
        it: "Un'organizzazione partner",
        pt: 'Uma organização parceira',
        de: 'Eine Partnerorganisation'
      },
      layout: { if: "context.owner.type === 'organization'" },
      required: ['mode', 'type', 'id'],
      additionalProperties: false,
      properties: {
        mode: { type: 'string', const: 'member' },
        type: { type: 'string', const: 'organization' },
        department: { type: 'string', const: '*' },
        roles: { type: 'array', const: [], items: { type: 'string' } },
        id: {
          type: 'string',
          title: 'Partner',
          'x-i18n-title': {
            fr: 'Partenaire',
            en: 'Partner',
            es: 'Socio',
            it: 'Partner',
            pt: 'Parceiro',
            de: 'Partner'
          },
          layout: {
            getItems: {
              url: '/simple-directory/api/organizations/${context.owner.id}',
              itemsResults: 'data.partners',
              itemTitle: 'item.name',
              itemValue: 'item.id',
              itemIcon: '`/simple-directory/api/avatars/organization/${item.id}/avatar.png`'
            }
          }
        }
      }
    },
    {
      title: 'A role or department of my organization',
      'x-i18n-title': {
        fr: 'Un rôle ou département de mon organisation',
        en: 'A role or department of my organization',
        es: 'Un rol o departamento de mi organización',
        it: 'Un ruolo o dipartimento della mia organizzazione',
        pt: 'Um papel ou departamento da minha organização',
        de: 'Eine Rolle oder Abteilung meiner Organisation'
      },
      layout: { if: "context.owner.type === 'organization'" },
      required: ['mode', 'type', 'id'],
      additionalProperties: false,
      properties: {
        mode: { type: 'string', const: 'internal' },
        type: { type: 'string', const: 'organization' },
        id: {
          type: 'string',
          layout: {
            comp: 'none',
            getConstData: 'context.owner.id'
          }
        },
        department: {
          type: 'string',
          title: 'Department',
          'x-i18n-title': {
            fr: 'Département',
            en: 'Department',
            es: 'Departamento',
            it: 'Dipartimento',
            pt: 'Departamento',
            de: 'Abteilung'
          },
          layout: {
            getItems: {
              url: '/simple-directory/api/organizations/${context.owner.id}',
              itemsResults: '[...(data.departments || []), {id: "*", name: "Tous les départements"}, {id: "-", name: "Racine de l\'organisation uniquement"}]',
              itemTitle: 'item.name',
              itemValue: 'item.id'
            }
          }
        },
        roles: {
          type: 'array',
          title: 'Roles',
          'x-i18n-title': {
            fr: 'Rôles',
            en: 'Roles',
            es: 'Roles',
            it: 'Ruoli',
            pt: 'Funções',
            de: 'Rollen'
          },
          items: {
            type: 'string'
          },
          layout: {
            getItems: {
              url: '/simple-directory/api/organizations/${context.owner.id}',
              itemsResults: 'data.roles'
            }
          }
        }
      }
    }
  ]
}
