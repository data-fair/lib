import type { EventEmitter } from 'node:events'

type EventPromiseOptions = { timeout?: number }

export function eventPromise <T> (emitter: EventEmitter, event: string, options?: EventPromiseOptions): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = options?.timeout ?? 60000

    let timeoutRef: ReturnType<typeof setTimeout>
    if (timeout > 0) {
      timeoutRef = setTimeout(() => {
        emitter.off(event, callback)
        emitter.off('error', errorCallback)
        reject(new Error(`Timeout of ${timeout}ms exceeded`))
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
