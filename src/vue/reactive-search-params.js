// inspired by useUrlSearchParams (https://github.com/vueuse/vueuse/blob/main/packages/core/useUrlSearchParams/index.ts)
// but even simpler, without array values, always in history mode, and shared in a app plugin

import { reactive, watch, inject } from 'vue'
import Debug from 'debug'

const debug = Debug('reactive-search-params')
debug.log = console.log.bind(console)

/**
 * @param {import('vue-router').Router} [router]
 * @returns {Record<string, string>}
 */
export function getReactiveSearchParams (router) {
  const state = reactive(/** @type {Record<string, string>} */({}))

  // 2 modes, 1 based on vue router, 1 based on window.location.search
  if (router) {
    debug('initialize reactive search params based on vue router')
    watch(router.currentRoute, (route) => {
      debug('route.query changed', route.query)
      const query = route.query
      const unusedKeys = new Set(Object.keys(state))
      for (const key of Object.keys(query)) {
        const value = query[key]
        if (typeof value === 'string') {
          state[key] = value
          unusedKeys.delete(key)
        }
      }
      for (const unusedKey of unusedKeys) {
        delete state[unusedKey]
      }
    }, { immediate: true })

    watch(state, () => {
      debug('state changed', state)
      router.replace({ query: state })
    })
  } else {
    debug('initialize reactive search params based on window.location.search')
    function updateState () {
      debug('update state based on window.location.search', window.location.search)
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
      debug('update url based on state', state)
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
  }

  return state
}

// uses pattern for SSR friendly plugin/composable, cf https://antfu.me/posts/composable-vue-vueday-2021#shared-state-ssr-friendly
export const reactiveSearchParamsKey = Symbol('reactiveSearchParams')

/**
 * @param {import('vue-router').Router} [router]
 */
export function createReactiveSearchParams (router) {
  // @ts-ignore
  if (!import.meta.env?.SSR && !router) {
    try {
      // nuxt 3 way of reading router
      // @ts-ignore
      // eslint-disable-next-line no-undef
      router = __unctx__.get('nuxt-app').use().$router
      debug('using nuxt 3 router implicitly')
    } catch (e) {
      // nothing to do
    }
  }

  const reactiveSearchParams = getReactiveSearchParams(router)
  return { install (/** @type {import('vue').App} */app) { app.provide(reactiveSearchParamsKey, reactiveSearchParams) } }
}
export function useReactiveSearchParams () {
  const reactiveSearchParams = inject(reactiveSearchParamsKey)
  if (!reactiveSearchParams) throw new Error('useReactiveSearchParams requires using the plugin createReactiveSearchParams')
  return /** @type {ReturnType<typeof getReactiveSearchParams>} */(reactiveSearchParams)
}
export default useReactiveSearchParams
