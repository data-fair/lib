/**
 * @param {string | any} error
 * @returns {string}
 */
export function getErrorMessage (error) {
  if (typeof error === 'string') return error
  if (error.data && typeof error.data === 'string') return error.data
  return error.message ?? error.statusText ?? JSON.stringify(error)
}

/**
 * @param {string | any} message
 * @param {string | any} [error]
 */
export function throwFatalError (message, error) {
  if (!error) {
    error = message
    message = ''
  }
  console.error(message, error)
  message += getErrorMessage(error)

  // imitate an error created by nuxt createError
  // see https://github.com/nuxt/nuxt/blob/main/packages/nuxt/src/app/composables/error.ts
  /** @type {any} */
  const e = new Error(message)
  if (error.stack) e.stack = error.stack
  e.fatal = true
  e.__h3_error__ = true
  e.unhandled = true
  e.statusCode = 500
  e.__nuxt_error = { value: true, configurable: false, writable: false, }
  throw e
}

/**
 * @template {(...args: any[]) => Promise<any>} F
 * @param {F} fn
 * @param {string} [message ]
 * @returns {F}
 */
export function withFatalError (fn, message = '') {
  // @ts-ignore
  return async function () {
    try {
      // @ts-ignore
      return await fn.apply(null, arguments)
    } catch (err) {
      throwFatalError(message, err)
    }
  }
}
