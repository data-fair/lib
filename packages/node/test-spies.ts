import { register } from 'node:module'

export function registerModuleHooks () {
  register('@data-fair/lib/node/test-module-hooks.js', { parentURL: import.meta.url })
}

const pendingPromises: Record<string, { resolve: (data: any) => void, id: number }[]> = {}
let i = 0

export function waitFor <T> (eventName: string, timeout = 2000) {
  i++
  const id = i
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
