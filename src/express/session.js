import jwt from 'jsonwebtoken'
import JwksClient from 'jwks-rsa'
import cookie from 'cookie'
import asyncHandler from '../express/async-handler.js'
import { validate } from '../types/session-state/index.js'

/**
 * @typedef {import('./session-types.js').ReqSession} ReqSession
 * @typedef {import('./session-types.js').SessionStateWithAuth} SessionStateWithAuth
 * @typedef {import('../types/session-state/index.js').SessionState} SessionState
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
   * @param {ReqSession} req
   * @returns {Promise<import('../types/session-state/types.js').SessionState>}
   */
  async state (req) {
    if (req.session) return req.session
    const session = await this.readState(req)
    validate(session)
    req.session = session
    return session
  }

  /**
   * @param {import('express').Request} req
   * @returns {Promise<import('../types/session-state/types.js').SessionState>}
   */
  async readState (req) {
    /** @type {import('../types/session-state/types.js').SessionState} */
    const session = {}
    const cookieStr = req.get('cookie')
    if (!cookieStr) return session
    const cookies = cookie.parse(cookieStr)
    session.dark = cookies.theme_dark === '1' || cookies.theme_dark === 'true'
    if (cookies.i18n_lang) session.lang = cookies.i18n_lang

    if (!cookies.id_token || !cookies.id_token_sign) return session
    const token = cookies.id_token + '.' + cookies.id_token_sign
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded) return session
    const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid)
    const user = /** @type {import('../types/session-state/types.js').User} */(jwt.verify(token, signingKey.getPublicKey()))
    if (!user) return session
    session.user = user

    const organizationId = cookies.id_token_org
    const departmentId = cookies.id_token_dep
    let org
    if (organizationId) {
      if (departmentId) {
        org = user.organizations.find(o => o.id === organizationId && o.department === departmentId)
      } else {
        org = user.organizations.find(o => o.id === organizationId)
      }
    }
    if (!org) {
      session.account = {
        type: 'user',
        id: user.id,
        name: user.name
      }
      session.accountRole = 'admin'
      return session
    }

    session.account = {
      type: 'organization',
      id: org.id,
      name: org.name,
      department: org.department,
      departmentName: org.departmentName
    }
    session.accountRole = org.role
    return session
  }

  /**
   * @param {{required?: boolean, adminOnly?: boolean}} [options]
   * @returns {import('express').RequestHandler}
   */
  middleware (options = {}) {
    return asyncHandler(async (/** @type {ReqSession} */req, res, next) => {
      const sessionState = await this.state(req)
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

/** @type {(sessionState: import('../types/session-state/types.js').SessionState) => sessionState is SessionStateWithAuth} */
export const isAuthenticated = (sessionState) => {
  return !!sessionState.user
}

export const session = new Session()
export default session
