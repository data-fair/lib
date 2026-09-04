import type { Field } from '@data-fair/lib-common-types/application/index.js'
import { dateTimeInOwnTimeZone } from './date-tz.js'

export interface FormatFieldOptions {
  /** BCP 47 tag, usually session.lang. Reading it is a cached computed, hoist it per render. */
  locale?: string
}

const booleanLabels: Record<string, [string, string]> = {
  fr: ['Oui', 'Non'],
  en: ['Yes', 'No']
}

// a values_agg bucket key and a URL param both hand the value back as a string, while the
// schema knows what it really is
const coerce = (field: Field, value: unknown): unknown => {
  if (typeof value !== 'string') return value
  if (field.type === 'boolean') {
    if (value === 'true') return true
    if (value === 'false') return false
    return value
  }
  if (field.type === 'number' || field.type === 'integer') {
    const n = Number(value)
    return Number.isFinite(n) ? n : value
  }
  return value
}

export function formatFieldValue (field: Field, value: unknown, opts: FormatFieldOptions = {}): string {
  if (value === undefined || value === null || value === '') return ''
  const locale = opts.locale ?? 'fr'
  const coerced = coerce(field, value)

  // labels first: a coded column whose codes happen to be numbers must read as its labels
  const label = field['x-labels']?.['' + value] ?? field['x-labels']?.['' + coerced]
  if (label) return label

  // trigger on `format`, like data-fair's own table does, and always render in French
  if (field.format === 'date-time') return dateTimeInOwnTimeZone(coerced).format('DD/MM/YYYY, HH[h]mm')
  if (field.format === 'date') return dateTimeInOwnTimeZone(coerced).format('DD/MM/YYYY')

  if (typeof coerced === 'boolean') {
    const [yes, no] = booleanLabels[locale] ?? booleanLabels.fr
    return coerced ? yes : no
  }
  if (typeof coerced === 'number') return coerced.toLocaleString(locale)
  return '' + coerced
}

export function getFieldLabel (field: Field): string {
  return field.title || field['x-originalName'] || field.key
}
