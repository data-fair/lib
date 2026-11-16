import type { Field } from '@data-fair/lib-common-types/application/index.js'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import { dateTimeInOwnTimeZone } from './date-tz.js'

dayjs.extend(localizedFormat)
import { attachmentFilename, webPageLabel } from './attachment.js'

export interface FormatFieldOptions {
  /** BCP 47 tag, usually session.lang. */
  locale?: string
}

// Map, not an object literal: a lookup on a key like 'toString' must miss, not walk the prototype chain
const booleanLabels = new Map<string, [string, string]>([
  ['fr', ['Oui', 'Non']],
  ['en', ['Yes', 'No']]
])

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

// both schemes are in use in the wild, schema.org serves the same concepts on either
const conceptIdByUri = new Map<string, string>([
  ['http://schema.org/DigitalDocument', 'attachment'],
  ['https://schema.org/DigitalDocument', 'attachment'],
  ['http://schema.org/WebPage', 'webPage'],
  ['https://schema.org/WebPage', 'webPage']
])

/** Concept id of a column, from x-concept or the deprecated x-refersTo. */
const conceptId = (field: Field): string | undefined =>
  field['x-concept']?.id ?? conceptIdByUri.get(field['x-refersTo'] ?? '')

const formatSingleValue = (field: Field, value: unknown, opts: FormatFieldOptions): string => {
  if (value === undefined || value === null || value === '') return ''
  const locale = opts.locale ?? 'fr'

  // labels first: a coded column whose codes happen to be numbers must read as its labels.
  // x-labels comes from the schema, so it is a plain object: guard the prototype chain by hand
  const label = field['x-labels']?.['' + value]
  if (typeof label === 'string' && label) return label

  const coerced = coerce(field, value)
  const concept = conceptId(field)
  if (concept === 'attachment') return attachmentFilename('' + coerced)
  if (concept === 'webPage') return webPageLabel('' + coerced)

  // trigger on `format`, like data-fair's own table does. French (the default) keeps its historical
  // patterns; another language reads its dayjs localized formats (L, L LT) when that dayjs locale is loaded
  // (import 'dayjs/locale/xx.js' to support one), dayjs itself falls back on English otherwise
  if (field.format === 'date-time' || field.format === 'date') {
    const d = dateTimeInOwnTimeZone(coerced)
    if (!d.isValid()) return '' + coerced
    if (locale.startsWith('fr')) return d.format(field.format === 'date-time' ? 'DD/MM/YYYY, HH[h]mm' : 'DD/MM/YYYY')
    return d.locale(locale.split('-')[0]).format(field.format === 'date-time' ? 'L LT' : 'L')
  }

  if (typeof coerced === 'boolean') {
    const [yes, no] = booleanLabels.get(locale.split('-')[0]) ?? booleanLabels.get('en')!
    return coerced ? yes : no
  }
  if (typeof coerced === 'number') return coerced.toLocaleString(locale)
  return '' + coerced
}

/** Every value of a column: one entry, or one per item on a multi-valued column. */
export function formatFieldValues (field: Field, value: unknown, opts: FormatFieldOptions = {}): string[] {
  if (value === undefined || value === null || value === '') return []
  // a multi-valued column reaches us in either shape: an array from `arrays=true` and the geojson
  // outputs, a string elsewhere — the default /lines output joins the indexed array back with the
  // column's own separator (data-fair's getFlatten). Hence the raw separator below, symmetric with
  // that join: trimming it, as data-fair's index-time parsing of the source file does, would split
  // a value on a separator like ' - '.
  if (Array.isArray(value)) return value.map(v => formatSingleValue(field, v, opts)).filter(v => v !== '')
  if (!field.separator || typeof value !== 'string') {
    const single = formatSingleValue(field, value, opts)
    return single === '' ? [] : [single]
  }
  return value.split(field.separator)
    .map(v => formatSingleValue(field, v.trim(), opts))
    .filter(v => v !== '')
}

export function formatFieldValue (field: Field, value: unknown, opts: FormatFieldOptions = {}): string {
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
