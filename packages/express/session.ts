import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Account, SessionState, SessionStateAuthenticated, User } from '@data-fair/lib-common-types/session/index.js'
import type { Request, Response, RequestHandler } from 'express'
import cookie from 'cookie'
import asyncHandler from './async-handler.js'
import { validate, assertAdminMode, assertAuthenticated } from '@data-fair/lib-common-types/session/index.js'
import { reqSitePathSafe } from '@data-fair/lib-express'
import { SessionHandler } from '@data-fair/lib-node/session.js'

export * from '@data-fair/lib-common-types/session/index.js'

export type ReqSession = Request & { session?: SessionState }

export type IncomingMessageSession = IncomingMessage & { session?: SessionState }

const sessionKey = Symbol('session')
const sessionMiddlewareKey = Symbol('session-middleware')

export class Session extends SessionHandler {
  private onlyDecode?: (req: Request | IncomingMessage) => boolean

  init (directoryUrl = 'http://simple-directory:8080', defaultLang?: string, onlyDecode?: (req: Request | IncomingMessage) => boolean) {
    this.initJWKS(directoryUrl)
    if (defaultLang) this.defaultLang = defaultLang
    this.onlyDecode = onlyDecode
  }

  async req (req: Request | IncomingMessage, res?: Response | ServerResponse): Promise<SessionState> {
    // @ts-ignore
    if (req[sessionKey]) return req[sessionKey]
    const sessionState = await this.readState(req, res)
    validate(sessionState)
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
    return this.readStateFromCookie(req.headers.cookie, this.onlyDecode?.(req), res && (() => this.unsetCookies(req, res)))
  }

  middleware (options: { required?: boolean, adminOnly?: boolean } = {}): RequestHandler {
    return asyncHandler(async (req, res, next) => {
      // @ts-ignore
      req[sessionMiddlewareKey] = true
      const sessionState = await this.req(req, res)
      if (sessionState.pseudoSession && req.method !== 'GET') {
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
    })
  }
}

export const session = new Session()
export default session

// some "sync" accessors that will only work if the middleware was applied
export function reqSession (req: Request | IncomingMessage): SessionState {
  // @ts-ignore
  if (!req[sessionMiddlewareKey]) throw new Error('session middleware was not applied')
  // @ts-ignore
  return req[sessionKey]
}
export function reqSessionAuthenticated (req: Request | IncomingMessage): SessionStateAuthenticated {
  // @ts-ignore
  if (!req[sessionMiddlewareKey]) throw new Error('session middleware was not applied')
  // @ts-ignore
  const sessionState = req[sessionKey] as SessionState
  assertAuthenticated(sessionState)
  return sessionState
}
export function reqAdminMode (req: Request | IncomingMessage): SessionStateAuthenticated {
  // @ts-ignore
  if (!req[sessionMiddlewareKey]) throw new Error('session middleware was not applied')
  // @ts-ignore
  const sessionState = req[sessionKey] as SessionState
  assertAuthenticated(sessionState)
  assertAdminMode(sessionState)
  return sessionState
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
