import dayjs from 'dayjs'

/**
 * @param {Record<string, string | null | undefined | number | boolean>} item
 * @param {import('../shared/application/index.js').Field} field
 * @returns {string}
 */
export function formatField (item, field) {
  const value = item[field.key]
  if (value === undefined || value === null || value === '') return ''
  if (field['x-labels']?.['' + item[field.key]]) return field['x-labels']['' + item[field.key]]
  if (field.type === 'number' || field.type === 'integer') return value.toLocaleString('fr')
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non'
  if (typeof value === 'string') {
    if (
      field['x-refersTo'] === 'http://schema.org/Date' ||
        field['x-refersTo'] === 'https://schema.org/startDate' ||
        field['x-refersTo'] === 'https://schema.org/endDate' ||
        field['x-refersTo'] === 'http://schema.org/dateCreated'
    ) {
      if (field.format === 'date-time') return dayjs(value).format('DD/MM/YYYY, HH[h]mm')
      else return dayjs(value).format('DD/MM/YYYY')
    }
  }
  return '' + value
}
