// inspired by useUrlSearchParams (https://github.com/vueuse/vueuse/blob/main/packages/core/useUrlSearchParams/index.ts)
// but even simpler, without array values, always in history mode, and shared in a app plugin

import { reactive, watch, inject, computed } from 'vue'
import Debug from 'debug'

const debug = Debug('reactive-search-params')
debug.log = console.log.bind(console)

/**
 * @param {Record<string, string>} state
 * @param {Record<string, string | null | (string | null)[]>} queryParams
 */
const applySearchParams = (state, queryParams) => {
  const unusedKeys = new Set(Object.keys(state))
  for (const key of Object.keys(queryParams)) {
    const value = queryParams[key]
    if (typeof value === 'string') {
      state[key] = value
      unusedKeys.delete(key)
    }
    if (Array.isArray(value)) {
      const lastValue = value[value.length - 1]
      if (typeof lastValue === 'string') {
        state[key] = lastValue
        unusedKeys.delete(key)
      }
    }
  }
  for (const unusedKey of unusedKeys) {
    delete state[unusedKey]
  }
}

/**
 * @param {import('vue-router').Router} [router]
 * @returns {Record<string, string>}
 */
export function getReactiveSearchParams (router) {
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

  const state = reactive(/** @type {Record<string, string>} */({}))

  // 2 modes, 1 based on vue router, 1 based on window.location.search
  if (router) {
    debug('initialize reactive search params based on vue router')
    watch(router.currentRoute, (route) => {
      debug('route.query changed', route.query)
      applySearchParams(state, route.query)
    }, { immediate: true })

    watch(state, () => {
      debug('state changed', state)
      router?.replace({ query: state })
    })
  } else {
    debug('initialize reactive search params based on window.location.search')
    window.addEventListener('popstate', () => {
      debug('update state based on window.location.search', window.location.search)
      applySearchParams(state, Object.fromEntries(new URLSearchParams(window.location.search)))
    })
    applySearchParams(state, Object.fromEntries(new URLSearchParams(window.location.search)))

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
  const reactiveSearchParams = getReactiveSearchParams(router)
  return { install (/** @type {import('vue').App} */app) { app.provide(reactiveSearchParamsKey, reactiveSearchParams) } }
}
export function useReactiveSearchParams () {
  const reactiveSearchParams = inject(reactiveSearchParamsKey)
  if (!reactiveSearchParams) throw new Error('useReactiveSearchParams requires using the plugin createReactiveSearchParams')
  return /** @type {ReturnType<typeof getReactiveSearchParams>} */(reactiveSearchParams)
}

/**
 * @param {Record<string, string>} state
 * @param {string} key
 * @param {string | {default?: string}} options
 */
export const stringSearchParam = (state, key, options = {}) => {
  const defaultValue = typeof options === 'string' ? options : (options.default ?? '')
  return computed({
    get: () => state[key] ?? defaultValue,
    set: (value) => {
      if (value === defaultValue) delete state[key]
      else state[key] = value
    }
  })
}

/**
 * @param {Record<string, string>} state
 * @param {string} key
 * @param {boolean | {default?: boolean, strings?: [string, string]}} options
 */
export const booleanSearchParam = (state, key, options = {}) => {
  const defaultValue = typeof options === 'boolean' ? options : (options.default ?? false)
  const strings = (typeof options !== 'boolean' && options.strings) || ['1', '0']
  return computed({
    get: () => key in state ? state[key] === strings[0] : defaultValue,
    set: (value) => {
      if (value === defaultValue) delete state[key]
      else state[key] = value ? strings[0] : strings[1]
    }
  })
}

/**
 * @param {Record<string, string>} state
 * @param {string} key
 * @param {'csv' | {style?: 'csv'}} options
 */
export const stringArrayParam = (state, key, options = {}) => {
  // const style = typeof options === 'string' ? options : (options.style ?? 'csv')
  return computed({
    get: () => state[key] ? state[key]?.split(',') : [],
    set: (value) => {
      if (value.length === 0) delete state[key]
      else state[key] = value.join(',')
    }
  })
}

export default useReactiveSearchParams
