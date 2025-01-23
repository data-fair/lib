import { register } from 'node:module'

export function registerModuleHooks () {
  register('@data-fair/lib-node/test-module-hooks.js', { parentURL: import.meta.url })
}

const { stackTraceLimit } = Error

const pendingPromises: Record<string, { resolve: (data: any) => void, id: number }[]> = {}
let i = 0

export function waitFor <T> (eventName: string, timeout = 2000) {
  i++
  const id = i

  // better stack traces
  // see https://github.com/axios/axios/issues/2387#issuecomment-652242713
  Error.stackTraceLimit = 0
  const timeoutError = new Error(`Timeout waiting for test spy ${eventName}`)
  Error.stackTraceLimit = stackTraceLimit
  Error.captureStackTrace(timeoutError, waitFor)

  const p = new Promise<T>((resolve, reject) => {
    pendingPromises[eventName] = pendingPromises[eventName] ?? []
    pendingPromises[eventName].push({ resolve, id })
    setTimeout(() => reject(new Error(`Timeout waiting for test spy ${eventName}`)), timeout)
  })
  p.finally(() => {
    pendingPromises[eventName] = pendingPromises[eventName].filter(p => p.id !== id)
    if (pendingPromises[eventName].length === 0) delete pendingPromises[eventName]
  })
  return p
}

export function emit (eventName: string, data: any) {
  if (!pendingPromises[eventName]) return
  for (const p of pendingPromises[eventName]) {
    p.resolve(data)
  }
}
