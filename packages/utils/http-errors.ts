const { stackTraceLimit } = Error
const prodNodeJS = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'

export class HttpError extends Error {
  status: number
  // set to true so that the error handler sends the message as response body
  // even for a 5xx status (hidden by default as potentially confidential)
  expose?: boolean

  constructor (status: number, message?: string, options?: { expose?: boolean }) {
    super(message)
    this.status = status
    if (options?.expose !== undefined) this.expose = options.expose
  }
}

export function httpError (status: number, message?: string, options?: { expose?: boolean }): HttpError {
  // capturing stack traces is costly, usually not needed on http errors that concern mostly the client
  Error.stackTraceLimit = 0
  const error = new HttpError(status, message, options)
  Error.stackTraceLimit = stackTraceLimit
  if (!prodNodeJS || status >= 500) Error.captureStackTrace(error, httpError)
  return error
}

export default httpError
