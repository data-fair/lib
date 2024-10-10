// inspired by useUrlSearchParams (https://github.com/vueuse/vueuse/blob/main/packages/core/useUrlSearchParams/index.ts)
// but even simpler, without array values, always in history mode, and shared in a app plugin

import type { App } from 'vue'
import type { Router } from 'vue-router'
import { reactive, watch, inject, computed } from 'vue'
import Debug from 'debug'

const debug = Debug('reactive-search-params')
debug.log = console.log.bind(console)

const applySearchParams = (state: Record<string, string>, queryParams: Record<string, string | null | (string | null)[]>) => {
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

export function getReactiveSearchParams (router?: Router): Record<string, string> {
  // @ts-ignore
  if (!import.meta.env?.SSR && !router) {
    try {
      // nuxt 3 way of reading router
      // @ts-ignore

      router = __unctx__.get('nuxt-app').use().$router
      debug('using nuxt 3 router implicitly')
    } catch (e) {
      // nothing to do
    }
  }

  const state = reactive({} as Record<string, string>)

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

export function createReactiveSearchParams (router?: Router) {
  const reactiveSearchParams = getReactiveSearchParams(router)
  return {
    install (app: App) { app.provide(reactiveSearchParamsKey, reactiveSearchParams) },
    state: reactiveSearchParams
  }
}
export function useReactiveSearchParams () {
  const reactiveSearchParams = inject(reactiveSearchParamsKey)
  if (!reactiveSearchParams) throw new Error('useReactiveSearchParams requires using the plugin createReactiveSearchParams')
  return reactiveSearchParams as ReturnType<typeof getReactiveSearchParams>
}

export const useStringSearchParam = (key: string, options: string | { default?: string } = {}) => {
  const reactiveSearchParams = useReactiveSearchParams()
  const defaultValue = typeof options === 'string' ? options : (options.default ?? '')
  return computed({
    get: () => reactiveSearchParams[key] ?? defaultValue,
    set: (value) => {
      if (value === defaultValue) delete reactiveSearchParams[key]
      else reactiveSearchParams[key] = value
    }
  })
}

export const useBooleanSearchParam = (key: string, options: boolean | { default?: boolean, strings?: [string, string] } = {}) => {
  const reactiveSearchParams = useReactiveSearchParams()
  const defaultValue = typeof options === 'boolean' ? options : (options.default ?? false)
  const strings = (typeof options !== 'boolean' && options.strings) || ['1', '0']
  return computed({
    get: () => key in reactiveSearchParams ? reactiveSearchParams[key] === strings[0] : defaultValue,
    set: (value) => {
      if (value === defaultValue) delete reactiveSearchParams[key]
      else reactiveSearchParams[key] = value ? strings[0] : strings[1]
    }
  })
}

export const useNumberSearchParam = (key: string) => {
  const reactiveSearchParams = useReactiveSearchParams()
  return computed({
    get: () => {
      if (key in reactiveSearchParams) {
        const value = Number(reactiveSearchParams[key])
        if (!isNaN(value)) return value
      }
      return null
    },
    set: (value) => {
      if (value === null) delete reactiveSearchParams[key]
      else reactiveSearchParams[key] = '' + value
    }
  })
}

export const useStringsArraySearchParam = (key: string, options: 'csv' | { style?: 'csv' } = {}) => {
  const reactiveSearchParams = useReactiveSearchParams()
  // const style = typeof options === 'string' ? options : (options.style ?? 'csv')
  return computed({
    get: () => reactiveSearchParams[key] ? reactiveSearchParams[key]?.split(',') : [],
    set: (value) => {
      if (value.length === 0) delete reactiveSearchParams[key]
      else reactiveSearchParams[key] = value.join(',')
    }
  })
}

export default useReactiveSearchParams
