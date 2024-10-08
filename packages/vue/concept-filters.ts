// filter reactiveSearchParams to conceptFilters (params prefixed by _c_)

import { reactive, watch } from 'vue'

export function useConceptFilters (reactiveSearchParams: Record<string, string>, datasetId?: string) {
  const conceptFilters = reactive({} as Record<string, string>)

  const datasetFiltersPrefix = datasetId && `_d_${datasetId}_`

  watch(reactiveSearchParams, () => {
    for (const key of Object.keys(reactiveSearchParams)) {
      if (key.startsWith('_c_')) conceptFilters[key] = reactiveSearchParams[key]
      if (datasetFiltersPrefix && key.startsWith(datasetFiltersPrefix)) {
        conceptFilters[key.replace(datasetFiltersPrefix, '')] = reactiveSearchParams[key]
      }
    }
    for (const key of Object.keys(conceptFilters)) {
      if (key.startsWith('_c_') && reactiveSearchParams[key] === undefined) delete conceptFilters[key]
      if (datasetFiltersPrefix && !key.startsWith('_c_') && reactiveSearchParams[datasetFiltersPrefix + key] === undefined) {
        delete conceptFilters[key]
      }
    }
  }, { immediate: true })

  return conceptFilters
}

export default useConceptFilters
