import type { SessionState, User } from '@data-fair/lib-common-types/session/index.js'
import jwt from 'jsonwebtoken'
import JwksClient from 'jwks-rsa'
import cookie from 'cookie'
import { httpError } from '@data-fair/lib-utils/http-errors.js'

export class SessionHandler {
  private _jwksClient: JwksClient.JwksClient | undefined
  public defaultLang: string = 'fr'

  get jwksClient () {
    if (!this._jwksClient) throw new Error('session management was not initialized')
    return this._jwksClient
  }

  initJWKS (directoryUrl = 'http://simple-directory:8080') {
    this._jwksClient = JwksClient({ jwksUri: directoryUrl + '/.well-known/jwks.json' })
  }

  // used for the main session token, but can also be used to use the jwks to verify other types of tokens
  async verifyToken (token: string): Promise<any> {
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded) throw new Error('failed to decode token')
    const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid)
    return jwt.verify(token, signingKey.getPublicKey())
  }

  async readStateFromCookie (cookieStr: string | undefined, onlyDecode?: boolean, clearBrokenSession?: () => void): Promise<SessionState> {
    const session: SessionState = { lang: this.defaultLang }
    if (!cookieStr) return session
    const cookies = cookie.parse(cookieStr)
    session.dark = cookies.theme_dark === '1' || cookies.theme_dark === 'true'
    if (cookies.i18n_lang) session.lang = cookies.i18n_lang

    if (!cookies.id_token || !cookies.id_token_sign) return session
    const token = cookies.id_token + '.' + cookies.id_token_sign
    let user: User
    if (onlyDecode) {
      user = jwt.decode(token) as User
    } else {
      try {
        user = await this.verifyToken(token)
      } catch (err: any) {
        console.warn(err)
        if (err.name === 'JwksError') {
          // happens in case of temporary unavailability if SD
          // better not to disconnect user in this case
          throw httpError(500, 'Session token public keys not initialized')
        } else {
          if (clearBrokenSession) clearBrokenSession()
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
}
