// filter reactiveSearchParams to conceptFilters (params prefixed by _c_)

import { reactive, watch } from 'vue'

export function getConceptFilters (searchParams: Record<string, string>, datasetId?: string) {
  const conceptFilters: Record<string, string> = {}

  const datasetFiltersPrefix = datasetId && `_d_${datasetId}_`

  for (const key of Object.keys(searchParams)) {
    if (key.startsWith('_c_')) conceptFilters[key] = searchParams[key]
    if (datasetFiltersPrefix && key.startsWith(datasetFiltersPrefix)) {
      conceptFilters[key.replace(datasetFiltersPrefix, '')] = searchParams[key]
    }
  }
  return conceptFilters
}

export function useConceptFilters (reactiveSearchParams: Record<string, string>, datasetId?: string) {
  const conceptFilters = reactive({} as Record<string, string>)

  // we use a watch and mutations on a reactive to prevent triggering reactivity on unrelated changes in reactive search params
  watch(reactiveSearchParams, () => {
    const newConceptFilters = getConceptFilters(reactiveSearchParams, datasetId)
    Object.assign(conceptFilters, newConceptFilters)
    for (const key of Object.keys(conceptFilters)) {
      if (!(key in newConceptFilters)) delete conceptFilters[key]
    }
  }, { immediate: true })

  return conceptFilters
}

export default useConceptFilters
