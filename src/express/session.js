import jwt from 'jsonwebtoken'
import JwksClient from 'jwks-rsa'
import asyncHandler from 'express-async-handler'
import cookie from 'cookie'

export const defaultOptions = { directoryUrl: 'http://simple-directory:8080' }

/**
 * @typedef {import('./session-types.js').SessionOptions} SessionOptions
 */

/**
 * @param {SessionOptions} [initOptions]
 * @returns {{auth: import('express').RequestHandler, requiredAuth: import('express').RequestHandler, adminAuth: import('express').RequestHandler}}
 */
export const initSession = (initOptions) => {
  const options = { ...defaultOptions, ...initOptions }
  const jwksClient = JwksClient({ jwksUri: options.directoryUrl + '/.well-known/jwks.json' })

  /**
   * @param {import('express').Request} req
   */
  const setSessionState = async (req) => {
    /** @type {import('../types/session-state/types.js').SessionState} */
    req.session = {}
    const cookieStr = req.get('cookie')
    if (!cookieStr) return
    const cookies = cookie.parse(cookieStr)
    req.session.dark = cookies.theme_dark === '1' || cookies.theme_dark === 'true'
    if (cookies.i18n_lang) req.session.lang = cookies.i18n_lang

    if (!cookies.id_token || !cookies.id_token_sign) return
    const token = cookies.id_token + '.' + cookies.id_token_sign
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded) return
    const signingKey = await jwksClient.getSigningKey(decoded.header.kid)
    const user = /** @type {import('../types/session-state/types.js').User} */(jwt.verify(token, signingKey.getPublicKey()))
    if (!user) return
    req.session.user = user

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
      req.session.account = {
        type: 'user',
        id: user.id,
        name: user.name
      }
      return
    }

    req.session.account = {
      type: 'organization',
      id: org.id,
      name: org.name,
      department: org.department,
      departmentName: org.departmentName
    }
    req.session.accountRole = org.role
  }

  const auth = asyncHandler(async (req, res, next) => {
    await setSessionState(req)
    next()
  })

  const requiredAuth = asyncHandler(async (req, res, next) => {
    await setSessionState(req)
    if (!req.session.user) {
      res.status(401).send()
      return
    }
    next()
  })

  const adminAuth = asyncHandler(async (req, res, next) => {
    await setSessionState(req)
    if (!req.session.user) {
      res.status(401).send()
      return
    }
    if (!req.session.user.adminMode) {
      res.status(403).send('admin only')
      return
    }
    next()
  })

  return {
    auth,
    requiredAuth,
    adminAuth
  }
}
