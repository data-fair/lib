// small tools to transform objects containing simple data filter into elasticsearch querystring syntax

export * from './.type/index.js'

/**
 * @param {import('./.type/types.js').Filter} filter
 * @param {string} locale
 * @returns {string | null}
 */
export function filter2qs (filter, locale = 'fr') {
  if (typeof filter === 'string') return filter

  const key = escape(filter.field.key)

  if (!filter.type || filter.type === 'in') {
    // @ts-ignore
    if ([null, undefined, ''].includes(filter.values)) return null
    if (Array.isArray(filter.values) && filter.values.length === 0) return null
    return `${key}:(${filter.values.map(v => `"${escape(v)}"`).join(' OR ')})`
  } else if (filter.type === 'out') {
    // @ts-ignore
    if ([null, undefined, ''].includes(filter.values)) return null
    if (Array.isArray(filter.values) && filter.values.length === 0) return null
    return `NOT ${key}:(${filter.values.map(v => `"${escape(v)}"`).join(' OR ')})`
  } else if (filter.type === 'interval') {
    // @ts-ignore
    const min = ![null, undefined, ''].includes(filter.minValue) ? escape(filter.minValue) : '*'
    // @ts-ignore
    const max = ![null, undefined, ''].includes(filter.maxValue) ? escape(filter.maxValue) : '*'
    return `${key}:[${min} TO ${max}]`
  } else if (filter.type === 'starts') {
    // @ts-ignore
    if ([null, undefined, ''].includes(filter.value)) return null
    // @ts-ignore
    if (filter.value.includes(',')) {
      throw new Error({
        fr: 'vous ne pouvez pas appliquer un filtre "commence par" contenant une virgule',
        en: 'You cannot use a filter "startsWith" containing a comma'
      }[locale])
    }
    return `${key}:${escape(filter.value)}*`
  }
  return null
}

/**
 * @param {import('./.type/types.js').Filter[]} filters
 * @param {string} locale
 * @returns {string}
 */
export function filters2qs (filters = [], locale = 'fr') {
  return filters
    .filter(f => !!f)
    .map(f => filter2qs(f, locale))
    .filter(f => !!f)
    .map(f => `(${f})`).join(' AND ')
}

// cf https://github.com/joeybaker/lucene-escape-query/blob/master/index.js
/**
 * @param {string} val
 * @returns {string}
 */
export function escape (val) {
  return [].map.call(val + '', (char) => {
    if (char === '+' ||
      char === '-' ||
      char === '&' ||
      char === '|' ||
      char === '!' ||
      char === '(' ||
      char === ')' ||
      char === '{' ||
      char === '}' ||
      char === '[' ||
      char === ']' ||
      char === '^' ||
      char === '"' ||
      char === '~' ||
      char === '*' ||
      char === '?' ||
      char === ':' ||
      char === ' ' ||
      char === '\\' ||
      char === '/'
    ) return '\\' + char
    else return char
  }).join('')
}

/**
 * @param {any} config
 * @param {string[]} dates
 * @param {any} dateFields
 * @returns {string[]}
 */
export function filterByDate (config, dates, dateFields) {
  if (config.filterByDate === 'exact' && dates.length === 1) {
    if (dateFields.startDate && dateFields.endDate) return [`${dateFields.startDate.key}:[* TO ${dates[0]}]`, `${dateFields.endDate.key}:[${dates[0]} TO *]`]
    else if (dateFields.date) return [`${dateFields.date.key}:${dates[0]}`]
  } else if (config.filterByDate === 'interval') {
    if (dateFields.startDate && dateFields.endDate) return [`${dateFields.startDate.key}:[* TO ${dates[1]}]`, `${dateFields.endDate.key}:[${dates[0]} TO *]`]
    else if (dateFields.date) return [`${dateFields.date.key}:[${dates[0]} TO ${dates[1]}]`]
  }
  return []
}
