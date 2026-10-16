import type { SessionState, User } from '@data-fair/lib-common-types/session/index.js'
import { parseScope } from '@data-fair/lib-common-types/session/index.js'
import { createPublicKey, type KeyObject } from 'node:crypto'
import type { JwtHeader } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import JwksClient from 'jwks-rsa'
import cookie from 'cookie'
import { httpError } from '@data-fair/lib-utils/http-errors.js'

export type KeySet = 'session' | 'scoped'
// simple-directory names the keys of its scoped key set scoped-<kid>; the signature still has to
// verify against that set, so a forged kid gains nothing
export const keySetOfKid = (kid?: string): KeySet => kid?.startsWith('scoped-') ? 'scoped' : 'session'

// only a genuine token failure means the credential is bad; anything else (jwks unreachable,
// jwks-rsa rate limit, network error, unexpected bug) says nothing about the token and must
// neither refuse it as invalid nor clear the session of the user
const tokenFailureNames = new Set(['JsonWebTokenError', 'TokenExpiredError', 'NotBeforeError', 'SigningKeyNotFoundError'])
const isTokenFailure = (err: any) =>
  err?.status === 401 || tokenFailureNames.has(err?.name) ||
  err?.message === 'failed to decode token' || err?.message === 'not a session token'

type TokenSessionState = Omit<SessionState, 'lang' | 'dark'>

export class SessionHandler {
  private _jwksClients: Record<KeySet, JwksClient.JwksClient> | undefined
  public defaultLang: string = 'fr'
  // a service declares itself scope-aware once it enforces scopes on its routes; until then a
  // scope-restricted session (an NHI or OAuth access token with a scope claim) is refused with
  // a 403 instead of acting with the full role of its identity
  public scopeAware = false

  get jwksClients () {
    if (!this._jwksClients) throw new Error('session management was not initialized')
    return this._jwksClients
  }

  initJWKS (directoryUrl = 'http://simple-directory:8080') {
    const client = (path: string) => JwksClient({ jwksUri: directoryUrl + path })
    this._jwksClients = {
      session: client('/.well-known/jwks.json'),
      scoped: client('/.well-known/scoped-jwks.json')
    }
    // the parsed key cache is derived from these jwks clients (which enforce key rotation
    // through their own ttl), so it must be dropped whenever the clients are recreated
    this._signingKeyObjects.clear()
  }

  // jwks-rsa caches the JWK per kid but it exports a new PEM string at every access
  // and jsonwebtoken parses that PEM again at every verification: caching the parsed
  // KeyObject per key set and kid skips both costs.
  // IMPORTANT: getSigningKey must still be awaited on every verification. It is the only
  // thing that re-checks the kid against the current keyset, so a key rotated out of the
  // JWKS stops being accepted. Short-circuiting it from a persistent cache would accept a
  // rotated-out key forever (the lib#41 regression).
  private _signingKeyObjects = new Map<string, KeyObject>()
  protected async getSigningKeyObject (keySet: KeySet, kid?: string): Promise<KeyObject> {
    const signingKey = await this.jwksClients[keySet].getSigningKey(kid)
    const cacheKey = keySet + ':' + (kid ?? '')
    let keyObject = this._signingKeyObjects.get(cacheKey)
    if (!keyObject) {
      keyObject = createPublicKey(signingKey.getPublicKey())
      this._signingKeyObjects.set(cacheKey, keyObject)
    }
    return keyObject
  }

  // verifies against the key set designated by the kid: a token claiming a scoped kid must be
  // signed by a key of the scoped set, any other must be signed by a key of the session set
  async verifyTokenKeySet (token: string): Promise<{ payload: any, header: JwtHeader, keySet: KeySet }> {
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded) throw new Error('failed to decode token')
    const keySet = keySetOfKid(decoded.header.kid)
    const signingKeyObject = await this.getSigningKeyObject(keySet, decoded.header.kid)
    const payload = jwt.verify(token, signingKeyObject, { algorithms: ['RS256'] })
    return { payload, header: decoded.header, keySet }
  }

  // used for the main session token, but can also be used to use the jwks to verify other types of tokens
  // (simple-directory verifies its exchange tokens with it): only the session key set is accepted
  async verifyToken (token: string): Promise<any> {
    const { payload, keySet } = await this.verifyTokenKeySet(token)
    if (keySet !== 'session') throw new Error('not a session token')
    return payload
  }

  private assertTokenKind (path: 'bearer' | 'cookie', header: JwtHeader, payload: any, keySet: KeySet) {
    if (path === 'bearer') {
      if (header.typ !== 'at+jwt') throw httpError(401, 'bearer token is not an access token')
      if (keySet !== 'scoped') throw httpError(401, 'access token must be signed by the scoped key set')
    } else {
      if (header.typ === 'at+jwt') throw httpError(401, 'an access token is not a session token')
      const hasScope = payload && typeof payload === 'object' && 'scope' in payload
      if (keySet === 'session' && hasScope) throw httpError(401, 'session key set token must not carry a scope')
      if (keySet === 'scoped' && !hasScope) throw httpError(401, 'scoped key set token must carry a scope')
    }
    if (keySet === 'scoped') {
      if (payload && ('adminMode' in payload || 'asAdmin' in payload || 'isAdmin' in payload)) throw httpError(401, 'scoped token cannot carry superadmin claims')
      if (typeof payload?.exp !== 'number') throw httpError(401, 'scoped token must expire')
    }
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
    // absent claim = unrestricted first party session; anything but a string is malformed
    // (null must not silently become unrestricted)
    if (user.scope !== undefined) {
      if (typeof user.scope !== 'string') throw httpError(401, 'invalid scope claim')
      state.scopes = parseScope(user.scope)
    }

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

  private assertScopeAware (state: SessionState) {
    if (state.scopes && !this.scopeAware) throw httpError(403, 'this service does not accept scope-restricted sessions')
  }

  // accepts either the raw Cookie header or an already-parsed cookies object
  // (e.g. req.cookies when a cookie-parser middleware already ran upstream) to
  // avoid re-parsing and allocating a second cookies object per request
  // raw reader, applies neither the route scope guard nor the session cache: not for authorization,
  // use session.req() / reqSession(). It only refuses scoped states when the handler is not scope-aware.
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
      const decoded = jwt.decode(token, { complete: true })
      if (!decoded) return { lang, dark }
      this.assertTokenKind('cookie', decoded.header, decoded.payload, keySetOfKid(decoded.header.kid))
      user = decoded.payload as User
    } else {
      try {
        const verified = await this.verifyTokenKeySet(token)
        user = verified.payload as User
        this.assertTokenKind('cookie', verified.header, verified.payload, verified.keySet)
      } catch (err: any) {
        console.warn(err)
        if (!isTokenFailure(err)) {
          // happens in case of temporary unavailability of SD
          // better not to disconnect user in this case
          throw httpError(500, 'Session token public keys not initialized')
        }
        if (clearBrokenSession) clearBrokenSession()
        throw err.status === 401 ? err : httpError(401)
      }
    }
    if (!user) return { lang, dark }
    const state = Object.assign({ lang, dark } as SessionState, this.buildTokenSessionState(user, organizationId, departmentId, switchedRole))
    this.assertScopeAware(state)
    return state
  }

  // Only tokens minted as access tokens (RFC 9068 header typ at+jwt) are bearer credentials.
  // Session cookie tokens and the long lived exchange token are signed by the same keys and
  // must never be usable this way (cf simple-directory docs/architecture/session-theft-protections.md).
  // An access token is bound to one account: its organizations array holds the one membership it
  // acts in (1 = that organization), or nothing for the personal account (0 memberships). More than
  // one is refused because the full array stays in user.organizations and consumers filter on it.
  // A missing organizations key is not an access token either.
  // raw reader, applies neither the route scope guard nor the session cache: not for authorization,
  // use session.req() / reqSession(). It only refuses scoped states when the handler is not scope-aware.
  async readStateFromBearer (token: string, lang?: string): Promise<SessionState> {
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded || decoded.header.typ !== 'at+jwt') throw httpError(401, 'bearer token is not an access token')
    let user: User
    try {
      const verified = await this.verifyTokenKeySet(token)
      this.assertTokenKind('bearer', verified.header, verified.payload, verified.keySet)
      user = verified.payload as User
    } catch (err: any) {
      if (!isTokenFailure(err)) throw httpError(500, 'Session token public keys not initialized')
      throw err.status === 401 ? err : httpError(401)
    }
    if (!user?.organizations) throw httpError(401, 'bearer token is not an access token')
    if (user.organizations.length > 1) throw httpError(401, 'access token must be bound to at most one organization')
    const org = user.organizations[0]
    const state = Object.assign({ lang: lang ?? this.defaultLang } as SessionState, this.buildTokenSessionState(user, org?.id ?? '', org?.department ?? '', ''))
    this.assertScopeAware(state)
    return state
  }
}
