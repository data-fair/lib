import { register } from 'node:module'
import debugModule from 'debug'

const debug = debugModule('test-spies')

export function registerModuleHooks () {
  register('@data-fair/lib-node/test-module-hooks.js', { parentURL: import.meta.url })
}

const { stackTraceLimit } = Error

const pendingPromises: Record<string, { resolve: (data: any) => void, id: number }[]> = {}
let i = 0

export function waitFor <T> (eventName: string, timeout = 2000) {
  i++
  const id = i

  debug(`Waiting for test spy ${eventName} (id=${id}, timeout: ${timeout}ms)`)

  // better stack traces
  // see https://github.com/axios/axios/issues/2387#issuecomment-652242713
  Error.stackTraceLimit = 0
  const timeoutError = new Error(`Timeout waiting for test spy ${eventName}`)
  Error.stackTraceLimit = stackTraceLimit
  Error.captureStackTrace(timeoutError, waitFor)

  const p = new Promise<T>((resolve, reject) => {
    pendingPromises[eventName] = pendingPromises[eventName] ?? []
    pendingPromises[eventName].push({ resolve, id })
    setTimeout(() => reject(timeoutError), timeout)
  })
  p.finally(() => {
    debug(`Cleaning up test spy ${eventName} (id=${id})`)
    pendingPromises[eventName] = pendingPromises[eventName].filter(p => p.id !== id)
    if (pendingPromises[eventName].length === 0) delete pendingPromises[eventName]
  })
  return p
}

export function emit (eventName: string, data: any) {
  debug(`Emitting test spy ${eventName} (${pendingPromises[eventName]?.length} listeners)`)
  if (!pendingPromises[eventName]?.length) {
    console.debug(`No listener for test spy ${eventName}`)
    return
  }
  for (const p of pendingPromises[eventName]) {
    p.resolve(data)
  }
}
