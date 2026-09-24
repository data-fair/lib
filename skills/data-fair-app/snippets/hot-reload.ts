import { ref, computed, watch } from 'vue'
import { useConfig } from './config'
import { useFetch } from '@data-fair/lib-vue/fetch.js'

// Pattern recommandé pour le hot reload (df:sync-config="true").
// Tout l'état data dépend de useConfig() — jamais de window.APPLICATION en top-level.

export function useData () {
  const { config, dataset, datasetUrl } = useConfig()

  // === 1. Computeds simples ===
  // Ils se mettent à jour automatiquement quand config.value change.
  const eqParam = computed(() => '_d_' + dataset.value.id + '_eq')
  const selectField = computed(() => config.value.preview?.click?.selectField || '_id')

  // === 2. useFetch réactif ===
  // useFetch surveille ses params ; quand datasetUrl/finalizedAt changent,
  // la requête est automatiquement refaite.
  const linesUrl = computed(() => datasetUrl.value ? `${datasetUrl.value}/lines` : null)
  const linesQuery = computed(() => ({
    size: 20,
    finalizedAt: dataset.value.finalizedAt
  }))
  const { data: lines } = useFetch(linesUrl, { query: linesQuery })

  // === 3. Structures dynamiques (tableaux, objets) ===
  // Utiliser une ref + watch. Attention : ne PAS appeler useFetch
  // ou d'autres composables à l'intérieur du watch — en Vue 3, les
  // composables doivent être appelés en top-level de setup.
  const filters = ref<any[]>([])

  watch(() => config.value.search?.dynamicFilters, (newFilters) => {
    if (!newFilters) {
      filters.value = []
      return
    }
    filters.value = newFilters.map((f: any) => ({
      key: f.field?.key,
      label: f.field?.title || f.field?.key,
      type: f.facet ? 'facets' : f.field?.type,
      value: ref([])
    }))
  }, { deep: true, immediate: true })

  return { eqParam, selectField, lines, filters }
}

// === 4. Cas avancé : ressources async par élément dynamique ===
// Si chaque filtre a besoin de son propre useFetch (ex: valeurs d'agrégation),
// deux options :
//   a) Créer un sous-composant qui appelle useFetch (propre, recommandé)
//   b) Utiliser effectScope (dernier recours, voir ci-dessous)

// import { effectScope } from 'vue'
//
// let dataScope: ReturnType<typeof effectScope> | null = null
//
// function rebuildAsyncData () {
//   if (dataScope) { dataScope.stop(); dataScope = null }
//   dataScope = effectScope()
//   dataScope.run(() => {
//     filters.value = newFilters.map(f => {
//       // OK d'appeler useFetch ici car on est dans un effectScope
//       const { data } = useFetch(computed(() => `${datasetUrl.value}/values_agg`), ...)
//       return { ...f, items: computed(() => data.value?.aggs || []) }
//     })
//   })
// }
