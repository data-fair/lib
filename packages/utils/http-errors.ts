const { stackTraceLimit } = Error
const prodNodeJS = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'

export class HttpError extends Error {
  status: number

  constructor (status: number, message?: string) {
    super(message)
    this.status = status
  }
}

export function httpError (status: number, message?: string): HttpError {
  // capturing stack traces is costly, usually not needed on http errors that concern mostly the client
  Error.stackTraceLimit = 0
  const error = new HttpError(status, message)
  Error.stackTraceLimit = stackTraceLimit
  if (!prodNodeJS || status >= 500) Error.captureStackTrace(error, httpError)
  return error
}

export default httpError
