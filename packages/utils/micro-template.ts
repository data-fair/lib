// Custom micro templating to inject params into textual content with {param} syntax

export const escapeRegExp = (str: string) => str.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')

const paramRegexCache: Record<string, RegExp> = {}

const getParamRegexp = (key: string) => {
  if (!paramRegexCache[key]) paramRegexCache[key] = new RegExp(escapeRegExp(`{${key}}`), 'g')
  return paramRegexCache[key]
}

export function microTemplate (txt: string, params: Record<string, string>) {
  for (const key of Object.keys(params)) {
    txt = txt.replace(getParamRegexp(key), params[key])
  }
  return txt
}

export default microTemplate
