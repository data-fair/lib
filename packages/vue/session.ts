import { type IncomingMessage } from 'node:http'
import { type Ref, type ComputedRef, type App, shallowReadonly } from 'vue'
import { type RouteLocation } from 'vue-router'
import { FetchError, type fetch } from 'ofetch'
import { type SessionState, type SessionStateAuthenticated, type User } from '@data-fair/lib-common-types/session/index.js'
import { reactive, computed, watch, inject, ref, shallowRef, readonly } from 'vue'
import { ofetch } from 'ofetch'
import { jwtDecode } from 'jwt-decode'
import cookiesModule from 'universal-cookie'
import Debug from 'debug'
import inIframe from '@data-fair/lib-utils/in-iframe.js'

export * from '@data-fair/lib-common-types/session/index.js'

const Cookies = cookiesModule as unknown as typeof cookiesModule.default

interface GenericCookies {
  get: (key: string) => string | undefined
  set: (key: string, value: string, options?: Record<string, any>) => void
  remove: (key: string) => void
}

export interface SessionOptions {
  sitePath: string
  directoryUrl: string
  defaultLang: string
  route?: RouteLocation
  logoutRedirectUrl?: string
  req?: IncomingMessage
  cookies?: GenericCookies
  customFetch?: typeof fetch
  siteInfo?: boolean
}

export interface Colors {
  background: string
  'on-background': string
  surface: string
  'on-surface': string
  primary: string
  'on-primary': string
  'text-primary': string
  secondary: string
  'on-secondary': string
  'text-secondary': string
  error: string
  'on-error': string
  info: string
  'on-info': string
  success: string
  'on-success': string
  warning: string
  'on-warning': string
  admin: string
  'on-admin': string
}

interface FullSiteInfo {
  main?: boolean
  theme: {
    logo?: string
    colors: Colors
    dark: boolean
    darkColors?: Colors
    hc: boolean
    hcColors?: Colors
    hcDark: boolean
    hcDarkColors?: Colors
  }
}

export interface SiteInfo {
  main?: boolean
  isAccountMain?: boolean
  authMode: string
  authOnlyOtherSite?: string
  logo?: string
  dark?: boolean
  colors: Colors
}

type Theme = 'default' | 'dark' | 'hc' | 'hc-dark'

export interface Session {
  state: SessionState
  user: ComputedRef<SessionState['user']>
  organization: ComputedRef<SessionState['organization']>
  account: ComputedRef<SessionState['account']>
  accountRole: ComputedRef<SessionState['accountRole']>
  siteRole: ComputedRef<SessionState['siteRole']>
  lang: ComputedRef<SessionState['lang']>
  theme: Ref<null | Theme>
  site: Ref<SiteInfo | null>
  fullSite: Ref<FullSiteInfo | null>
  loginUrl: (redirect?: string, extraParams?: Record<string, string>, immediateRedirect?: true) => string
  login: (redirect?: string, extraParams?: Record<string, string>, immediateRedirect?: true) => void
  logout: (redirect?: string) => Promise<void>
  switchOrganization: (org: string | null, dep?: string, role?: string, updateState?: boolean) => void
  setAdminMode: (adminMode: boolean, redirect?: string) => Promise<void>
  asAdmin: (user: any | null) => Promise<void>
  cancelDeletion: () => Promise<void>
  keepalive: () => Promise<void>
  refreshSiteInfo: () => Promise<void>
  switchTheme: (value: Theme) => void
  switchLang: (value: string) => void
  topLocation: Ref<Location | undefined>
  options: SessionOptions
}

export type SessionAuthenticated = Omit<Session, 'state' | 'user' | 'account' | 'accountRole'> & {
  state: SessionStateAuthenticated
  user: ComputedRef<SessionStateAuthenticated['user']>
  account: ComputedRef<SessionStateAuthenticated['account']>
  accountRole: ComputedRef<SessionStateAuthenticated['accountRole']>
}

const debug = Debug('session')
debug.log = console.log.bind(console)

function getDefaultTheme (site: FullSiteInfo): Theme {
  // see https://www.scottohara.me/blog/2021/10/01/detect-high-contrast-and-dark-modes.html
  const preferDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  const preferHC = window.matchMedia && window.matchMedia('(forced-colors: active)').matches
  if (site.theme.hcDark && preferDark && preferHC) return 'hc-dark'
  if (site.theme.hc && preferHC) return 'hc'
  if (site.theme.dark && preferDark) return 'dark'
  return 'default'
}

function jwtDecodeAlive (jwt: string | null): User | undefined {
  if (!jwt) return
  const decoded = jwtDecode(jwt) as any
  if (!decoded) return
  const now = Math.ceil(Date.now().valueOf() / 1000)
  if (typeof decoded.exp !== 'undefined' && decoded.exp < now) {
    // token expired
    return
  }
  if (typeof decoded.nbf !== 'undefined' && decoded.nbf > now) {
    console.warn(`token not yet valid: ${decoded.nbf}>${now}, ${JSON.stringify(decoded)}`)
    // do not return here, this is probably a false flag due to a slightly mismatched clock
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

const defaultOptions = { directoryUrl: '/simple-directory', sitePath: '', defaultLang: 'fr' }

export async function getSession (initOptions: Partial<SessionOptions>): Promise<Session> {
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
  const fullSite = shallowRef<FullSiteInfo | null>(null)
  const site = shallowRef<SiteInfo | null>(null)
  const theme = ref<Theme | null>(null)

  // cookies are the source of truth and this information is transformed into the state reactive object
  const cookies = initOptions?.cookies ?? new Cookies(options.req?.headers.cookie)
  const readState = () => {
    theme.value = cookies.get('theme') ?? null

    const langCookie = cookies.get('i18n_lang')
    state.lang = langCookie ?? options.defaultLang

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
    const switchedRole = cookies.get('id_token_role')
    if (organizationId) {
      state.organization = state.user.organizations.find(o => {
        if (o.id !== organizationId) return false
        if (departmentId && departmentId !== o.department) return false
        if (switchedRole && switchedRole !== o.role) return false
        return true
      })
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

    if (state.user?.siteOwner) {
      if (state.user.siteOwner.type === 'user' && state.user.siteOwner.id === state.user.id) {
        state.siteRole = 'admin'
      }
      if (state.user.siteOwner.type === 'organization' && state.user.siteOwner.id === state.organization?.id) {
        state.siteRole = state.organization.role
      }
    }
  }
  readState()
  debug('initial state', state)

  if (!ssr) {
    // sessionData is also stored in localStorage as a way to access it in simpler pages that do not require use-session
    // and in order to listen to storage event from other contexts and sync session info accross windows and tabs
    if (!ssr) {
      const storageListener = (event: StorageEvent) => {
        if (event.key === 'sd-session' + options.sitePath) readState()
      }
      window.addEventListener('storage', storageListener)
    }

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
    cookies.remove('id_token_role')
    goTo(redirect ?? options.logoutRedirectUrl ?? null)
  }

  const switchOrganization = (org: string | null, dep?: string, role?: string, updateState = true) => {
    const cookieOpts = { path: cookiesPath }
    if (org) cookies.set('id_token_org', org, cookieOpts)
    else cookies.remove('id_token_org', cookieOpts)
    if (dep) cookies.set('id_token_dep', dep, cookieOpts)
    else cookies.remove('id_token_dep', cookieOpts)
    if (role) cookies.set('id_token_role', role, cookieOpts)
    else cookies.remove('id_token_role', cookieOpts)
    if (updateState) readState()
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
    goTo(null)
  }

  const cancelDeletion = async () => {
    if (state.user == null) return
    await customFetch(`${options.directoryUrl}/api/users/${state.user.id}`, { method: 'PATCH', body: ({ plannedDeletion: null }) as any })
    readState()
  }

  const switchLang = (value: string) => {
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    cookies.set('i18n_lang', value, { maxAge, path: cookiesPath })
    goTo(null)
  }

  const switchTheme = (value: Theme) => {
    const maxAge = 60 * 60 * 24 * 365 // 1 year
    cookies.set('theme', value, { maxAge, path: cookiesPath })
    goTo(null)
  }

  const keepalive = async () => {
    if (state.user == null) return
    if (!ssr) {
      window.localStorage.setItem('sd-keepalive' + options.sitePath, `${new Date().getTime()}`)
    }
    try {
      await customFetch(`${options.directoryUrl}/api/auth/keepalive`, { method: 'POST' })
    } catch (err) {
      if (err instanceof FetchError && err.statusCode === 401) {
        console.warn('session was expired or deleted server side')
      } else {
        throw err
      }
      readState()
    }
  }

  const refreshSiteInfo = async () => {
    const siteInfo = await customFetch(`${options.directoryUrl}/api/sites/_public`) ?? null
    if (siteInfo.theme) {
      fullSite.value = siteInfo
      const partialSite: SiteInfo = {
        main: siteInfo.main,
        isAccountMain: siteInfo.isAccountMain,
        logo: siteInfo.theme.logo,
        colors: siteInfo.theme.colors,
        authMode: siteInfo.authMode,
        authOnlyOtherSite: siteInfo.authOnlyOtherSite
      }
      if (theme.value == null) theme.value = getDefaultTheme(siteInfo)
      if (theme.value === 'hc') partialSite.colors = siteInfo.theme.hcColors
      if (theme.value === 'dark') {
        partialSite.colors = siteInfo.theme.darkColors
        partialSite.dark = true
      }
      if (theme.value === 'hc-dark') {
        partialSite.colors = siteInfo.theme.hcDarkColors
        partialSite.dark = true
      }
      site.value = partialSite
    } else {
      site.value = siteInfo
    }
  }

  if (options.siteInfo) await refreshSiteInfo()

  // immediately performs a keepalive, but only on top windows (not iframes or popups)
  // and only if it was not done very recently (maybe from a refreshed page next to this one)
  // also run an auto-refresh loop
  if (!ssr && !inIframe && !('triggerCapture' in window)) {
    const lastKeepalive = window.localStorage.getItem('sd-keepalive' + options.sitePath)
    // check cookies.get('id_token') not state.user so that we do a keepalive on expired id tokens
    if (cookies.get('id_token') && (!lastKeepalive || (new Date().getTime() - Number(lastKeepalive)) > 10000)) {
      await keepalive()
    }

    const refreshLoopDelay = 10 * 60 * 1000 // 10 minutes
    setInterval(() => {
      const lastKeepalive = window.localStorage.getItem('sd-keepalive' + options.sitePath)
      if (!lastKeepalive || (new Date().getTime() - Number(lastKeepalive)) > refreshLoopDelay / 2) {
        keepalive().catch(err => console.error(err))
      }
    }, refreshLoopDelay)
  }

  const session: Session = {
    state,
    organization: computed(() => state.organization),
    user: computed(() => state.user),
    account: computed(() => state.account),
    accountRole: computed(() => state.accountRole),
    siteRole: computed(() => state.siteRole),
    lang: computed(() => state.lang),
    theme: readonly(theme),
    site: shallowReadonly(site),
    fullSite: shallowReadonly(fullSite),
    loginUrl,
    login,
    logout,
    switchOrganization,
    setAdminMode,
    asAdmin,
    cancelDeletion,
    keepalive,
    refreshSiteInfo,
    switchTheme,
    switchLang,
    topLocation,
    options
  }

  return session
}

// uses pattern for SSR friendly plugin/composable, cf https://antfu.me/posts/composable-vue-vueday-2021#shared-state-ssr-friendly
export const sessionKey = Symbol('session')
export async function createSession (initOptions: Partial<SessionOptions>) {
  const session = await getSession(initOptions)
  return {
    ...session,
    install (app: App) { app.provide(sessionKey, session) },
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
