import { type IncomingMessage } from 'http'
import { type Ref, onUnmounted, computed, watch } from 'vue'
import { useCookies, createCookies } from '@vueuse/integrations/useCookies'
import { useRoute } from 'vue-router'
import { ofetch } from 'ofetch'
import jwtDecode from 'jwt-decode'
import Debug from 'debug'
import { type SessionState, type User } from '../types/session-state'

const debug = Debug('session')
debug.log = console.log.bind(console)

export interface SessionOptions {
  directoryUrl?: string
  logoutRedirectUrl?: string
  req?: IncomingMessage
}

export interface Session {
  state: SessionState
  loginUrl: (redirect?: string, extraParams?: Record<string, string>, immediateRedirect?: true) => string
  login: (redirect?: string, extraParams?: Record<string, string>, immediateRedirect?: true) => void
  logout: (redirect?: string) => Promise<void>
  switchOrganization: (org: string | null, dep?: string) => void
  setAdminMode: (adminMode: boolean, redirect?: string) => Promise<void>
  asAdmin: (user: any | null) => Promise<void>
  cancelDeletion: () => Promise<void>
  keepalive: () => Promise<void>
  switchDark: (value: boolean) => void
  switchLang: (value: string) => void
  topLocation: Ref<Location | undefined>
  options: SessionOptions
}

const jwtDecodeAlive = (jwt: string | null) => {
  if (!jwt) return
  const decoded = jwtDecode<any>(jwt)
  if (!decoded) return
  const now = Math.ceil(Date.now().valueOf() / 1000)
  if (typeof decoded.exp !== 'undefined' && decoded.exp < now) {
    console.error(`token expired: ${decoded.exp}<${now},  ${JSON.stringify(decoded)}`)
    return
  }
  if (typeof decoded.nbf !== 'undefined' && decoded.nbf > now) {
    console.warn(`token not yet valid: ${decoded.nbf}>${now}, ${JSON.stringify(decoded)}`)
    // do not return null here, this is probably a false flag due to a slightly mismatched clock
    // return null
  }
  return decoded as User
}

const getTopLocation = () => {
  try {
    return window.top ? window.top.location : window.location
  } catch (err) {
    return window.location
  }
}

const goTo = (url: string | null) => {
  const topLocation = getTopLocation()
  if (topLocation == null) {
    throw new TypeError('session.goTo was called without access to the window object or its location')
  }
  if (url) topLocation.href = url
  else topLocation.reload()
}

export const defaultOptions = { directoryUrl: '/simple-directory' }

export const useSession = async (initOptions?: SessionOptions) => {
  const options = { ...defaultOptions, ...initOptions }
  debug(`init directoryUrl=${options.directoryUrl}`)
  const ssr = !!options.req
  if (ssr) debug('run in SSR context')

  // use vue-router to detect page change and maintain a reference to the current page location
  // top page if we are in iframe context
  const route = useRoute()
  const topLocation = computed(() => {
    if (!ssr) return undefined
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    route // adds reactivity
    return getTopLocation()
  })

  // the core state of the session that is filled by reading cookies
  const state: SessionState = {}

  // cookies are the source of truth and this information is transformed into the state reactive object
  const cookies = (options.req ? createCookies(options.req) : useCookies)(['id_token', 'id_token_org'], { doNotParse: true })
  const readCookies = () => {
    const darkCookie = cookies.get('theme_dark')
    state.dark = darkCookie === '1' || darkCookie === 'true'

    const langCookie = cookies.get('i18n_lang')
    if (langCookie) state.lang = langCookie
    else delete state.lang

    const idToken = cookies.get('id_token')
    const user = jwtDecodeAlive(idToken)

    if (!user) {
      delete state.user
      delete state.organization
      delete state.account
      delete state.accountRole
      return
    }
    state.user = user
    const organizationId = cookies.get('id_token_org')
    const departmentId = cookies.get('id_token_dep')
    if (organizationId) {
      if (departmentId) {
        state.organization = state.user.organizations.find(o => o.id === organizationId && o.department === departmentId)
      } else {
        state.organization = state.user.organizations.find(o => o.id === organizationId)
      }
    } else {
      delete state.organization
    }
    if (state.organization != null) {
      state.account = {
        type: 'organization',
        id: state.organization.id,
        name: state.organization.name,
        department: state.organization.department,
        departmentName: state.organization.departmentName
      }
      state.accountRole = state.organization.role
    } else {
      state.account = {
        type: 'user',
        id: state.user.id,
        name: state.user.name
      }
      state.accountRole = 'admin'
    }
  }
  readCookies()
  debug('initial state', state)

  if (!ssr) {
    // sessionData is also stored in localStorage as a way to access it in simpler pages that do not require sd-vue
    // and in order to listen to storage event from other contexts and sync session info accross windows and tabs
    const storageListener = (event: StorageEvent) => {
      if (event.key === 'sd-session') readCookies()
    }
    window.addEventListener('storage', storageListener)
    onUnmounted(() => { window.removeEventListener('storage', storageListener) })

    // trigger some full page refresh when some key session elements are changed
    // the danger of simply using reactivity is too high, data must be re-fetched, etc.
    watch(() => state.account, (account, oldAccount) => {
      if (account?.type !== oldAccount?.type || account?.id !== oldAccount?.id || account?.department !== oldAccount?.department) {
        goTo(null)
      }
    })
    watch(() => state.lang, () => {
      goTo(null)
    })
    watch(() => state.dark, () => {
      goTo(null)
    })
    watch(state, (state) => {
      if (!ssr) {
        window.localStorage.setItem('sd-session', JSON.stringify(state))
      }
      debug('state changed', state)
    })
  }

  // login can be performed as a simple link (please use target=top) or as a function
  const loginUrl = (redirect?: string, extraParams: Record<string, string> = {}, immediateRedirect?: true) => {
    // login can also be used to redirect user immediately if he is already logged
    if (redirect && state.user && immediateRedirect) return redirect
    if (!redirect && topLocation.value) redirect = topLocation.value.href
    let url = `${options.directoryUrl}/login?redirect=${encodeURIComponent(redirect ?? '')}`
    Object.keys(extraParams).filter(key => ![null, undefined, ''].includes(extraParams[key])).forEach((key) => {
      url += `&${key}=${encodeURIComponent(extraParams[key])}`
    })
    return url
  }
  const login = (redirect?: string, extraParams: Record<string, string> = {}, immediateRedirect?: true) => {
    goTo(loginUrl(redirect, extraParams, immediateRedirect))
  }
  const logout = async (redirect?: string) => {
    await ofetch(`${options.directoryUrl}/api/auth`, { method: 'DELETE' })
    // sometimes server side cookie deletion is not applied immediately in browser local js context
    // so we do it here to
    cookies.remove('id_token')
    cookies.remove('id_token_org')
    cookies.remove('id_token_dep')
    goTo(redirect ?? options.logoutRedirectUrl ?? null)
  }

  const switchOrganization = (org: string | null, dep?: string) => {
    if (org) cookies.set('id_token_org', org, { path: '/' })
    else cookies.remove('id_token_org')
    if (org) cookies.set('id_token_dep', dep, { path: '/' })
    else cookies.remove('id_token_dep')
    readCookies()
  }

  const setAdminMode = async (adminMode: boolean, redirect?: string) => {
    if (adminMode) {
      const params: Record<string, string> = { adminMode: 'true' }
      if (state.user != null) params.email = state.user.email
      const url = loginUrl(redirect, params, true)
      goTo(url)
    } else {
      await ofetch(`${options.directoryUrl}/api/auth/adminmode`, { method: 'DELETE' })
      goTo(redirect ?? null)
    }
  }

  const asAdmin = async (user: any | null) => {
    if (user) {
      await fetch(`${options.directoryUrl}/api/auth/asadmin`, { method: 'POST', body: user })
    } else {
      await fetch(`${options.directoryUrl}/api/auth/asadmin`, { method: 'DELETE' })
    }
    readCookies()
  }

  const cancelDeletion = async () => {
    if (state.user == null) return
    await fetch(`${options.directoryUrl}/api/users/${state.user.id}`, { method: 'PATCH', body: <any>{ plannedDeletion: null } })
    readCookies()
  }

  const switchDark = (value: boolean) => {
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    cookies.set('theme_dark', `${value}`, { maxAge, path: '/' })
    readCookies()
  }

  const switchLang = (value: string) => {
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    cookies.set('i18n_lang', value, { maxAge, path: '/' })
    readCookies()
  }

  const keepalive = async () => {
    if (state.user == null) return
    await fetch(`${options.directoryUrl}/api/auth/keepalive`, { method: 'POST' })
    readCookies()
  }

  // immediately performs a keepalive, but only on top windows (not iframes or popups)
  // and only if it was not done very recently (maybe from a refreshed page next to this one)
  if (!ssr && window.top === window.self) {
    const lastKeepalive = window.localStorage.getItem('sd-keepalive')
    if (!lastKeepalive || (new Date().getTime() - Number(lastKeepalive)) < 10000) {
      await keepalive()
    }
  }

  return <Session>{
    state,
    loginUrl,
    login,
    logout,
    switchOrganization,
    setAdminMode,
    asAdmin,
    cancelDeletion,
    keepalive,
    switchDark,
    switchLang,
    topLocation,
    options
  }
}
