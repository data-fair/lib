/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-var-requires */

// we use ajv both as a validation tool and as a type check so that we have properly typed data post-validation

import { type Request, type Response } from 'express'
import Ajv, { type ValidateFunction } from 'ajv'
import addFormats from 'ajv-formats'
import ajvErrors from 'ajv-errors'
import { type Localize } from 'ajv-i18n/localize/types'
import ajvFr from 'ajv-i18n/localize/fr'
import ajvEn from 'ajv-i18n/localize/en'
import fastJsonStringify from 'fast-json-stringify'
import flatstr from 'flatstr'

// for bodies and queries it is better to break and help the user fix his request with a message
// strong coercion on queries is good to help finishing the parsing of the querystring but discourage on body and response where the payload should be strictly valid
// useDefaults is debatable, but extensive usage of it allows for simpler conditionals in code both on the client and server
export const ajvQueries = new Ajv({ useDefaults: 'empty', coerceTypes: 'array', allErrors: true })
export const ajvBodies = new Ajv({ useDefaults: true, allErrors: true })
// for responses it is fast-json-stringify that will apply defaults and remove additional properties
export const ajvResponses = new Ajv({ allErrors: true })

addFormats(ajvQueries)
addFormats(ajvBodies)
addFormats(ajvResponses)

// use ajv utils to improve error messages
ajvErrors(ajvQueries)
ajvErrors(ajvBodies)
ajvErrors(ajvResponses)
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

export const validateThrow = <Type>(validate: ValidateFunction, data: any, lang: string = 'fr', name: string = 'data', internal?: boolean): Type => {
  if (!validate(data)) {
    (localize[lang] || localize.fr)(validate.errors)
    const message = ajvQueries.errorsText(validate.errors, { separator: '\n', dataVar: name })
    if (internal) throw new ValidationError(message)
    else throw new InternalValidationError(message)
  }
  return data as Type
}

// prepare a function with generic types and schemas for query/body/response
// the returned function will be used on req/res and return type checked and valid query object, body object and send method
export const reqBuilder = <QueryType = any, BodyType = any, ResponseType = any>(querySchema?: any, bodySchema?: any, responseSchema?: any) => {
  if (querySchema?.$id) {
    ajvQueries.addSchema(querySchema)
    ajvBodies.addSchema(querySchema)
    ajvResponses.addSchema(querySchema)
  }
  if (bodySchema?.$id) {
    ajvQueries.addSchema(bodySchema)
    ajvBodies.addSchema(bodySchema)
    ajvResponses.addSchema(bodySchema)
  }
  if (responseSchema?.$id) {
    ajvQueries.addSchema(responseSchema)
    ajvBodies.addSchema(responseSchema)
    ajvResponses.addSchema(responseSchema)
  }

  const validateQuery = querySchema ? ajvQueries.compile(querySchema) : null
  const validateBody = bodySchema ? ajvBodies.compile(bodySchema) : null
  const validateResponse = responseSchema ? ajvResponses.compile(responseSchema) : null
  // TODO use { largeArrayMechanism: 'json-stringify', largeArray: 1000 } see https://github.com/fastify/fast-json-stringify/issues/602
  const serializeResponse = responseSchema ? fastJsonStringify(responseSchema) : null
  return (req: Request, res: Response): { query: QueryType, body: BodyType, send: (response: ResponseType) => void } => {
    // if no schema is given we perform an unsafe type casting
    const query = validateQuery ? <QueryType>validateThrow(validateQuery, req.query, req.session.lang ?? 'fr', 'query') : req.query as QueryType
    const body = validateBody ? <BodyType>validateThrow(validateBody, req.body, req.session.lang ?? 'fr', 'body') : req.body as BodyType
    const send = (response: ResponseType, status?: number) => {
      if (validateResponse) validateThrow(validateResponse, response, 'en', 'response', true)
      if (status) res.status(status)
      if (serializeResponse) {
        res.type('json')
        const resStr = serializeResponse(response)
        flatstr(resStr)
        res.send(resStr)
      } else {
        res.send(response)
      }
    }
    return { query, body, send }
  }
}
