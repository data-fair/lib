import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Account, SessionState, SessionStateAuthenticated, User } from '@data-fair/lib-common-types/session/index.js'
import type { Request, Response, RequestHandler } from 'express'
import cookie from 'cookie'
import { assertAdminMode, assertAuthenticated, assertScope } from '@data-fair/lib-common-types/session/index.js'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import { reqSitePathSafe, reqIp } from '@data-fair/lib-express'
import { SessionHandler } from '@data-fair/lib-node/session.js'

export * from '@data-fair/lib-common-types/session/index.js'

export type ReqSession = Request & { session?: SessionState }

export type IncomingMessageSession = IncomingMessage & { session?: SessionState }

const sessionKey = Symbol('session')
const sessionMiddlewareKey = Symbol('session-middleware')
const scopeCheckedKey = Symbol('scope-checked')

// declare that the route checked the scopes of the session (or accepts any scope)
export function markScopeChecked (req: Request | IncomingMessage) {
  // @ts-ignore
  req[scopeCheckedKey] = true
}

// a scope-restricted session is only readable by a route that checked a scope first: a route
// that forgets to is closed, not open with the full role of the identity
function assertRouteCheckedScope (req: Request | IncomingMessage, sessionState: SessionState) {
  // @ts-ignore
  if (sessionState.scopes && !req[scopeCheckedKey]) {
    throw httpError(403, 'this route does not check scopes, scope-restricted sessions are refused')
  }
}

export class Session extends SessionHandler {
  private onlyDecode?: (req: Request | IncomingMessage) => boolean

  init (directoryUrl = 'http://simple-directory:8080', defaultLang?: string, onlyDecode?: (req: Request | IncomingMessage) => boolean, options: { scopeAware?: boolean } = {}) {
    this.initJWKS(directoryUrl)
    if (defaultLang) this.defaultLang = defaultLang
    this.onlyDecode = onlyDecode
    this.scopeAware = !!options.scopeAware
  }

  async req (req: Request | IncomingMessage, res?: Response | ServerResponse): Promise<SessionState> {
    const sessionState = await this.loadState(req, res)
    assertRouteCheckedScope(req, sessionState)
    return sessionState
  }

  // reads the session for logging only (never for authorization): never throws, ignores the
  // scope check requirement
  async reqForLogs (req: Request | IncomingMessage): Promise<SessionState | undefined> {
    try {
      return await this.loadState(req)
    } catch {
      return undefined
    }
  }

  private async loadState (req: Request | IncomingMessage, res?: Response | ServerResponse): Promise<SessionState> {
    // @ts-ignore
    if (req[sessionKey]) return req[sessionKey]
    // note: no schema validation of the session state, the token signature was already verified
    // and a previous ajv validation proved useless (its result was ignored and it could never pass
    // anyway because the schema does not accept the exp/iat claims present in the payload)
    const sessionState = await this.readState(req, res)
    if ((sessionState.scopes || sessionState.user?.scope !== undefined) && !this.scopeAware) {
      throw httpError(403, 'this service does not accept scope-restricted sessions')
    }
    if (sessionState.user?.boundIp) {
      // hard IP binding: simple-directory stamps boundIp in the token of sensitive sessions
      // (superadmins), a stolen token must not be usable from another address.
      // reqIp reads the client IP as seen by our own reverse proxy, clients cannot spoof it
      // there (the proxy overwrites the header). It throws when the header is missing or
      // broken, and this error is left as is: it describes a reverse-proxy misconfiguration
      // much better than the 401 below, and it rejects the request all the same
      if (reqIp(req) !== sessionState.user.boundIp) {
        if (res) this.unsetCookies(req, res)
        throw httpError(401, 'session is bound to another IP address')
      }
    }
    // @ts-ignore
    req[sessionKey] = sessionState
    return sessionState
  }

  async reqAuthenticated (req: Request | IncomingMessage): Promise<SessionStateAuthenticated> {
    const sessionState = await this.req(req)
    assertAuthenticated(sessionState)
    return sessionState
  }

  async reqAdminMode (req: Request | IncomingMessage): Promise<SessionStateAuthenticated> {
    const sessionState = await this.req(req)
    assertAdminMode(sessionState)
    return sessionState
  }

  unsetCookies (req: Request | IncomingMessage, res: Response | ServerResponse) {
    const opts = { path: reqSitePathSafe(req) + '/', expires: new Date(0) }
    res.setHeader('Set-Cookie', [
      cookie.serialize('id_token', '', opts),
      cookie.serialize('id_token_sign', '', opts),
      cookie.serialize('id_token_org', '', opts),
      cookie.serialize('id_token_dep', '', opts),
      cookie.serialize('id_token_role', '', opts)
    ])
  }

  async readState (req: Request | IncomingMessage, res?: Response | ServerResponse): Promise<SessionState> {
    // a bearer access token wins over cookies: cookies of a browser session must never be mixed
    // with the account binding of an access token
    // the auth scheme is case-insensitive (RFC 7235)
    // an empty token ('Bearer', 'Bearer ') is still a bearer attempt: refused by readStateFromBearer, never a fallback to cookies
    const bearerMatch = req.headers.authorization?.match(/^bearer(?:\s+(.*))?$/i)
    if (bearerMatch) {
      return this.readStateFromBearer((bearerMatch[1] ?? '').trim())
    }
    // reuse req.cookies if a cookie-parser middleware already populated it, to avoid re-parsing the Cookie header
    // @ts-ignore - cookies is set by cookie-parser, absent on plain IncomingMessage
    const cookies = req.cookies ?? req.headers.cookie
    return this.readStateFromCookie(cookies, this.onlyDecode?.(req), res && (() => this.unsetCookies(req, res)))
  }

  middleware (options: { required?: boolean, adminOnly?: boolean } = {}): RequestHandler {
    return async (req, res, next) => {
      // @ts-ignore
      req[sessionMiddlewareKey] = true
      const sessionState = await this.loadState(req, res)
      if (sessionState.user?.pseudoSession && req.method !== 'GET') {
        res.status(403).send('pseudo session only allows GET requests')
        return
      }
      if (options.required || options.adminOnly) {
        if (!sessionState.user) {
          res.status(401).send()
          return
        }
        if (options.adminOnly) {
          if (!sessionState.user.adminMode) {
            res.status(403).send('admin only')
            return
          }
        }
      }
      next()
    }
  }
}

export const session = new Session()
export default session

// some "sync" accessors that will only work if the middleware was applied
export function reqSession (req: Request | IncomingMessage): SessionState {
  // @ts-ignore
  if (!req[sessionMiddlewareKey]) throw new Error('session middleware was not applied')
  // @ts-ignore
  const sessionState = req[sessionKey] as SessionState
  assertRouteCheckedScope(req, sessionState)
  return sessionState
}
export function reqSessionAuthenticated (req: Request | IncomingMessage): SessionStateAuthenticated {
  // @ts-ignore
  if (!req[sessionMiddlewareKey]) throw new Error('session middleware was not applied')
  // @ts-ignore
  const sessionState = req[sessionKey] as SessionState
  assertRouteCheckedScope(req, sessionState)
  assertAuthenticated(sessionState)
  return sessionState
}
export function reqAdminMode (req: Request | IncomingMessage): SessionStateAuthenticated {
  // @ts-ignore
  if (!req[sessionMiddlewareKey]) throw new Error('session middleware was not applied')
  // @ts-ignore
  const sessionState = req[sessionKey] as SessionState
  assertRouteCheckedScope(req, sessionState)
  assertAuthenticated(sessionState)
  assertAdminMode(sessionState)
  return sessionState
}
// check the scopes of the request's session (any one of the accepted ones) and mark the request
// as scope-checked; unrestricted sessions pass. Nothing is marked if the check fails
export function assertReqScope (req: Request | IncomingMessage, accepted: string | string[]) {
  // @ts-ignore
  if (!req[sessionMiddlewareKey]) throw new Error('session middleware was not applied')
  // @ts-ignore
  assertScope(req[sessionKey] as SessionState, accepted)
  markScopeChecked(req)
}
// guard a route with the scopes it accepts (any one of them); unrestricted sessions pass
export function requireScope (accepted: string | string[]): RequestHandler {
  return (req, _res, next) => {
    assertReqScope(req, accepted)
    next()
  }
}
// declare that any scope is fine for the route (session machinery, public resources)
export const allowAnyScope: RequestHandler = (req, _res, next) => {
  markScopeChecked(req)
  next()
}
export function reqUser (req: Request | IncomingMessage): User | undefined { return reqSession(req).user }
export function reqUserAuthenticated (req: Request | IncomingMessage): User { return reqSessionAuthenticated(req).user }

// this can be used to override the normal session mechanisme
// for example create a pseudo session based on a secret
export function setReqUser (req: Request, user: User, lang = 'fr', account?: Account, accountRole = 'admin', extra?: Record<string, any>) {
  const sessionState: SessionStateAuthenticated = {
    user,
    accountRole,
    account: account ?? {
      type: 'user',
      id: user.id,
      name: user.name
    },
    lang,
    ...extra
  }
  // @ts-ignore
  req[sessionKey] = sessionState
}
export function setReqSession (req: Request, sessionState: SessionState) {
  // @ts-ignore
  req[sessionKey] = sessionState
}
