import { type IncomingMessage } from 'node:http'
import { type Ref } from 'vue'
import { type RouteLocation } from 'vue-router'
import { type SessionState } from '../shared/session/state/types.js'

export interface SessionOptions {
  route: RouteLocation
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
