// small tools to transform objects containing simple data filter into elasticsearch querystring syntax

import type { Filter } from './.type/index.js'
export * from './.type/index.js'

export function filter2qs (filter: Filter, locale = 'fr'): string | null {
  if (typeof filter === 'string') return filter

  const key = escape(filter.field.key)

  if (!filter.type || filter.type === 'in') {
    if ([null, undefined, ''].includes(filter.values as any)) return null
    if (Array.isArray(filter.values) && filter.values.length === 0) return null
    return `${key}:(${filter.values.map(v => `"${escape(v)}"`).join(' OR ')})`
  } else if (filter.type === 'out') {
    if ([null, undefined, ''].includes(filter.values as any)) return null
    if (Array.isArray(filter.values) && filter.values.length === 0) return null
    return `NOT ${key}:(${filter.values.map(v => `"${escape(v)}"`).join(' OR ')})`
  } else if (filter.type === 'interval') {
    const min = ![null, undefined, ''].includes(filter.minValue) ? escape(filter.minValue as string) : '*'
    const max = ![null, undefined, ''].includes(filter.maxValue) ? escape(filter.maxValue as string) : '*'
    return `${key}:[${min} TO ${max}]`
  } else if (filter.type === 'starts') {
    if ([null, undefined, ''].includes(filter.value)) return null
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

export function filters2qs (filters: Filter[] = [], locale = 'fr'): string {
  return filters
    .filter(f => !!f)
    .map(f => filter2qs(f, locale))
    .filter(f => !!f)
    .map(f => `(${f})`).join(' AND ')
}

// cf https://github.com/joeybaker/lucene-escape-query/blob/master/index.js
export function escape (val: string): string {
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

export function filterByDate (config: any, dates: string[], dateFields: any): string[] {
  if (config.filterByDate === 'exact' && dates.length === 1) {
    if (dateFields.startDate && dateFields.endDate) return [`${dateFields.startDate.key}:[* TO ${dates[0]}]`, `${dateFields.endDate.key}:[${dates[0]} TO *]`]
    else if (dateFields.date) return [`${dateFields.date.key}:${dates[0]}`]
  } else if (config.filterByDate === 'interval') {
    if (dateFields.startDate && dateFields.endDate) return [`${dateFields.startDate.key}:[* TO ${dates[1]}]`, `${dateFields.endDate.key}:[${dates[0]} TO *]`]
    else if (dateFields.date) return [`${dateFields.date.key}:[${dates[0]} TO ${dates[1]}]`]
  }
  return []
}
