import type { IncomingMessage } from 'node:http'
import type { SessionState, SessionStateAuthenticated, User } from '@data-fair/lib-common-types/session/index.js'
import type { Request, RequestHandler } from 'express'
import jwt from 'jsonwebtoken'
import JwksClient from 'jwks-rsa'
import cookie from 'cookie'
import asyncHandler from './async-handler.js'
import { validate, assertAdminMode, assertAuthenticated } from '@data-fair/lib-common-types/session/index.js'

export type * from '@data-fair/lib-common-types/session/index.js'

export type ReqSession = Request & { session?: SessionState }

export type IncomingMessageSession = IncomingMessage & { session?: SessionState }

const sessionKey = Symbol('session')

export class Session {
  private _jwksClient: JwksClient.JwksClient | undefined

  get jwksClient () {
    if (!this._jwksClient) throw new Error('session management was not initialized')
    return this._jwksClient
  }

  init (directoryUrl = 'http://simple-directory:8080') {
    this._jwksClient = JwksClient({ jwksUri: directoryUrl + '/.well-known/jwks.json' })
  }

  async req (req: Request | IncomingMessage): Promise<SessionState> {
    // @ts-ignore
    if (req[sessionKey]) return req[sessionKey]
    const sessionState = await this.readState(req)
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

  async readState (req: Request | IncomingMessage): Promise<SessionState> {
    const session: SessionState = {}
    const cookieStr = req.headers.cookie
    if (!cookieStr) return session
    const cookies = cookie.parse(cookieStr)
    session.dark = cookies.theme_dark === '1' || cookies.theme_dark === 'true'
    if (cookies.i18n_lang) session.lang = cookies.i18n_lang

    if (!cookies.id_token || !cookies.id_token_sign) return session
    const token = cookies.id_token + '.' + cookies.id_token_sign
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded) return session
    const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid)
    const user = jwt.verify(token, signingKey.getPublicKey()) as User
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
    if (organizationId) {
      if (departmentId) {
        session.organization = user.organizations.find(o => o.id === organizationId && o.department === departmentId)
      } else {
        session.organization = user.organizations.find(o => o.id === organizationId)
      }
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
    return session
  }

  middleware (options: { required?: boolean, adminOnly?: boolean } = {}): RequestHandler {
    return asyncHandler(async (req, res, next) => {
      const sessionState = await this.req(req)
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