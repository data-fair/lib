import { type IncomingMessage } from 'node:http'
import { type Ref } from 'vue'
import { type RouteLocation } from 'vue-router'
import { type fetch } from 'ofetch'
import { type SessionState, type SessionStateAuthenticated } from '../shared/session/index.js'

interface Cookies {
  get: (key: string) => string | undefined
  set: (key: string, value: string, options?: Record<string, any>) => void
  remove: (key: string) => void
}

export interface SessionOptions {
  route: RouteLocation
  directoryUrl?: string
  logoutRedirectUrl?: string
  req?: IncomingMessage
  cookies?: Cookies
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
