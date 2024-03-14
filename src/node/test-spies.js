// import { register } from 'node:module'

// export function registerModuleHooks () {
//   register('@data-fair/lib/node/test-module-hooks.js', { parentURL: import.meta.url })
// }

// /** @type {Record<string, {resolve: (data: any) => void, id: number}[]>} */
// const pendingPromises = {}
// let i = 0

// /**
//  * @param {string} eventName
//  * @param {number} timeout
//  * @returns {Promise<any>}
//  */
// export function waitFor (eventName, timeout = 2000) {
//   i++
//   const id = i
//   const p = new Promise((resolve, reject) => {
//     pendingPromises[eventName] = pendingPromises[eventName] ?? []
//     pendingPromises[eventName].push({ resolve, id })
//     setTimeout(() => reject(new Error(`Timeout waiting for test spy ${eventName}`)), timeout)
//   })
//   p.finally(() => {
//     pendingPromises[eventName] = pendingPromises[eventName].filter(p => p.id !== id)
//     if (pendingPromises[eventName].length === 0) delete pendingPromises[eventName]
//   })
//   return p
// }

// /**
//  * @param {string} eventName
//  * @param {any} data
//  */
// export function emit (eventName, data) {
//   if (!pendingPromises[eventName]) return
//   for (const p of pendingPromises[eventName]) {
//     p.resolve(data)
//   }
// }
