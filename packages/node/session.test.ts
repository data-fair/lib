import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { generateKeyPairSync } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { SessionHandler, keySetOfKid } from './session.js'

const testUser = {
  email: 'test@example.com',
  id: 'user1',
  name: 'Test User',
  organizations: [
    { id: 'org1', name: 'Test Org', role: 'admin' },
    { id: 'org2', name: 'Other Org', role: 'user', department: 'dep1', departmentName: 'Department 1' }
  ]
}

// a handler whose token verification is stubbed, counts the number of verifications
const stubbedHandler = () => {
  const handler = new SessionHandler()
  const calls = { count: 0 }
  handler.verifyTokenKeySet = async () => {
    calls.count++
    return { payload: structuredClone(testUser), header: { alg: 'RS256' }, keySet: 'session' }
  }
  return { handler, calls }
}

describe('SessionHandler.readStateFromCookie', () => {
  it('should return default session with no cookies', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie(undefined)
    assert.equal(state.lang, 'fr')
    assert.equal(state.user, undefined)
    assert.equal(state.dark, undefined)
  })

  it('should parse dark mode cookie', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie('theme_dark=true')
    assert.equal(state.dark, true)
  })

  it('should parse i18n_lang cookie', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie('i18n_lang=en')
    assert.equal(state.lang, 'en')
  })

  it('should use defaultLang when no i18n_lang cookie', async () => {
    const handler = new SessionHandler()
    handler.defaultLang = 'de'
    const state = await handler.readStateFromCookie('')
    assert.equal(state.lang, 'de')
  })

  it('should return early when no id_token', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie('i18n_lang=en; theme_dark=1')
    assert.equal(state.lang, 'en')
    assert.equal(state.dark, true)
    assert.equal(state.user, undefined)
  })

  it('should return early when no id_token_sign and not onlyDecode', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie('id_token=header.payload')
    assert.equal(state.user, undefined)
  })

  it('should select the organization account from cookies', async () => {
    const { handler } = stubbedHandler()
    const state = await handler.readStateFromCookie('id_token=h.p; id_token_sign=s; id_token_org=org2; id_token_dep=dep1')
    assert.equal(state.account?.type, 'organization')
    assert.equal(state.account?.id, 'org2')
    assert.equal(state.account?.department, 'dep1')
    assert.equal(state.accountRole, 'user')
  })

  it('should build a user account when no org cookie', async () => {
    const { handler } = stubbedHandler()
    const state = await handler.readStateFromCookie('id_token=h.p; id_token_sign=s')
    assert.equal(state.account?.type, 'user')
    assert.equal(state.account?.id, 'user1')
    assert.equal(state.accountRole, 'admin')
  })

  it('should accept an already-parsed cookies object without re-parsing', async () => {
    const { handler, calls } = stubbedHandler()
    const parsed = { id_token: 'h.p', id_token_sign: 's', id_token_org: 'org2', id_token_dep: 'dep1', i18n_lang: 'en', theme_dark: '1' }
    const state = await handler.readStateFromCookie(parsed)
    assert.equal(state.lang, 'en')
    assert.equal(state.dark, true)
    assert.equal(state.account?.type, 'organization')
    assert.equal(state.account?.id, 'org2')
    assert.equal(calls.count, 1)
  })

  it('should produce equivalent state from string and object cookie inputs', async () => {
    const { handler } = stubbedHandler()
    const fromString = await handler.readStateFromCookie('id_token=h.p; id_token_sign=s; i18n_lang=en')
    const fromObject = await handler.readStateFromCookie({ id_token: 'h.p', id_token_sign: 's', i18n_lang: 'en' })
    assert.deepEqual(fromString, fromObject)
  })

  it('should verify the token on every request', async () => {
    const { handler, calls } = stubbedHandler()
    const cookies = 'id_token=h.p; id_token_sign=s'
    await handler.readStateFromCookie(cookies)
    await handler.readStateFromCookie(cookies)
    assert.equal(calls.count, 2)
  })

  it('should return a mutable state that callers can adjust', async () => {
    const { handler } = stubbedHandler()
    const state = await handler.readStateFromCookie('id_token=h.p; id_token_sign=s')
    state.user!.name = 'mutated' // must not throw
    state.user!.organizations[0].role = 'other'
    assert.equal(state.user!.name, 'mutated')
    assert.equal(state.user!.organizations[0].role, 'other')
  })

  it('should decode without verifying in onlyDecode mode', async () => {
    const handler = new SessionHandler()
    const token = jwt.sign(structuredClone(testUser), 'secret')
    const [header, payload, sign] = token.split('.')
    const state = await handler.readStateFromCookie(`id_token=${header}.${payload}; id_token_sign=${sign}`, true)
    assert.equal(state.user?.id, 'user1')
    assert.equal(state.account?.type, 'user')
  })

  it('should reject and clear the session when the token is invalid', async () => {
    const handler = new SessionHandler()
    handler.verifyTokenKeySet = async () => { throw Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' }) }
    let cleared = false
    await assert.rejects(
      handler.readStateFromCookie('id_token=h.p; id_token_sign=s', undefined, () => { cleared = true }),
      (err: any) => err.status === 401
    )
    assert.equal(cleared, true)
  })

  it('should surface a 500 without clearing the session on a jwks error', async () => {
    const handler = new SessionHandler()
    handler.verifyTokenKeySet = async () => { throw Object.assign(new Error('jwks down'), { name: 'JwksError' }) }
    let cleared = false
    await assert.rejects(
      handler.readStateFromCookie('id_token=h.p; id_token_sign=s', undefined, () => { cleared = true }),
      (err: any) => err.status === 500
    )
    assert.equal(cleared, false)
  })
})

describe('SessionHandler.verifyToken', () => {
  it('should consult the JWKS on every verification but cache the parsed key per kid', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pem = publicKey.export({ format: 'pem', type: 'spki' }) as string
    const handler = new SessionHandler()
    let getSigningKeyCalls = 0
    let getPublicKeyCalls = 0
    ;(handler as any)._jwksClients = {
      session: {
        getSigningKey: async () => {
          getSigningKeyCalls++
          return { getPublicKey: () => { getPublicKeyCalls++; return pem } }
        }
      }
    }
    const token = jwt.sign({ id: 'user1' }, privateKey, { algorithm: 'RS256', keyid: 'kid1' })
    const payload1 = await handler.verifyToken(token)
    assert.equal(payload1.id, 'user1')
    const payload2 = await handler.verifyToken(token)
    assert.equal(payload2.id, 'user1')
    // the signing key must be re-checked against the JWKS every time so that a key
    // rotated out of the keyset stops being accepted (lib#41 regression)
    assert.equal(getSigningKeyCalls, 2)
    // but the expensive PEM export + parsing is cached per kid
    assert.equal(getPublicKeyCalls, 1)
  })

  it('should reject a token whose signing key was rotated out of the JWKS', async () => {
    const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const pem = publicKey.export({ format: 'pem', type: 'spki' }) as string
    const handler = new SessionHandler()
    let keyPresent = true
    ;(handler as any)._jwksClients = {
      session: {
        getSigningKey: async () => {
          if (!keyPresent) throw Object.assign(new Error('key not found'), { name: 'SigningKeyNotFoundError' })
          return { getPublicKey: () => pem }
        }
      }
    }
    const token = jwt.sign({ id: 'user1' }, privateKey, { algorithm: 'RS256', keyid: 'kid1' })
    // first verification succeeds and would populate any key cache
    assert.equal((await handler.verifyToken(token)).id, 'user1')
    // the key is rotated out of the published keyset
    keyPresent = false
    // a cached parsed key must not let the rotated-out key keep verifying
    await assert.rejects(handler.verifyToken(token))
  })
})

const sessionKeys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const scopedKeys = generateKeyPairSync('rsa', { modulusLength: 2048 })
const signWith = (privateKey: any, kid: string, payload: any, header: any = {}, opts: any = {}) =>
  jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn: '5m', keyid: kid, header: { alg: 'RS256', ...header }, ...opts })
const signSession = (payload: any, header?: any, opts?: any) => signWith(sessionKeys.privateKey, 'sd-1', payload, header, opts)
const signScoped = (payload: any, header?: any, opts?: any) => signWith(scopedKeys.privateKey, 'scoped-sd-1', payload, header, opts)
// real jwt verification against two local key pairs, one per key set
const realHandler = (scopeAware = true) => {
  const handler = new SessionHandler()
  handler.scopeAware = scopeAware
  ;(handler as any).getSigningKeyObject = async (keySet: string) => keySet === 'scoped' ? scopedKeys.publicKey : sessionKeys.publicKey
  return handler
}
const toCookies = (token: string) => {
  const [h, p, s] = token.split('.')
  return `id_token=${h}.${p}; id_token_sign=${s}`
}
const rejects401 = (p: Promise<any>) => assert.rejects(p, (err: any) => err.status === 401)

describe('SessionHandler.readStateFromBearer', () => {
  const nhiUser = { ...testUser, organizations: [testUser.organizations[0]], nhi: 1, scope: 'datasets:read organizations:read' }
  const bearer = (payload: any, header: any = { typ: 'at+jwt' }, opts?: any) => signScoped(payload, header, opts)

  it('reads an at+jwt access token, bound to its single organization, with its scopes', async () => {
    const state = await realHandler().readStateFromBearer(bearer(nhiUser))
    assert.equal(state.user?.id, 'user1')
    assert.equal(state.account?.type, 'organization')
    assert.equal(state.account?.id, 'org1')
    assert.equal(state.accountRole, 'admin')
    assert.deepEqual(state.scopes, ['datasets:read', 'organizations:read'])
  })

  it('refuses (401) a token bound to several organizations', async () => {
    await rejects401(realHandler().readStateFromBearer(bearer(testUser)))
  })

  it('gives a personal account session to a token with no organization membership', async () => {
    const state = await realHandler().readStateFromBearer(bearer({ ...testUser, organizations: [], scope: 'datasets' }))
    assert.equal(state.account?.type, 'user')
    assert.equal(state.account?.id, 'user1')
    assert.equal(state.accountRole, 'admin')
  })

  it('refuses a token without an organizations key', async () => {
    const { organizations, ...noOrgs } = testUser
    await rejects401(realHandler().readStateFromBearer(bearer({ ...noOrgs, scope: 'datasets' })))
  })

  it('refuses (401) an invalid scope claim on the bearer and cookie paths', async () => {
    for (const scope of [null, 12, ['a']]) {
      await rejects401(realHandler().readStateFromBearer(bearer({ ...nhiUser, scope })))
      const handler = new SessionHandler()
      handler.scopeAware = true
      handler.verifyTokenKeySet = async () => ({ payload: structuredClone({ ...testUser, scope, exp: 4102444800 }), header: { alg: 'RS256' }, keySet: 'scoped' })
      await rejects401(handler.readStateFromCookie('id_token=a.b; id_token_sign=c'))
    }
  })

  it('refuses a scoped session unless the handler is scope-aware', async () => {
    const handler = realHandler(false)
    assert.equal(handler.scopeAware, false)
    await assert.rejects(handler.readStateFromBearer(bearer(nhiUser)), (err: any) => err.status === 403)
    const cookies = toCookies(signScoped({ ...testUser, scope: 'datasets' }))
    await assert.rejects(handler.readStateFromCookie(cookies), (err: any) => err.status === 403)
    handler.scopeAware = true
    assert.deepEqual((await handler.readStateFromCookie(cookies)).scopes, ['datasets'])
    assert.deepEqual((await handler.readStateFromBearer(bearer(nhiUser))).scopes, ['datasets:read', 'organizations:read'])
  })

  it('refuses an expired token or one signed by another key when really verifying', async () => {
    const { privateKey: otherKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
    const handler = realHandler()
    assert.equal((await handler.readStateFromBearer(bearer(nhiUser))).user?.id, 'user1')
    await rejects401(handler.readStateFromBearer(bearer(nhiUser, undefined, { expiresIn: -10 })))
    await rejects401(handler.readStateFromBearer(signWith(otherKey, 'scoped-sd-1', nhiUser, { typ: 'at+jwt' })))
  })

  it('refuses a session token or an exchange token presented as bearer', async () => {
    const handler = realHandler()
    await rejects401(handler.readStateFromBearer(signSession(testUser)))
    await rejects401(handler.readStateFromBearer(signSession({ user: 'user1', session: 'abc' }, { typ: 'JWT' })))
    await rejects401(handler.readStateFromBearer('not-a-jwt'))
  })

  it('fills scopes from a cookie session too', async () => {
    const state = await realHandler().readStateFromCookie(toCookies(signScoped({ ...testUser, scope: 'datasets' })))
    assert.deepEqual(state.scopes, ['datasets'])
  })
})

describe('key sets and token kinds', () => {
  const nhiUser = { ...testUser, organizations: [testUser.organizations[0]], nhi: 1, scope: 'datasets:read' }

  it('keySetOfKid', () => {
    assert.equal(keySetOfKid('scoped-sd-1'), 'scoped')
    assert.equal(keySetOfKid('sd-1'), 'session')
    assert.equal(keySetOfKid(undefined), 'session')
  })

  it('bearer requires an at+jwt from the scoped set', async () => {
    const handler = realHandler()
    assert.equal((await handler.readStateFromBearer(signScoped(nhiUser, { typ: 'at+jwt' }))).user?.id, 'user1')
    await rejects401(handler.readStateFromBearer(signSession(nhiUser, { typ: 'at+jwt' })))
    await rejects401(handler.readStateFromBearer(signScoped(nhiUser, {})))
  })

  it('a token signed by one set is not verified by the other', async () => {
    const handler = realHandler()
    // claims a scoped kid but is signed with the session private key
    await rejects401(handler.readStateFromBearer(signWith(sessionKeys.privateKey, 'scoped-sd-1', nhiUser, { typ: 'at+jwt' })))
    // and the other way round, on the cookie path
    await rejects401(handler.readStateFromCookie(toCookies(signWith(scopedKeys.privateKey, 'sd-1', testUser))))
  })

  it('cookie path refuses access tokens and enforces the scope/key-set pairing', async () => {
    const handler = realHandler()
    await rejects401(handler.readStateFromCookie(toCookies(signScoped(nhiUser, { typ: 'at+jwt' }))))
    await rejects401(handler.readStateFromCookie(toCookies(signSession({ ...testUser, scope: 'datasets' }))))
    await rejects401(handler.readStateFromCookie(toCookies(signScoped(testUser))))
    assert.deepEqual((await handler.readStateFromCookie(toCookies(signScoped({ ...testUser, scope: 'datasets' })))).scopes, ['datasets'])
    assert.equal((await handler.readStateFromCookie(toCookies(signSession(testUser)))).scopes, undefined)
  })

  it('applies the same kind rules when only decoding', async () => {
    const handler = realHandler()
    await rejects401(handler.readStateFromCookie(toCookies(signScoped(nhiUser, { typ: 'at+jwt' })), true))
    await rejects401(handler.readStateFromCookie(toCookies(signSession({ ...testUser, scope: 'datasets' })), true))
    await rejects401(handler.readStateFromCookie(toCookies(signScoped(testUser)), true))
    assert.equal((await handler.readStateFromCookie(toCookies(signSession(testUser)), true)).user?.id, 'user1')
  })

  it('scoped-set tokens cannot carry superadmin claims and must expire', async () => {
    const handler = realHandler()
    for (const claims of [{ adminMode: 1 }, { asAdmin: { id: 'a', name: 'A' } }, { isAdmin: 1 }, { isAdmin: 0 }, { adminMode: false }]) {
      await rejects401(handler.readStateFromBearer(signScoped({ ...nhiUser, ...claims }, { typ: 'at+jwt' })))
    }
    // no exp claim at all
    const noExp = jwt.sign(nhiUser, scopedKeys.privateKey, { algorithm: 'RS256', keyid: 'scoped-sd-1', header: { alg: 'RS256', typ: 'at+jwt' }, noTimestamp: true })
    assert.equal((jwt.decode(noExp) as any).exp, undefined)
    await rejects401(handler.readStateFromBearer(noExp))
  })

  it('verifyToken only accepts the session key set', async () => {
    const handler = realHandler()
    assert.equal((await handler.verifyToken(signSession({ id: 'user1' }))).id, 'user1')
    await assert.rejects(handler.verifyToken(signScoped({ id: 'user1', scope: 'datasets' })))
  })

  it('only RS256 is accepted', async () => {
    const handler = realHandler()
    const token = jwt.sign(testUser, sessionKeys.privateKey, { algorithm: 'PS256', keyid: 'sd-1', expiresIn: '5m' })
    await rejects401(handler.readStateFromCookie(toCookies(token)))
    await assert.rejects(handler.verifyToken(token))
  })
})

describe('verification errors', () => {
  const stubbed = (err: Error) => {
    const handler = realHandler()
    ;(handler as any).getSigningKeyObject = async () => { throw err }
    return handler
  }
  const named = (name: string, message = name) => Object.assign(new Error(message), { name })
  const token = () => signScoped({ ...testUser, organizations: [testUser.organizations[0]], scope: 'datasets' }, { typ: 'at+jwt' })

  it('infrastructure failures are a 500 and never clear the cookies', async () => {
    for (const err of [named('JwksRateLimitError'), new Error('connect ECONNREFUSED'), named('JwksError')]) {
      const handler = stubbed(err)
      let cleared = false
      await assert.rejects(
        handler.readStateFromCookie(toCookies(signScoped({ ...testUser, scope: 'datasets' })), false, () => { cleared = true }),
        (e: any) => e.status === 500
      )
      assert.equal(cleared, false)
      await assert.rejects(handler.readStateFromBearer(token()), (e: any) => e.status === 500)
    }
  })

  it('a kid absent from the jwks is a 401 and clears the cookies', async () => {
    const handler = stubbed(named('SigningKeyNotFoundError'))
    let cleared = false
    await assert.rejects(
      handler.readStateFromCookie(toCookies(signScoped({ ...testUser, scope: 'datasets' })), false, () => { cleared = true }),
      (e: any) => e.status === 401
    )
    assert.equal(cleared, true)
    await rejects401(handler.readStateFromBearer(token()))
  })

  it('looks a scoped kid up in the scoped client and another kid in the session client', async () => {
    const handler = new SessionHandler()
    const calls: string[] = []
    const client = (name: string, key: any) => ({ getSigningKey: async (kid: string) => { calls.push(name + ':' + kid); return { getPublicKey: () => key.export({ format: 'pem', type: 'spki' }) } } })
    ;(handler as any)._jwksClients = { session: client('session', sessionKeys.publicKey), scoped: client('scoped', scopedKeys.publicKey) }
    await handler.verifyTokenKeySet(signSession({ id: 'u' }))
    await handler.verifyTokenKeySet(signScoped({ id: 'u' }))
    assert.deepEqual(calls, ['session:sd-1', 'scoped:scoped-sd-1'])
  })
})
