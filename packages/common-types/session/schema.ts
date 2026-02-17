export default {
  $id: 'https://github.com/data-fair/lib/session-state',
  'x-exports': ['types', 'validate'],
  type: 'object',
  title: 'session state',
  additionalProperties: false,
  required: ['lang'],
  properties: {
    user: {
      $ref: '#/$defs/user'
    },
    organization: {
      $ref: '#/$defs/organizationMembership'
    },
    account: {
      $ref: '#/$defs/account'
    },
    accountRole: {
      type: 'string'
    },
    siteRole: {
      type: 'string'
    },
    lang: {
      type: 'string'
    },
    dark: {
      deprecated: true,
      type: 'boolean'
    }
  },
  $defs: {
    organizationMembership: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'name',
        'role'
      ],
      properties: {
        id: {
          type: 'string'
        },
        name: {
          type: 'string'
        },
        role: {
          type: 'string'
        },
        roleLabel: {
          type: 'string'
        },
        department: {
          type: 'string'
        },
        departmentName: {
          type: 'string'
        },
        dflt: {
          type: 'integer',
          enum: [1]
        }
      }
    },
    userRef: {
      type: 'object',
      additionalProperties: false,
      required: [
        'id',
        'name'
      ],
      properties: {
        id: {
          type: 'string'
        },
        name: {
          type: 'string'
        }
      }
    },
    user: {
      type: 'object',
      additionalProperties: false,
      required: [
        'email',
        'id',
        'name',
        'organizations'
      ],
      properties: {
        email: {
          type: 'string',
          format: 'email'
        },
        id: {
          type: 'string'
        },
        name: {
          type: 'string'
        },
        organizations: {
          type: 'array',
          items: {
            $ref: '#/$defs/organizationMembership'
          }
        },
        isAdmin: {
          type: 'integer',
          enum: [1]
        },
        adminMode: {
          type: 'integer',
          enum: [1]
        },
        asAdmin: {
          $ref: '#/$defs/userRef'
        },
        asAdminOrg: {
          $ref: '#/$defs/organizationMembership'
        },
        pd: {
          type: 'string',
          format: 'date'
        },
        ipa: {
          type: 'integer',
          title: 'short for ignorePersonalAccount',
          enum: [1]
        },
        idp: {
          type: 'integer',
          title: 'Is the user coming from a core ID provider ?',
          enum: [1]
        },
        os: {
          type: 'integer',
          title: 'short for orgStorage',
          enum: [1]
        },
        rememberMe: {
          type: 'integer',
          enum: [1]
        },
        siteOwner: {
          $ref: '#/$defs/account'
        },
        pseudoSession: {
          type: 'boolean'
        }
      }
    },
    account: {
      type: 'object',
      additionalProperties: false,
      required: [
        'type',
        'id',
        'name'
      ],
      properties: {
        type: {
          type: 'string',
          enum: ['user', 'organization']
        },
        id: {
          type: 'string'
        },
        name: {
          type: 'string'
        },
        department: {
          type: 'string'
        },
        departmentName: {
          type: 'string'
        }
      }
    }
  }
}
