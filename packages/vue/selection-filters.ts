// Inter-app selection convention (`_s_`): a `_c_<conceptId>_<op>` or
// `_d_<datasetId>_<fieldKey>_<op>` filter accompanied by a `_s_<key without operator>`
// marker is a selection (a click in an app, a filter set by a page), never a
// restriction. See skill `data-fair-app`, `references/filters-url-convention.md`
// § « Mode sélection `_s_` ».

export const FILTER_OPERATORS = [
  'eq', 'neq', 'in', 'nin', 'lt', 'lte', 'gt', 'gte', 'starts', 'exists', 'nexists', 'contains', 'search'
] as const

export interface SelectionFilter {
  /** Full filter key (`_c_codeCommune_in`). */
  filterKey: string
  /** Key without its operator, the marker target (`_c_codeCommune`). */
  baseKey: string
  operator: string
  conceptId?: string
  datasetId?: string
  fieldKey?: string
  value: string
  /** Marker value, the emitter (`app_<applicationId>`): tells an app whether the selection is its own. */
  source: string
}

// Concepts that do not describe a selectable entity.
const NON_HIGHLIGHT_CONCEPTS = new Set(['q', 'geo_distance', 'map_center', 'map_zoom'])

function splitFilterKey (key: string): { baseKey: string, operator: string } {
  const tokens = key.split('_')
  const last = tokens[tokens.length - 1]
  if (tokens.length > 2 && (FILTER_OPERATORS as readonly string[]).includes(last)) {
    return { baseKey: tokens.slice(0, -1).join('_'), operator: last }
  }
  return { baseKey: key, operator: 'eq' }
}

/** Values of an `_in` selection parameter: `a,b`, `"a","b"` or `["a","b"]`. */
export function parseSelectionValues (raw: string): string[] {
  const trimmed = raw.trim()
  if (trimmed.startsWith('[')) {
    try {
      return (JSON.parse(trimmed) as unknown[]).map(String)
    } catch {
      /* fall back on the split */
    }
  }
  if (trimmed.startsWith('"')) {
    try {
      return (JSON.parse(`[${trimmed}]`) as unknown[]).map(String)
    } catch {
      /* fall back on the split */
    }
  }
  return trimmed.split(',').filter(Boolean)
}

/**
 * Active filters of the selection: those with a matching `_s_` marker, whatever their
 * operator (a range shares one marker between its `_gte` and `_lte` bounds). An app
 * renders what it can (`eq` / `in`: entities, `gte` / `lte`: a range) and ignores the rest.
 */
export function findSelectionFilters (searchParams: Record<string, unknown>, datasetId?: string | null): SelectionFilter[] {
  const keys = Object.keys(searchParams)
  const marker = (markerKey: string) => markerKey in searchParams ? String(searchParams[markerKey]) : undefined
  const out: SelectionFilter[] = []
  for (const key of keys) {
    if (!key.startsWith('_c_') && !key.startsWith('_d_')) continue
    const { baseKey, operator } = splitFilterKey(key)
    if (key.startsWith('_c_')) {
      const conceptId = baseKey.slice(3)
      if (!conceptId || NON_HIGHLIGHT_CONCEPTS.has(conceptId)) continue
      const source = marker(`_s_${conceptId}`)
      if (source === undefined) continue
      out.push({ filterKey: key, baseKey, operator, conceptId, value: String(searchParams[key]), source })
    } else {
      if (!datasetId || !key.startsWith(`_d_${datasetId}_`)) continue
      const fieldKey = baseKey.slice(`_d_${datasetId}_`.length)
      const source = fieldKey ? marker(`_s_${datasetId}_${fieldKey}`) : undefined
      if (source === undefined) continue
      out.push({ filterKey: key, baseKey, operator, datasetId, fieldKey, value: String(searchParams[key]), source })
    }
  }
  return out
}

/** Filter keys to exclude from API requests: they describe a selection. Already applied by `getConceptFilters`. */
export function selectionExcludeKeys (searchParams: Record<string, unknown>, datasetId?: string | null): string[] {
  return findSelectionFilters(searchParams, datasetId).map((f) => f.filterKey)
}

/**
 * Marker key of a selection filter: the filter key without its operator and without its
 * `_c_` / `_d_` prefix (`_c_codeCommune_in` → `_s_codeCommune`, `_d_ds1_cat_eq` →
 * `_s_ds1_cat`). An emission writes this key next to the filter.
 */
export function selectionMarkerKey (filterKey: string): string {
  const { baseKey } = splitFilterKey(filterKey)
  return `_s_${baseKey.replace(/^_c_|^_d_/, '')}`
}

/**
 * Marker value of a selection emitted by an application: `app_<applicationId>`. Every app
 * renders a marked filter as a selection; this value only tells the emitter that the
 * selection is its own (`SelectionFilter.source`). A page can set another value.
 */
export function selectionMarkerValue (applicationId?: string): string | undefined {
  return applicationId ? `app_${applicationId}` : undefined
}
