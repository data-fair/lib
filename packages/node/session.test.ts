import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { generateKeyPairSync } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { SessionHandler } from './session.js'

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
  handler.verifyToken = async () => {
    calls.count++
    return structuredClone(testUser)
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
    handler.verifyToken = async () => { throw Object.assign(new Error('jwt expired'), { name: 'TokenExpiredError' }) }
    let cleared = false
    await assert.rejects(
      handler.readStateFromCookie('id_token=h.p; id_token_sign=s', undefined, () => { cleared = true }),
      (err: any) => err.status === 401
    )
    assert.equal(cleared, true)
  })

  it('should surface a 500 without clearing the session on a jwks error', async () => {
    const handler = new SessionHandler()
    handler.verifyToken = async () => { throw Object.assign(new Error('jwks down'), { name: 'JwksError' }) }
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
    ;(handler as any)._jwksClient = {
      getSigningKey: async () => {
        getSigningKeyCalls++
        return { getPublicKey: () => { getPublicKeyCalls++; return pem } }
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
    ;(handler as any)._jwksClient = {
      getSigningKey: async () => {
        if (!keyPresent) throw Object.assign(new Error('key not found'), { name: 'SigningKeyNotFoundError' })
        return { getPublicKey: () => pem }
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
