import type { SessionState, User } from '@data-fair/lib-common-types/session/index.js'
import { createPublicKey, type KeyObject } from 'node:crypto'
import jwt from 'jsonwebtoken'
import JwksClient from 'jwks-rsa'
import cookie from 'cookie'
import { httpError } from '@data-fair/lib-utils/http-errors.js'

type TokenSessionState = Omit<SessionState, 'lang' | 'dark'>

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

  // jwks-rsa caches the JWK per kid but it exports a new PEM string at every access
  // and jsonwebtoken parses PEM strings again at every verification
  // caching the parsed KeyObject per kid skips both costs
  // the cache holds the pending promise so concurrent calls dedupe, and drops it on failure
  private _signingKeyObjects = new Map<string, Promise<KeyObject>>()
  private getSigningKeyObject (kid?: string): Promise<KeyObject> {
    const cacheKey = kid ?? ''
    let promise = this._signingKeyObjects.get(cacheKey)
    if (!promise) {
      promise = (async () => {
        const signingKey = await this.jwksClient.getSigningKey(kid)
        return createPublicKey(signingKey.getPublicKey())
      })()
      promise.catch(() => this._signingKeyObjects.delete(cacheKey))
      this._signingKeyObjects.set(cacheKey, promise)
    }
    return promise
  }

  // used for the main session token, but can also be used to use the jwks to verify other types of tokens
  async verifyToken (token: string): Promise<any> {
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded) throw new Error('failed to decode token')
    const signingKeyObject = await this.getSigningKeyObject(decoded.header.kid)
    return jwt.verify(token, signingKeyObject)
  }

  private buildTokenSessionState (user: User, organizationId: string, departmentId: string, switchedRole: string): TokenSessionState {
    const state: TokenSessionState = {}

    // this is to prevent null values that are put by SD versions that do not strictly respect their schema
    for (const org of user.organizations) {
      if (!org.department) {
        delete org.department
        delete org.departmentName
      }
    }

    state.user = user

    if (organizationId) {
      state.organization = user.organizations.find(o => {
        if (o.id !== organizationId) return false
        if (departmentId && departmentId !== o.department) return false
        if (switchedRole && switchedRole !== o.role) return false
        return true
      })
    }
    if (state.organization) {
      state.account = {
        type: 'organization',
        id: state.organization.id,
        name: state.organization.name,
        department: state.organization.department,
        departmentName: state.organization.departmentName
      }
      state.accountRole = state.organization.role
    } else {
      state.account = {
        type: 'user',
        id: user.id,
        name: user.name
      }
      state.accountRole = 'admin'
      return state
    }

    if (state.user?.siteOwner) {
      if (state.user.siteOwner.type === 'user' && state.user.siteOwner.id === state.user.id) {
        state.siteRole = 'admin'
      }
      if (state.user.siteOwner.type === 'organization' && state.user.siteOwner.id === state.organization?.id) {
        state.siteRole = state.organization.role
      }
    }
    return state
  }

  // accepts either the raw Cookie header or an already-parsed cookies object
  // (e.g. req.cookies when a cookie-parser middleware already ran upstream) to
  // avoid re-parsing and allocating a second cookies object per request
  async readStateFromCookie (rawCookies: string | Record<string, string | undefined> | undefined, onlyDecode?: boolean, clearBrokenSession?: () => void): Promise<SessionState> {
    if (!rawCookies) return { lang: this.defaultLang }
    const cookies = typeof rawCookies === 'string' ? cookie.parse(rawCookies) : rawCookies

    const lang = cookies.i18n_lang || this.defaultLang
    const dark = cookies.theme_dark === '1' || cookies.theme_dark === 'true'

    if (!cookies.id_token) return { lang, dark }
    if (!cookies.id_token_sign && !onlyDecode) return { lang, dark }
    const token = cookies.id_token + '.' + (cookies.id_token_sign ?? '')
    const organizationId = cookies.id_token_org ?? ''
    const departmentId = cookies.id_token_dep ?? ''
    const switchedRole = cookies.id_token_role ?? ''

    let user: User
    if (onlyDecode) {
      user = jwt.decode(token) as User
    } else {
      try {
        user = await this.verifyToken(token) as User
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
    if (!user) return { lang, dark }
    return Object.assign({ lang, dark } as SessionState, this.buildTokenSessionState(user, organizationId, departmentId, switchedRole))
  }
}
