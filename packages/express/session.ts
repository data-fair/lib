import type { IncomingMessage, ServerResponse } from 'node:http'
import type { Account, SessionState, SessionStateAuthenticated, User } from '@data-fair/lib-common-types/session/index.js'
import type { Request, Response, RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import JwksClient from 'jwks-rsa'
import cookie from 'cookie'
import asyncHandler from './async-handler.js'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import { validate, assertAdminMode, assertAuthenticated } from '@data-fair/lib-common-types/session/index.js'
import { reqSitePathSafe } from '@data-fair/lib-express'

export * from '@data-fair/lib-common-types/session/index.js'

export type ReqSession = Request & { session?: SessionState }

export type IncomingMessageSession = IncomingMessage & { session?: SessionState }

const sessionKey = Symbol('session')
const sessionMiddlewareKey = Symbol('session-middleware')

export class Session {
  private _jwksClient: JwksClient.JwksClient | undefined
  private defaultLang: string = 'fr'
  private onlyDecode?: (req: Request | IncomingMessage) => boolean

  get jwksClient () {
    if (!this._jwksClient) throw new Error('session management was not initialized')
    return this._jwksClient
  }

  init (directoryUrl = 'http://simple-directory:8080', defaultLang?: string, onlyDecode?: (req: Request | IncomingMessage) => boolean) {
    this._jwksClient = JwksClient({ jwksUri: directoryUrl + '/.well-known/jwks.json' })
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

  // used for the main session token, but can also be used to use the jwks to verify other types of tokens
  async verifyToken (token: string): Promise<any> {
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded) throw new Error('failed to decode token')
    const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid)
    return jwt.verify(token, signingKey.getPublicKey())
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
    const session: SessionState = { lang: this.defaultLang }
    const cookieStr = req.headers.cookie
    if (!cookieStr) return session
    const cookies = cookie.parse(cookieStr)
    session.dark = cookies.theme_dark === '1' || cookies.theme_dark === 'true'
    if (cookies.i18n_lang) session.lang = cookies.i18n_lang

    if (!cookies.id_token || !cookies.id_token_sign) return session
    const token = cookies.id_token + '.' + cookies.id_token_sign
    let user: User
    if (this.onlyDecode?.(req)) {
      user = jwt.decode(token) as User
    } else {
      try {
        user = await this.verifyToken(token)
      } catch (err: any) {
        if (err.name === 'JwksError') {
          // happens in case of temporary unavailability if SD
          // better not to disconnect user in this case
          console.warn(err)
          throw httpError(500, 'Session token public keys not initialized')
        } else {
          if (res) this.unsetCookies(req, res)
          throw httpError(401)
        }
      }
    }
    if (!user) return session

    // this is to prevent null values that are put by SD versions that do not strictly respect their schema
    for (const org of user.organizations) {
      if (!org.department) {
        delete org.department
        delete org.departmentName
      }
    }

    session.user = user

    const organizationId = cookies.id_token_org
    const departmentId = cookies.id_token_dep
    const switchedRole = cookies.id_token_role
    if (organizationId) {
      session.organization = user.organizations.find(o => {
        if (o.id !== organizationId) return false
        if (departmentId && departmentId !== o.department) return false
        if (switchedRole && switchedRole !== o.role) return false
        return true
      })
    }
    if (session.organization) {
      session.account = {
        type: 'organization',
        id: session.organization.id,
        name: session.organization.name,
        department: session.organization.department,
        departmentName: session.organization.departmentName
      }
      session.accountRole = session.organization.role
    } else {
      session.account = {
        type: 'user',
        id: user.id,
        name: user.name
      }
      session.accountRole = 'admin'
      return session
    }

    if (session.user?.siteOwner) {
      if (session.user.siteOwner.type === 'user' && session.user.siteOwner.id === session.user.id) {
        session.siteRole = 'admin'
      }
      if (session.user.siteOwner.type === 'organization' && session.user.siteOwner.id === session.organization?.id) {
        session.siteRole = session.organization.role
      }
    }
    return session
  }

  middleware (options: { required?: boolean, adminOnly?: boolean } = {}): RequestHandler {
    return asyncHandler(async (req, res, next) => {
      // @ts-ignore
      req[sessionMiddlewareKey] = true
      const sessionState = await this.req(req, res)
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
