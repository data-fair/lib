import type { EventEmitter } from 'node:events'

type EventPromiseOptions = { timeout?: number }

const { stackTraceLimit } = Error

class EventPromiseContextError extends Error {
  constructor () {
    super()
    this.name = 'EventPromiseContextError'
  }
}

export function eventPromise <T> (emitter: EventEmitter, event: string, options?: EventPromiseOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = options?.timeout ?? 60000

    // better stack traces
    // see https://github.com/axios/axios/issues/2387#issuecomment-652242713
    Error.stackTraceLimit = 0
    const errorContext = new EventPromiseContextError()
    Error.stackTraceLimit = stackTraceLimit
    Error.captureStackTrace(errorContext, eventPromise)

    let timeoutRef: ReturnType<typeof setTimeout>
    if (timeout > 0) {
      timeoutRef = setTimeout(() => {
        emitter.off(event, callback)
        emitter.off('error', errorCallback)
        const error = new Error(`Timeout of ${timeout}ms exceeded`)
        error.stack += '\n' + errorContext.stack
        reject(error)
      }, timeout)
    }

    const callback = (data: T) => {
      if (timeoutRef) clearTimeout(timeoutRef)
      emitter.off('error', errorCallback)
      resolve(data)
    }
    const errorCallback = (error: Error) => {
      if (timeoutRef) clearTimeout(timeoutRef)
      emitter.off(event, callback)
      reject(error)
    }

    emitter.once(event, callback)
    emitter.once('error', errorCallback)
  })
}

export default eventPromise
