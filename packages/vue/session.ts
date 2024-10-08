import { type IncomingMessage } from 'node:http'
import { type Ref, App } from 'vue'
import { type RouteLocation } from 'vue-router'
import { type fetch } from 'ofetch'
import { type SessionState, type SessionStateAuthenticated, type User } from '@data-fair/lib-common-types/session/index.js'
import { reactive, computed, watch, inject } from 'vue'
import { ofetch } from 'ofetch'
import { jwtDecode } from 'jwt-decode'
import cookiesModule from 'universal-cookie'
import Debug from 'debug'

export type { SessionState, SessionStateAuthenticated, User, Account } from '@data-fair/lib-common-types/session/index.js'

const Cookies = cookiesModule as unknown as typeof cookiesModule.default

interface GenericCookies {
  get: (key: string) => string | undefined
  set: (key: string, value: string, options?: Record<string, any>) => void
  remove: (key: string) => void
}

export interface SessionOptions {
  route?: RouteLocation
  sitePath?: string
  directoryUrl?: string
  logoutRedirectUrl?: string
  req?: IncomingMessage
  cookies?: GenericCookies
  customFetch?: typeof fetch
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

export type SessionAuthenticated = Session & {
  state: SessionStateAuthenticated
}

const debug = Debug('session')
debug.log = console.log.bind(console)

function jwtDecodeAlive (jwt: string | null): User | undefined {
  if (!jwt) return
  const decoded = jwtDecode(jwt) as any
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

const defaultOptions = { directoryUrl: '/simple-directory', sitePath: '' }

export async function getSession (initOptions: SessionOptions): Promise<Session> {
  const options = { ...defaultOptions, ...initOptions }
  const cookiesPath = options.sitePath + '/'
  debug(`init directoryUrl=${options.directoryUrl}, cookiesPath=${cookiesPath}`)
  const ssr = !!options.req
  if (ssr) debug('run in SSR context')

  const customFetch = initOptions?.customFetch ?? ofetch

  // use vue-router to detect page change and maintain a reference to the current page location
  // top page if we are in iframe context
  const topLocation = computed(() => {
    if (ssr) return undefined

    if (options.route?.fullPath) { /* empty */ } // adds reactivity
    const location = getTopLocation()
    debug('update location based on route change', location)
    return location
  })

  // the core state of the session that is filled by reading cookies
  const state = reactive({} as SessionState)

  // cookies are the source of truth and this information is transformed into the state reactive object
  const cookies = initOptions?.cookies ?? new Cookies(options.req?.headers.cookie)
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

    // this is to prevent null values that are put by SD versions that do not strictly respect their schema
    for (const org of user.organizations) {
      if (!org.department) {
        delete org.department
        delete org.departmentName
      }
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
    if (state.organization) {
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
    // sessionData is also stored in localStorage as a way to access it in simpler pages that do not require use-session
    // and in order to listen to storage event from other contexts and sync session info accross windows and tabs
    const storageListener = (event: StorageEvent) => {
      if (event.key === 'sd-session' + options.sitePath) readCookies()
    }
    window.addEventListener('storage', storageListener)
    // we cannot use onUnmounted here or we get warnings "onUnmounted is called when there is no active component instance to be associated with. "
    // TODO: should we have another cleanup mechanism ?
    // onUnmounted(() => { window.removeEventListener('storage', storageListener) })

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
        window.localStorage.setItem('sd-session' + options.sitePath, JSON.stringify(state))
      }
      debug('state changed', state)
    })
  }

  // login can be performed as a simple link (please use target=top) or as a function
  function loginUrl (redirect?: string, extraParams: Record<string, string> = {}, immediateRedirect = true): string {
    // login can also be used to redirect user immediately if he is already logged
    if (redirect && state.user && immediateRedirect) return redirect
    if (!redirect && topLocation.value) redirect = topLocation.value.href
    let url = `${options.directoryUrl}/login?redirect=${encodeURIComponent(redirect ?? '')}`
    Object.keys(extraParams).filter(key => ![null, undefined, ''].includes(extraParams[key])).forEach((key) => {
      url += `&${key}=${encodeURIComponent(extraParams[key])}`
    })
    return url
  }
  const login = (redirect?: string, extraParams: Record<string, string> = {}, immediateRedirect = true) => {
    goTo(loginUrl(redirect, extraParams, immediateRedirect))
  }
  const logout = async (redirect?: string) => {
    await customFetch(`${options.directoryUrl}/api/auth`, { method: 'DELETE' })
    // sometimes server side cookie deletion is not applied immediately in browser local js context
    // so we do it here to
    cookies.remove('id_token')
    cookies.remove('id_token_org')
    cookies.remove('id_token_dep')
    goTo(redirect ?? options.logoutRedirectUrl ?? null)
  }

  const switchOrganization = (org: string | null, dep?: string) => {
    if (org) cookies.set('id_token_org', org, { path: cookiesPath })
    else cookies.remove('id_token_org')
    if (dep) cookies.set('id_token_dep', dep, { path: cookiesPath })
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
      await customFetch(`${options.directoryUrl}/api/auth/adminmode`, { method: 'DELETE' })
      goTo(redirect ?? null)
    }
  }

  const asAdmin = async (user: any | null) => {
    if (user) {
      await customFetch(`${options.directoryUrl}/api/auth/asadmin`, { method: 'POST', body: user })
    } else {
      await customFetch(`${options.directoryUrl}/api/auth/asadmin`, { method: 'DELETE' })
    }
    readCookies()
  }

  const cancelDeletion = async () => {
    if (state.user == null) return
    await customFetch(`${options.directoryUrl}/api/users/${state.user.id}`, { method: 'PATCH', body: ({ plannedDeletion: null }) as any })
    readCookies()
  }

  const switchDark = (value: boolean) => {
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    cookies.set('theme_dark', `${value}`, { maxAge, path: cookiesPath })
    readCookies()
  }

  const switchLang = (value: string) => {
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    cookies.set('i18n_lang', value, { maxAge, path: cookiesPath })
    readCookies()
  }

  const keepalive = async () => {
    if (state.user == null) return
    window.localStorage.setItem('sd-keepalive' + options.sitePath, `${new Date().getTime()}`)
    await customFetch(`${options.directoryUrl}/api/auth/keepalive`, { method: 'POST' })
    readCookies()
  }

  // immediately performs a keepalive, but only on top windows (not iframes or popups)
  // and only if it was not done very recently (maybe from a refreshed page next to this one)
  if (!ssr && window.top === window.self) {
    const lastKeepalive = window.localStorage.getItem('sd-keepalive' + options.sitePath)
    if (!lastKeepalive || (new Date().getTime() - Number(lastKeepalive)) > 10000) {
      await keepalive()
    }
  }

  const session: Session = {
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

  return session
}

// uses pattern for SSR friendly plugin/composable, cf https://antfu.me/posts/composable-vue-vueday-2021#shared-state-ssr-friendly
export const sessionKey = Symbol('session')
export async function createSession (initOptions: SessionOptions) {
  const session = await getSession(initOptions)
  return {
    install (app: App) { app.provide(sessionKey, session) },
    value: session
  }
}
export function useSession () {
  const session = inject(sessionKey)
  if (!session) throw new Error('useSession requires using the plugin createSession')
  return session as Session
}
export function useSessionAuthenticated (errorBuilder?: () => any) {
  const session = useSession()
  if (!session.state.user) {
    if (errorBuilder) throw errorBuilder()
    else throw new Error('useSessionAuthenticated requires a logged in user')
  }
  return session as SessionAuthenticated
}
export default useSession
