import type { Field } from '@data-fair/lib-common-types/application/index.js'
import { dateTimeInOwnTimeZone } from './date-tz.js'

export interface FormatFieldOptions {
  /** BCP 47 tag, usually session.lang. */
  locale?: string
}

const booleanLabels: Record<string, [string, string]> = {
  fr: ['Oui', 'Non'],
  en: ['Yes', 'No']
}

// a bucket key or a URL param hands the value back as a string, the schema knows what it is
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

const formatSingleValue = (field: Field, value: unknown, opts: FormatFieldOptions): string => {
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
    const [yes, no] = booleanLabels[locale.split('-')[0]] ?? booleanLabels.fr
    return coerced ? yes : no
  }
  if (typeof coerced === 'number') return coerced.toLocaleString(locale)
  return '' + coerced
}

/** Every value of a column: one entry, or one per item on a multi-valued column. */
export function formatFieldValues (field: Field, value: unknown, opts: FormatFieldOptions = {}): string[] {
  if (value === undefined || value === null || value === '') return []
  if (!field.separator || typeof value !== 'string') {
    const single = formatSingleValue(field, value, opts)
    return single === '' ? [] : [single]
  }
  return value.split(field.separator)
    .map(v => formatSingleValue(field, v.trim(), opts))
    .filter(v => v !== '')
}

export function formatFieldValue (field: Field, value: unknown, opts: FormatFieldOptions = {}): string {
  if (!field.separator || typeof value !== 'string') return formatSingleValue(field, value, opts)
  return formatFieldValues(field, value, opts).join(', ')
}

/** Kept for the callers that hold a whole row; delegates to formatFieldValue. */
export function formatField (
  item: Record<string, unknown>,
  field: Field,
  opts?: FormatFieldOptions
): string {
  return formatFieldValue(field, item[field.key], opts)
}

export function getFieldLabel (field: Field): string {
  return field.title || field['x-originalName'] || field.key
}
