import jwt from 'jsonwebtoken'
import JwksClient from 'jwks-rsa'
import cookie from 'cookie'
import asyncHandler from '../../express/async-handler.js'
import { validate, assertAdminMode, assertAuthenticated } from '../../shared/session/index.js'

export * from '../../shared/session/index.js'

const sessionKey = Symbol('session')

/**
 * @typedef {import('../../shared/session/index.js').SessionStateAuthenticated} SessionStateAuthenticated
 * @typedef {import('../../shared/session/index.js').SessionState} SessionState
 */

export class Session {
  /**
   * @type {JwksClient.JwksClient | undefined}
   * @private
   */
  _jwksClient

  get jwksClient () {
    if (!this._jwksClient) throw new Error('session management was not initialized')
    return this._jwksClient
  }

  /**
   * @param {string} [directoryUrl]
   */
  init (directoryUrl = 'http://simple-directory:8080') {
    this._jwksClient = JwksClient({ jwksUri: directoryUrl + '/.well-known/jwks.json' })
  }

  /**
   * @param {import('express').Request | import('node:http').IncomingMessage} req
   * @returns {Promise<SessionState>}
   */
  async req (req) {
    // @ts-ignore
    if (req[sessionKey]) return req[sessionKey]
    const sessionState = await this.readState(req)
    validate(sessionState)
    // @ts-ignore
    req[sessionKey] = sessionState
    return sessionState
  }

  /**
   * @param {import('express').Request | import('node:http').IncomingMessage} req
   * @returns {Promise<SessionStateAuthenticated>}
   */
  async reqAuthenticated (req) {
    const sessionState = await this.req(req)
    assertAuthenticated(sessionState)
    return sessionState
  }

  /**
   * @param {import('express').Request | import('node:http').IncomingMessage} req
   * @returns {Promise<SessionStateAuthenticated>}
   */
  async reqAdminMode (req) {
    const sessionState = await this.req(req)
    assertAdminMode(sessionState)
    return sessionState
  }

  /**
   * @param {import('express').Request | import('http').IncomingMessage} req
   * @returns {Promise<SessionState>}
   */
  async readState (req) {
    /** @type {SessionState} */
    const session = {}
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
    const user = /** @type {import('../../shared/session/index.js').User} */(jwt.verify(token, signingKey.getPublicKey()))
    if (!user) return session
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

  /**
   * @param {{required?: boolean, adminOnly?: boolean}} [options]
   * @returns {import('express').RequestHandler}
   */
  middleware (options = {}) {
    return asyncHandler(async (/** @type {import('express').Request} */req, res, next) => {
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
