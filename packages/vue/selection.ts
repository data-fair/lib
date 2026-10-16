// Inter-app selection: a `_c_<conceptId>_<op>` or `_d_<datasetId>_<fieldKey>_<op>`
// filter that targets the selection field declared by a visualization is a
// selection (highlighting, never a restriction) — the visualization removes it
// from its API requests. Any other field is a restriction. See skill
// `data-fair-app`, `references/filters-url-convention.md` § « Sélection ».

export const FILTER_OPERATORS = [
  'eq', 'neq', 'in', 'nin', 'lt', 'lte', 'gt', 'gte', 'starts', 'exists', 'nexists', 'contains', 'search'
] as const

/** Field a visualization declares as selectable: a concept, a dataset field, or both. */
export interface SelectionTarget {
  conceptId?: string
  datasetId?: string
  fieldKey?: string
}

export interface TargetFilter {
  /** Full filter key (`_c_codeCommune_in`). */
  filterKey: string
  /** Key without its operator (`_c_codeCommune`). */
  baseKey: string
  operator: string
  conceptId?: string
  datasetId?: string
  fieldKey?: string
  value: string
}

function splitFilterKey (key: string): { baseKey: string, operator: string } {
  const tokens = key.split('_')
  const last = tokens[tokens.length - 1]
  if (tokens.length > 2 && (FILTER_OPERATORS as readonly string[]).includes(last)) {
    return { baseKey: tokens.slice(0, -1).join('_'), operator: last }
  }
  return { baseKey: key, operator: 'eq' }
}

/** Values of an `_in` parameter: `a,b`, `"a","b"` or `["a","b"]`. */
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
 * Filters targeting the declared selection field(s), whatever their operator —
 * an app renders what it can (`eq` / `in`: entities, `gte` / `lte`: a range) and
 * ignores the rest.
 */
export function findTargetFilters (
  searchParams: Record<string, unknown>,
  target: SelectionTarget | SelectionTarget[]
): TargetFilter[] {
  const targets = Array.isArray(target) ? target : [target]
  const out: TargetFilter[] = []
  for (const key of Object.keys(searchParams)) {
    const { baseKey, operator } = splitFilterKey(key)
    if (key.startsWith('_c_')) {
      const conceptId = baseKey.slice(3)
      if (!conceptId || !targets.some((t) => t.conceptId === conceptId)) continue
      out.push({ filterKey: key, baseKey, operator, conceptId, value: String(searchParams[key]) })
    } else if (key.startsWith('_d_')) {
      const t = targets.find((t) => t.datasetId !== undefined && key.startsWith(`_d_${t.datasetId}_`))
      if (!t) continue
      const fieldKey = baseKey.slice(`_d_${t.datasetId}_`.length)
      if (!fieldKey || fieldKey !== t.fieldKey) continue
      out.push({ filterKey: key, baseKey, operator, datasetId: t.datasetId, fieldKey, value: String(searchParams[key]) })
    }
  }
  return out
}

/** Filter keys to remove from API requests: they target the declared selection field. */
export function targetExcludeKeys (
  searchParams: Record<string, unknown>,
  target: SelectionTarget | SelectionTarget[]
): string[] {
  return findTargetFilters(searchParams, target).map((f) => f.filterKey)
}
