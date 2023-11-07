
// validate function compiled using ajv
// @ts-ignore
import validateUnsafe from './validate.js'
import { assertValid as assertValidGeneric } from '../validation.js'

/**
 * @typedef {import('./types.js').SessionState} SessionState
 */

/** @type {{errors?: import('ajv').ErrorObject[] | null | undefined} & ((data: any) => data is SessionState)} */
export const validate = /** @type {import('ajv').ValidateFunction} */(validateUnsafe)
/** @type {(data: any, lang?: string, name?: string, internal?: boolean) => asserts data is SessionState} */
export const assertValid = (data, lang = 'fr', name = 'data', internal) => {
  assertValidGeneric(/** @type {import('ajv').ValidateFunction} */(validateUnsafe), data, lang, name, internal)
}

export const schema = {
  "$id": "https://github.com/data-fair/lib/session-state",
  "x-exports": [
    "types",
    "validate",
    "schema"
  ],
  "type": "object",
  "title": "session state",
  "properties": {
    "user": {
      "$ref": "#/definitions/user"
    },
    "organization": {
      "$ref": "#/definitions/organizationMembership"
    },
    "account": {
      "$ref": "#/definitions/account"
    },
    "accountRole": {
      "type": "string"
    },
    "lang": {
      "type": "string"
    },
    "dark": {
      "type": "boolean"
    }
  },
  "definitions": {
    "organizationMembership": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name",
        "role"
      ],
      "properties": {
        "id": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "role": {
          "type": "string"
        },
        "department": {
          "type": "string"
        },
        "departmentName": {
          "type": "string"
        },
        "dflt": {
          "type": "boolean"
        }
      }
    },
    "userRef": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "id",
        "name"
      ],
      "properties": {
        "id": {
          "type": "string"
        },
        "name": {
          "type": "string"
        }
      }
    },
    "user": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "email",
        "id",
        "name",
        "organizations"
      ],
      "properties": {
        "email": {
          "type": "string",
          "format": "email"
        },
        "id": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "organizations": {
          "type": "array",
          "items": {
            "$ref": "#/definitions/organizationMembership"
          }
        },
        "isAdmin": {
          "type": "integer",
          "enum": [
            0,
            1
          ]
        },
        "adminMode": {
          "type": "integer",
          "enum": [
            0,
            1
          ]
        },
        "asAdmin": {
          "$ref": "#/definitions/userRef"
        },
        "pd": {
          "type": "string",
          "format": "date"
        },
        "ipa": {
          "type": "integer",
          "enum": [
            0,
            1
          ]
        }
      }
    },
    "account": {
      "type": "object",
      "additionalProperties": false,
      "required": [
        "type",
        "id",
        "name"
      ],
      "properties": {
        "type": {
          "type": "string",
          "enum": [
            "user",
            "organization"
          ]
        },
        "id": {
          "type": "string"
        },
        "name": {
          "type": "string"
        },
        "department": {
          "type": "string"
        },
        "departmentName": {
          "type": "string"
        }
      }
    }
  }
}
