export interface SessionState {
  user?: User;
  organization?: OrganizationMembership;
  account?: Account;
  accountRole?: string;
  lang?: string;
  dark?: boolean;
  [k: string]: unknown;
}
/**
 * This interface was referenced by `SessionState`'s JSON-Schema
 * via the `definition` "user".
 */
export interface User {
  email: string;
  id: string;
  name: string;
  organizations: OrganizationMembership[];
  isAdmin?: 0 | 1;
  adminMode?: 0 | 1;
  asAdmin?: UserRef;
  pd?: string;
  ipa?: 0 | 1;
}
/**
 * This interface was referenced by `SessionState`'s JSON-Schema
 * via the `definition` "organizationMembership".
 */
export interface OrganizationMembership {
  id: string;
  name: string;
  role: string;
  department?: string;
  departmentName?: string;
  dflt?: boolean;
}
/**
 * This interface was referenced by `SessionState`'s JSON-Schema
 * via the `definition` "userRef".
 */
export interface UserRef {
  id: string;
  name: string;
}
/**
 * This interface was referenced by `SessionState`'s JSON-Schema
 * via the `definition` "account".
 */
export interface Account {
  type: string;
  id: string;
  name: string;
  department?: string;
  departmentName?: string;
}

// validate function compiled using ajv
// @ts-ignore
import validateUnsafe from './validate.js'
import { validateThrow } from '../validation'
export const validate = (data: any, lang: string = 'fr', name: string = 'data', internal?: boolean): SessionState => {
  return validateThrow<SessionState>(validateUnsafe, data, lang, name, internal)
}
        
// stringify function compiled using fast-json-stringify
// @ts-ignore
import stringifyUnsafe from './stringify.js'
// @ts-ignore
import flatstr from 'flatstr'
export const  stringify = (data: SessionState): string => {
  const str = stringifyUnsafe(data)
  flatstr(str)
  return str
}
        
// raw schema
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
          "type": "string"
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
