// a copy of https://github.com/davidmarkclements/rfdc/blob/master/index.js
// but lighter and with ESM export

function copyBuffer (/** @type { ArrayBufferView} */cur) {
  if (cur instanceof Buffer) {
    return Buffer.from(cur)
  }

  // @ts-ignore
  return new cur.constructor(cur.buffer.slice(), cur.byteOffset, cur.length)
}

function cloneArray (/** @type {any[]} */a) {
  const keys = Object.keys(a)
  const a2 = new Array(keys.length)
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i]
    // @ts-ignore
    const cur = a[k]
    if (typeof cur !== 'object' || cur === null) {
      // @ts-ignore
      a2[k] = cur
    } else if (cur instanceof Date) {
      // @ts-ignore
      a2[k] = new Date(cur)
    } else if (ArrayBuffer.isView(cur)) {
      // @ts-ignore
      a2[k] = copyBuffer(cur)
    } else {
      // @ts-ignore
      a2[k] = clone(cur)
    }
  }
  return a2
}

/**
 * @template T
 * @param {T} o
 * @returns {T}
 */
export default function clone (o) {
  if (typeof o !== 'object' || o === null) return o
  // @ts-ignore
  if (o instanceof Date) return new Date(o)
  // @ts-ignore
  if (Array.isArray(o)) return cloneArray(o)
  // @ts-ignore
  if (o instanceof Map) return new Map(cloneArray(Array.from(o)))
  // @ts-ignore
  if (o instanceof Set) return new Set(cloneArray(Array.from(o)))
  /** @type {Record<string, any>} */
  const o2 = {}
  for (const k in o) {
    if (Object.hasOwnProperty.call(o, k) === false) continue
    const cur = o[k]
    if (typeof cur !== 'object' || cur === null) {
      o2[k] = cur
    } else if (cur instanceof Date) {
      o2[k] = new Date(cur)
    } else if (cur instanceof Map) {
      o2[k] = new Map(cloneArray(Array.from(cur)))
    } else if (cur instanceof Set) {
      o2[k] = new Set(cloneArray(Array.from(cur)))
    } else if (ArrayBuffer.isView(cur)) {
      o2[k] = copyBuffer(cur)
    } else {
      o2[k] = clone(cur)
    }
  }
  // @ts-ignore
  return o2
}
