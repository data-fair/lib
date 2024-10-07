const { stackTraceLimit } = Error
const prodNodeJS = typeof process !== 'undefined' && process.env?.NODE_ENV === 'production'

export class HttpError extends Error {
  /** @type {number} */
  status

  /**
   * @param {number} status
   * @param {string} [message]
   */
  constructor (status, message) {
    super(message)
    this.status = status
  }
}

/**
 *
 * @param {number} status
 * @param {string} [message]
 * @returns {HttpError}
 */
export function httpError (status, message) {
  // capturing stack traces is costly, usually not needed on http errors that concern mostly the client
  Error.stackTraceLimit = 0
  const error = new HttpError(status, message)
  Error.stackTraceLimit = stackTraceLimit
  if (!prodNodeJS || status >= 500) Error.captureStackTrace(error, httpError)
  return error
}
