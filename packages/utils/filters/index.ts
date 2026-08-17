// small tools to transform objects containing simple data filter into elasticsearch querystring syntax

import type { Filtres } from './.type/index.js'
export * from './.type/index.js'

type Filter = Filtres[0]

/**
 * @deprecated Privilégiez `filter2params` : les filtres statiques doivent être
 * transmis via les suffixes REST (_eq, _in, _nin, _gte, _lte, _starts, _exists,
 * _nexists) plutôt que par le paramètre `qs`. Ce dernier reste réservé aux
 * logiques de filtrage complexes non exprimables en params.
 */
export function filter2qs (filter: Filter, locale = 'fr'): string | null {
  if (typeof filter === 'string') return filter

  const key = escape(filter.field.key)

  if (!filter.type || filter.type === 'in') {
    const values = Array.isArray(filter.values) ? filter.values : undefined
    if (!values || values.length === 0) return null
    return `${key}:(${values.map(v => `"${escape(v)}"`).join(' OR ')})`
  } else if (filter.type === 'out') {
    const values = Array.isArray(filter.values) ? filter.values : undefined
    if (!values || values.length === 0) return null
    return `NOT ${key}:(${values.map(v => `"${escape(v)}"`).join(' OR ')})`
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
  } else if (filter.type === 'exists') {
    return `${key}:*`
  } else if (filter.type === 'notExists') {
    return `NOT ${key}:*`
  }
  return null
}

/**
 * @deprecated Privilégiez `filters2params`. Voir `filter2qs`.
 */
export function filters2qs (filters: Filter[] = [], locale = 'fr'): string {
  return filters
    .filter(f => !!f)
    .map(f => filter2qs(f, locale))
    .filter(f => !!f)
    .map(f => `(${f})`).join(' AND ')
}

/**
 * Transforme un filtre en paramètres de requête REST (suffixes `_in`, `_nin`,
 * `_gte`, `_lte`, `_starts`, `_exists`, `_nexists`). Retourne `null` si le
 * filtre est vide ou ne peut pas être représenté.
 *
 * La valeur des filtres `_exists` / `_nexists` est un espace (convention UI
 * DataFair) — l'API ne vérifie pas la valeur, seule la présence de la clé compte.
 */
export function filter2params (filter: Filter): Record<string, string> | null {
  if (typeof filter === 'string') return null

  const key = filter.field.key

  if (!filter.type || filter.type === 'in') {
    const values = Array.isArray(filter.values) ? filter.values : undefined
    if (!values || values.length === 0) return null
    return { [`${key}_in`]: values.join(',') }
  } else if (filter.type === 'out') {
    const values = Array.isArray(filter.values) ? filter.values : undefined
    if (!values || values.length === 0) return null
    return { [`${key}_nin`]: values.join(',') }
  } else if (filter.type === 'interval') {
    const params: Record<string, string> = {}
    if (![null, undefined, ''].includes(filter.minValue as any)) params[`${key}_gte`] = String(filter.minValue)
    if (![null, undefined, ''].includes(filter.maxValue as any)) params[`${key}_lte`] = String(filter.maxValue)
    return params
  } else if (filter.type === 'starts') {
    if ([null, undefined, ''].includes(filter.value as any)) return null
    return { [`${key}_starts`]: filter.value as string }
  } else if (filter.type === 'exists') {
    return { [`${key}_exists`]: ' ' }
  } else if (filter.type === 'notExists') {
    return { [`${key}_nexists`]: ' ' }
  }
  return null
}

/**
 * Transforme un tableau de filtres en un objet plat de paramètres REST.
 * Les filtres vides ou non convertibles sont ignorés.
 */
export function filters2params (filters: Filter[] = []): Record<string, string> {
  return Object.assign({}, ...filters
    .filter(f => !!f)
    .map(f => filter2params(f))
    .filter(f => !!f))
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
