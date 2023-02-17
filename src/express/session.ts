import { type Request, type Response, type NextFunction } from 'express'
import * as jwt from 'jsonwebtoken'
import * as JwksClient from 'jwks-rsa'
import * as asyncHandler from 'express-async-handler'
import * as cookie from 'cookie'
import { type SessionState, type User } from '../types/session-state'

// cf https://blog.logrocket.com/extend-express-request-object-typescript/
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      session: SessionState
    }
  }
}

export interface SessionOptions {
  directoryUrl?: string
}

export const defaultOptions = { directoryUrl: 'http://simple-directory:8080' }

export const initSession = (initOptions?: SessionOptions) => {
  const options = { ...defaultOptions, ...initOptions }
  const jwksClient = JwksClient({ jwksUri: options.directoryUrl + '/.well-known/jwks.json' })

  const setSessionState = async (req: Request) => {
    req.session = <SessionState>{}
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
    const user = jwt.verify(token, signingKey.getPublicKey()) as User
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

  const auth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await setSessionState(req)
    next()
  })

  const requiredAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    await setSessionState(req)
    if (!req.session.user) {
      res.status(401).send()
      return
    }
    next()
  })

  const adminAuth = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
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
