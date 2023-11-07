
// validate function compiled using ajv
// @ts-ignore
import validateUnsafe from './validate.js'
import { assertValid as assertValidGeneric } from '../validation.js'

/**
 * @typedef {import('./types.js').Identity} Identity
 */

/** @type {{errors?: import('ajv').ErrorObject[] | null | undefined} & ((data: any) => data is Identity)} */
export const validate = /** @type {import('ajv').ValidateFunction} */(validateUnsafe)
/** @type {(data: any, lang?: string, name?: string, internal?: boolean) => asserts data is Identity} */
export const assertValid = (data, lang = 'fr', name = 'data', internal) => {
  assertValidGeneric(/** @type {import('ajv').ValidateFunction} */(validateUnsafe), data, lang, name, internal)
}
