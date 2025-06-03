import type { ErrorObject, ValidateFunction } from 'ajv'
import type { Localize } from 'ajv-i18n/localize/types.js'
import ajvFrModule from 'ajv-i18n/localize/fr/index.js'
import ajvEnModule from 'ajv-i18n/localize/en/index.js'
import { httpError } from '@data-fair/lib-utils/http-errors.js'

const ajvFr = ajvFrModule as unknown as typeof ajvFrModule.default
const ajvEn = ajvEnModule as unknown as typeof ajvEnModule.default

const localize: Record<string, Localize> = {
  fr: ajvFr,
  en: ajvEn
}

// cf https://github.com/ajv-validator/ajv/blob/b3e0cb17d0e095b5c883042b2306571be5ec86b7/lib/core.ts#L650
export const errorsText = (errors: ErrorObject[] | null | undefined, varName = 'data', lang = 'fr') => {
  if (!errors || errors.length === 0) return lang === 'fr' ? 'Aucune erreur' : 'No error';
  (localize[lang] || localize.fr)(errors)
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

export type AssertValidOptions = { lang?: string, name?: string, internal?: boolean }

export function assertValid<T> (validate: ValidateFunction, data: any, options: AssertValidOptions = {}): asserts data is T {
  if (!validate(data)) {
    const message = errorsText(validate.errors, options.name, options.lang)
    if (options.internal) throw new Error(message)
    else throw httpError(400, message)
  }
}
