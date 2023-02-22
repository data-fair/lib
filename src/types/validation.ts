import { type ErrorObject, type ValidateFunction } from 'ajv'
import ajvFr from 'ajv-i18n/localize/fr'
import ajvEn from 'ajv-i18n/localize/en'
import { type Localize } from 'ajv-i18n/localize/types'

const localize: Record<string, Localize> = {
  fr: ajvFr,
  en: ajvEn
}

class ValidationError extends Error {
  status: number
  constructor (message: string) {
    super(message)
    this.name = 'ValidationError'
    this.status = 400
  }
}
// capturing stack traces is costly, never needed on this error that concerns mostly the client
ValidationError.stackTraceLimit = 0

class InternalValidationError extends Error {
  status: number
  constructor (message: string) {
    super(message)
    this.name = 'InternalValidationError'
    this.status = 500
  }
}

// cf https://github.com/ajv-validator/ajv/blob/b3e0cb17d0e095b5c883042b2306571be5ec86b7/lib/core.ts#L650
const errorsText = (errors: ErrorObject[] | null | undefined, varName = 'data') => {
  if (!errors || errors.length === 0) return 'No errors'
  return errors
    .map((e) => `${varName}${e.instancePath} ${e.message}`)
    .reduce((text, msg) => text + ', ' + msg)
}

export const validateThrow = <Type>(validate: ValidateFunction, data: any, lang: string = 'fr', name: string = 'data', internal?: boolean): Type => {
  if (!validate(data)) {
    (localize[lang] || localize.fr)(validate.errors)
    const message = errorsText(validate.errors, name)
    if (internal) throw new ValidationError(message)
    else throw new InternalValidationError(message)
  }
  return data as Type
}
