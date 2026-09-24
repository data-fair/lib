import { useFetch } from '@data-fair/lib-vue/fetch.js'

// URL réactive : refetch automatique quand datasetUrl change
const { data, loading, error, refresh } = useFetch(
  computed(() => datasetUrl.value + '/lines'),
  {
    query: computed(() => ({
      size: 100,
      q: searchQuery.value,
      qs: filters.value,
      sort: sortField.value
    })),
    notifError: false // optionnel : désactive la notification auto
  }
)

// data : shallowReadonly des données
// loading : readonly boolean
// error : readonly FetchError | null
// refresh : fonction pour forcer le refetch
