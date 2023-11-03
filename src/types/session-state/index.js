
// validate function compiled using ajv
// @ts-ignore
import validateUnsafe from './validate.js'
import { validateThrow } from '../validation.js'
// stringify function compiled using fast-json-stringify
// @ts-ignore
import stringifyUnsafe from './stringify.js'
// @ts-ignore
import flatstr from 'flatstr'


/**
 * @param {any} data
 * @param {string} [lang]
 * @param {string} [name]
 * @param {boolean} [internal]
 * @returns {import('./types.js').SessionState}
 */
export const validate = (data, lang = 'fr', name = 'data', internal) => {
  return validateThrow(/** @type {import('ajv').ValidateFunction} */(validateUnsafe), data, lang, name, internal)
}

/**
 * @param {import('./types.js').SessionState} data
 * @returns {string}
 */
export const stringify = (data) => {
  const str = stringifyUnsafe(data)
  flatstr(str)
  return str
}

export const schema = {
  "$id": "https://github.com/data-fair/lib/session-state",
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
