// Custom micro templating to inject params into textual content with {param} syntax

export const escapeRegExp = (/** @type {string} */str) => str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')

/** @type {Record<string, RegExp>} */
const paramRegexCache = {}

/**
 * @param {string} key
 */
const getParamRegexp = (key) => {
  if (!paramRegexCache[key]) paramRegexCache[key] = new RegExp(escapeRegExp(`{${key}}`), 'g')
  return paramRegexCache[key]
}

/**
 *
 * @param {string} txt
 * @param {Record<string, string>} params
 */
export function microTemplate (txt, params) {
  for (const [key, value] of Object.entries(params)) {
    txt = txt.replace(getParamRegexp(key), value)
  }
  return txt
}

export default microTemplate
