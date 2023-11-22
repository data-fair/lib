// inspired by useUrlSearchParams (https://github.com/vueuse/vueuse/blob/main/packages/core/useUrlSearchParams/index.ts)
// but even simpler, without array values, always in history mode, in a singleton (no SSR mode), etc

import { reactive, watch } from 'vue'

const state = reactive(/** @type {Record<string, string>} */({}))

function updateState () {
  const params = new URLSearchParams(window.location.search)
  const unusedKeys = new Set(Object.keys(state))
  for (const entry of params.entries()) {
    state[entry[0]] = entry[1]
    unusedKeys.delete(entry[0])
  }
  for (const unusedKey of unusedKeys) {
    delete state[unusedKey]
  }
}

window.addEventListener('popstate', () => {
  updateState()
})
updateState()

const updateUrl = () => {
  const params = new URLSearchParams('')
  for (const key of Object.keys(state)) {
    const value = state[key]
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, value)
    }
  }
  const newQuery = params.toString()
  const newSearch = newQuery.length > 0 ? '?' + newQuery : ''
  if (newSearch !== window.location.search) {
    window.history.replaceState(
      window.history.state,
      window.document.title,
      window.location.pathname + newSearch
    )
  }
}

watch(state, () => {
  updateUrl()
})

export default state
