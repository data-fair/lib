// Custom micro templating to inject params into textual content with {param} syntax

export const escapeRegExp = (/** @type {string} */str) => str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')

/**
 *
 * @param {string} txt
 * @param {Record<string, string>} params
 */
export function microTemplate (txt, params) {
  Object.keys(params).forEach(p => {
    txt = txt.replace(new RegExp(escapeRegExp(`{${p}}`), 'g'), params[p])
  })
  return txt
}

export default microTemplate
