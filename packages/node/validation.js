import ajvFrModule from 'ajv-i18n/localize/fr/index.js'
import ajvEnModule from 'ajv-i18n/localize/en/index.js'
import { httpError } from '@data-fair/lib/http-errors.js'

// @ts-ignore
const ajvFr = /** @type {typeof ajvFrModule.default} */ (ajvFrModule)
// @ts-ignore
const ajvEn = /** @type {typeof ajvEnModule.default} */ (ajvEnModule)

/** @type {Record<string, import('ajv-i18n/localize/types.js').Localize>} */
const localize = {
  fr: ajvFr,
  en: ajvEn
}

// cf https://github.com/ajv-validator/ajv/blob/b3e0cb17d0e095b5c883042b2306571be5ec86b7/lib/core.ts#L650
/**
 * @param {import('ajv').ErrorObject[] | null | undefined} errors
 * @param {string} [varName]
 * @returns {string}
 */
export const errorsText = (errors, varName = 'data') => {
  if (!errors || errors.length === 0) return 'No errors'
  return errors
    .map((e) => {
      let msg = `${varName}${e.instancePath} ${e.message}`.trim()
      const paramKeys = Object.keys(e.params || {}).filter(key => {
        if (key === 'error') return false
        if (e.keyword === 'type' && key === 'type') return false
        return true
      })
      const params = paramKeys
        .map(key => paramKeys.length > 1 ? `${key}=${e.params[key]}` : e.params[key])
        .join(', ')
      if (params) msg += ` (${params})`
      return msg
    })
    .reduce((text, msg) => text + ', ' + msg)
}

/** @typedef {{lang?: string, name?: string, internal?: boolean}} AssertValidOptions */

/** @type {<Type>(validate: import('ajv').ValidateFunction, data: any, options?: AssertValidOptions) => asserts data is Type} */
export const assertValid = (validate, data, options = {}) => {
  const lang = options.lang ?? 'fr'
  const name = options.name ?? 'data'
  if (!validate(data)) {
    (localize[lang] || localize.fr)(validate.errors)
    const message = errorsText(validate.errors, name)
    if (options.internal) throw new Error(message)
    else throw httpError(400, message)
  }
}