/**
 * @template T
 * @param {import('node:events').EventEmitter} emitter
 * @param {string} event
 * @param {{timeout: number}} [options]
 * @returns {Promise<T>}
 */
export const eventPromise = (emitter, event, options) => {
  return new Promise((resolve, reject) => {
    const timeout = options?.timeout ?? 60000

    /** @type {ReturnType<setTimeout>} */
    let timeoutRef
    if (timeout > 0) {
      timeoutRef = setTimeout(() => {
        emitter.off(event, callback)
        emitter.off('error', errorCallback)
        reject(new Error(`Timeout of ${timeout}ms exceeded`))
      }, timeout)
    }

    const callback = (/** @type {any} */ data) => {
      if (timeoutRef) clearTimeout(timeoutRef)
      emitter.off('error', errorCallback)
      resolve(data)
    }
    const errorCallback = (/** @type {Error} */ error) => {
      if (timeoutRef) clearTimeout(timeoutRef)
      emitter.off(event, callback)
      reject(error)
    }

    emitter.once(event, callback)
    emitter.once('error', errorCallback)
  })
}

export default eventPromise
