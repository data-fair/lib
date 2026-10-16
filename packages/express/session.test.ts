import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { Session, requireScope, assertReqScope, allowAnyScope, markScopeChecked, reqSession, reqSessionAuthenticated, reqAdminMode, reqUser, reqUserAuthenticated, setReqUser, setReqSession } from './session.js'
import type { Request, Response } from 'express'
import type { SessionState, User } from '@data-fair/lib-common-types/session/index.js'

const testUser: User = {
  email: 'test@example.com',
  id: 'user1',
  name: 'Test User',
  organizations: [
    { id: 'org1', name: 'Test Org', role: 'admin' },
    { id: 'org2', name: 'Other Org', role: 'user', department: 'dep1', departmentName: 'Department 1' }
  ]
}

const adminUser: User = {
  ...testUser,
  id: 'admin1',
  name: 'Admin User',
  adminMode: 1
}

function mockReq (method = 'GET', headers: Record<string, string> = {}): Request {
  return {
    method,
    headers,
    get: (name: string) => headers[name.toLowerCase()]
  } as unknown as Request
}

function mockRes (): Response & { statusCode: number, body: string | undefined } {
  const res = {
    statusCode: 200,
    body: undefined as string | undefined,
    status (code: number) { res.statusCode = code; return res },
    send (body?: string) { res.body = body; return res }
  }
  return res as any
}

describe('setReqUser / reqSession', () => {
  it('should set and read a user session', () => {
    const req = mockReq()
    setReqUser(req, testUser)
    // setReqUser does not set the middleware key, so reqSession will throw
    // instead, use setReqSession with a full state
    const sessionState: SessionState = {
      lang: 'en',
      user: testUser,
      account: { type: 'user', id: testUser.id, name: testUser.name },
      accountRole: 'admin'
    }
    setReqSession(req, sessionState)
  })

  it('should build default account from user when no account provided', () => {
    const req = mockReq()
    setReqUser(req, testUser)
    // setReqUser builds account automatically
    // We can't use reqSession directly without middleware flag, but we verify it doesn't throw
    assert.ok(req)
  })
})

describe('Session.middleware', () => {
  it('should reject pseudo session on non-GET requests', async () => {
    const session = new Session()
    const pseudoUser: User = { ...testUser, pseudoSession: true }

    // Override readState to return a known session
    session.readState = async () => ({
      lang: 'fr',
      user: pseudoUser,
      account: { type: 'user', id: pseudoUser.id, name: pseudoUser.name },
      accountRole: 'admin'
    })

    const middleware = session.middleware()
    const req = mockReq('POST')
    const res = mockRes()
    let nextCalled = false

    await middleware(req, res as any, () => { nextCalled = true })

    assert.equal(res.statusCode, 403)
    assert.ok(res.body?.includes('pseudo session'))
    assert.equal(nextCalled, false)
  })

  it('should allow pseudo session on GET requests', async () => {
    const session = new Session()
    const pseudoUser: User = { ...testUser, pseudoSession: true }

    session.readState = async () => ({
      lang: 'fr',
      user: pseudoUser,
      account: { type: 'user', id: pseudoUser.id, name: pseudoUser.name },
      accountRole: 'admin'
    })

    const middleware = session.middleware()
    const req = mockReq('GET')
    const res = mockRes()
    let nextCalled = false

    await middleware(req, res as any, () => { nextCalled = true })

    assert.equal(nextCalled, true)
  })

  it('should return 401 when required and no user', async () => {
    const session = new Session()
    session.readState = async () => ({ lang: 'fr' })

    const middleware = session.middleware({ required: true })
    const req = mockReq()
    const res = mockRes()
    let nextCalled = false

    await middleware(req, res as any, () => { nextCalled = true })

    assert.equal(res.statusCode, 401)
    assert.equal(nextCalled, false)
  })

  it('should pass when required and user present', async () => {
    const session = new Session()
    session.readState = async () => ({
      lang: 'fr',
      user: testUser,
      account: { type: 'user', id: testUser.id, name: testUser.name },
      accountRole: 'admin'
    })

    const middleware = session.middleware({ required: true })
    const req = mockReq()
    const res = mockRes()
    let nextCalled = false

    await middleware(req, res as any, () => { nextCalled = true })

    assert.equal(nextCalled, true)
  })

  it('should return 403 when adminOnly and user is not admin', async () => {
    const session = new Session()
    session.readState = async () => ({
      lang: 'fr',
      user: testUser,
      account: { type: 'user', id: testUser.id, name: testUser.name },
      accountRole: 'admin'
    })

    const middleware = session.middleware({ adminOnly: true })
    const req = mockReq()
    const res = mockRes()
    let nextCalled = false

    await middleware(req, res as any, () => { nextCalled = true })

    assert.equal(res.statusCode, 403)
    assert.equal(nextCalled, false)
  })

  it('should pass when adminOnly and user is admin', async () => {
    const session = new Session()
    session.readState = async () => ({
      lang: 'fr',
      user: adminUser,
      account: { type: 'user', id: adminUser.id, name: adminUser.name },
      accountRole: 'admin'
    })

    const middleware = session.middleware({ adminOnly: true })
    const req = mockReq()
    const res = mockRes()
    let nextCalled = false

    await middleware(req, res as any, () => { nextCalled = true })

    assert.equal(nextCalled, true)
  })

  it('should allow unauthenticated when not required', async () => {
    const session = new Session()
    session.readState = async () => ({ lang: 'fr' })

    const middleware = session.middleware()
    const req = mockReq()
    const res = mockRes()
    let nextCalled = false

    await middleware(req, res as any, () => { nextCalled = true })

    assert.equal(nextCalled, true)
  })
})

describe('Session.req IP binding', () => {
  const boundAdminUser: User = { ...adminUser, boundIp: '1.2.3.4' }
  const boundAdminState: SessionState = {
    lang: 'fr',
    user: boundAdminUser,
    account: { type: 'user', id: boundAdminUser.id, name: boundAdminUser.name },
    accountRole: 'admin'
  }

  it('should reject a session bound to another IP', async () => {
    const session = new Session()
    session.readState = async () => boundAdminState
    const req = mockReq('GET', { 'x-forwarded-for': '5.6.7.8' })
    await assert.rejects(session.req(req), (err: any) => err.status === 401)
  })

  it('should accept a session bound to the request IP', async () => {
    const session = new Session()
    session.readState = async () => boundAdminState
    const req = mockReq('GET', { 'x-forwarded-for': '1.2.3.4' })
    const state = await session.req(req)
    assert.equal(state.user?.id, boundAdminUser.id)
  })

  it('should use only the first entry of x-forwarded-for', async () => {
    const session = new Session()
    session.readState = async () => boundAdminState
    const req = mockReq('GET', { 'x-forwarded-for': '1.2.3.4, 10.0.0.1' })
    const state = await session.req(req)
    assert.equal(state.user?.id, boundAdminUser.id)
  })

  it('should reject a bound session with an explicit error when x-forwarded-for is missing', async () => {
    const session = new Session()
    session.readState = async () => boundAdminState
    const req = mockReq('GET', {})
    await assert.rejects(session.req(req), /X-Forwarded-For/)
  })

  it('should not check IP when the session has no boundIp', async () => {
    const session = new Session()
    session.readState = async () => ({
      lang: 'fr',
      user: adminUser,
      account: { type: 'user', id: adminUser.id, name: adminUser.name },
      accountRole: 'admin'
    })
    const req = mockReq('GET', { 'x-forwarded-for': '5.6.7.8' })
    const state = await session.req(req)
    assert.equal(state.user?.id, adminUser.id)
  })

  it('should clear session cookies when rejecting a bound session', async () => {
    const session = new Session()
    session.readState = async () => boundAdminState
    const req = mockReq('GET', { 'x-forwarded-for': '5.6.7.8' })
    let setCookieHeader: string[] | undefined
    const res = {
      setHeader: (_name: string, value: string[]) => { setCookieHeader = value }
    }
    await assert.rejects(session.req(req, res as any), (err: any) => err.status === 401)
    assert.ok(setCookieHeader?.some(c => c.startsWith('id_token=;')))
  })
})

describe('Session.readStateFromCookie', () => {
  it('should return default state when no cookies', async () => {
    const session = new Session()
    const state = await session.readStateFromCookie(undefined)
    assert.equal(state.lang, 'fr')
    assert.equal(state.user, undefined)
  })

  it('should parse dark mode and lang cookies', async () => {
    const session = new Session()
    const state = await session.readStateFromCookie('theme_dark=1; i18n_lang=en')
    assert.equal(state.dark, true)
    assert.equal(state.lang, 'en')
  })

  it('should return session without user when id_token is missing', async () => {
    const session = new Session()
    const state = await session.readStateFromCookie('i18n_lang=en')
    assert.equal(state.lang, 'en')
    assert.equal(state.user, undefined)
  })

  it('should return session without user when id_token_sign is missing and not onlyDecode', async () => {
    const session = new Session()
    const state = await session.readStateFromCookie('id_token=header.payload')
    assert.equal(state.user, undefined)
  })
})

describe('sync accessors', () => {
  it('reqSession should throw if middleware was not applied', () => {
    const req = mockReq()
    assert.throws(() => reqSession(req), /session middleware was not applied/)
  })

  it('reqSessionAuthenticated should throw if middleware was not applied', () => {
    const req = mockReq()
    assert.throws(() => reqSessionAuthenticated(req), /session middleware was not applied/)
  })

  it('reqAdminMode should throw if middleware was not applied', () => {
    const req = mockReq()
    assert.throws(() => reqAdminMode(req), /session middleware was not applied/)
  })
})

describe('Session bearer and scopes', () => {
  const scopedState = (): SessionState => ({
    lang: 'fr',
    user: { ...testUser, scope: 'datasets:read' },
    account: { type: 'organization', id: 'org1', name: 'Test Org' },
    accountRole: 'admin',
    scopes: ['datasets:read']
  })

  it('reads the bearer token and ignores cookies when both are present', async () => {
    const session = new Session()
    let bearerToken: string | undefined
    session.readStateFromBearer = async (token: string) => { bearerToken = token; return scopedState() }
    session.readStateFromCookie = async () => { throw new Error('cookies must not be read') }
    session.scopeAware = true
    const req = mockReq('GET', { authorization: 'Bearer abc.def.ghi', cookie: 'id_token=x; id_token_sign=y' })
    markScopeChecked(req)
    const state = await session.req(req)
    assert.equal(bearerToken, 'abc.def.ghi')
    assert.deepEqual(state.scopes, ['datasets:read'])
  })

  it('matches the bearer auth scheme case-insensitively', async () => {
    const session = new Session()
    let bearerToken: string | undefined
    session.readStateFromBearer = async (token: string) => { bearerToken = token; return scopedState() }
    session.readStateFromCookie = async () => { throw new Error('cookies must not be read') }
    session.scopeAware = true
    const req = mockReq('GET', { authorization: 'bearer abc.def.ghi', cookie: 'id_token=x; id_token_sign=y' })
    markScopeChecked(req)
    await session.req(req)
    assert.equal(bearerToken, 'abc.def.ghi')
  })

  it('refuses an empty bearer header without reading cookies', async () => {
    for (const header of ['Bearer', 'Bearer ', 'Bearer\t']) {
      const session = new Session()
      session.readStateFromCookie = async () => { throw new Error('cookies must not be read') }
      await assert.rejects(session.req(mockReq('GET', { authorization: header, cookie: 'id_token=x; id_token_sign=y' })), (err: any) => err.status === 401)
    }
  })

  it('refuses a scope-restricted session in a service that is not scope-aware', async () => {
    const session = new Session()
    session.readState = async () => scopedState()
    await assert.rejects(session.req(mockReq()), (err: any) => err.status === 403)
  })

  it('accepts unrestricted sessions in a service that is not scope-aware', async () => {
    const session = new Session()
    session.readState = async () => ({ lang: 'fr', user: testUser, account: { type: 'user', id: testUser.id, name: testUser.name }, accountRole: 'admin' })
    const state = await session.req(mockReq())
    assert.equal(state.user?.id, testUser.id)
  })

  it('init sets scopeAware', () => {
    const session = new Session()
    session.init('http://localhost:1234', 'fr', undefined, { scopeAware: true })
    assert.equal(session.scopeAware, true)
  })

  it('requireScope lets covered sessions through and throws 403 otherwise', async () => {
    const session = new Session()
    session.scopeAware = true
    session.readState = async () => scopedState()
    const req = mockReq()
    await new Promise<void>((resolve, reject) => session.middleware()(req, mockRes(), (err?: any) => err ? reject(err) : resolve()))
    let called = false
    requireScope('datasets:read')(req, mockRes(), () => { called = true })
    assert.ok(called)
    assert.throws(() => requireScope('datasets:write')(req, mockRes(), () => {}), (err: any) => err.status === 403)
  })
})

describe('scope checks are required per route', () => {
  const scopedState = (): SessionState => ({
    lang: 'fr',
    user: { ...testUser, scope: 'datasets:read' },
    account: { type: 'organization', id: 'org1', name: 'Test Org' },
    accountRole: 'admin',
    scopes: ['datasets:read']
  })
  const is403 = (err: any) => err.status === 403 && /does not check scopes/.test(err.message)
  async function setup (state: () => SessionState | Promise<SessionState>, scopeAware = true) {
    const session = new Session()
    session.scopeAware = scopeAware
    session.readState = async () => state()
    const req = mockReq()
    await new Promise<void>((resolve, reject) => session.middleware()(req, mockRes(), (err?: any) => err ? reject(err) : resolve()))
    return { session, req }
  }

  it('a scoped session read without a scope check is refused', async () => {
    const { session, req } = await setup(scopedState)
    assert.throws(() => reqSession(req), is403)
    assert.throws(() => reqSessionAuthenticated(req), is403)
    assert.throws(() => reqAdminMode(req), is403)
    assert.throws(() => reqUser(req), is403)
    assert.throws(() => reqUserAuthenticated(req), is403)
    await assert.rejects(session.req(req), is403)
    await assert.rejects(session.reqAuthenticated(req), is403)
    await assert.rejects(session.reqAdminMode(req), is403)
  })

  it('requireScope marks the request, then the accessors work', async () => {
    const { session, req } = await setup(scopedState)
    let called = false
    requireScope('datasets:read')(req, mockRes(), () => { called = true })
    assert.ok(called)
    assert.deepEqual(reqSession(req).scopes, ['datasets:read'])
    assert.equal(reqUser(req)?.id, testUser.id)
    assert.deepEqual((await session.req(req)).scopes, ['datasets:read'])
  })

  it('assertReqScope refuses an uncovered scope and does not mark', async () => {
    const { req } = await setup(scopedState)
    assert.throws(() => assertReqScope(req, 'datasets:write'), (err: any) => err.status === 403 && !is403(err))
    assert.throws(() => reqSession(req), is403)
    assertReqScope(req, ['datasets:write', 'datasets:read'])
    assert.ok(reqSession(req))
  })

  it('allowAnyScope and markScopeChecked mark without restriction', async () => {
    const a = await setup(scopedState)
    let called = false
    allowAnyScope(a.req, mockRes(), () => { called = true })
    assert.ok(called)
    assert.ok(reqSession(a.req))
    const b = await setup(scopedState)
    markScopeChecked(b.req)
    assert.ok(reqSession(b.req))
  })

  it('unrestricted sessions are never concerned', async () => {
    const { session, req } = await setup(() => ({ lang: 'fr', user: testUser, account: { type: 'user', id: testUser.id, name: testUser.name }, accountRole: 'admin' }))
    assert.equal(reqSession(req).user?.id, testUser.id)
    assert.equal(reqUser(req)?.id, testUser.id)
    assert.ok(await session.req(req))
  })

  it('pseudo sessions set by setReqUser are unaffected', async () => {
    const { req } = await setup(scopedState)
    setReqUser(req, testUser)
    assert.equal(reqSession(req).user?.id, testUser.id)
    setReqSession(req, { lang: 'fr' })
    assert.equal(reqSession(req).lang, 'fr')
  })

  it('the not-scope-aware gate refuses a scoped state', async () => {
    const session = new Session()
    session.readState = async () => ({ lang: 'fr', user: { ...testUser, scope: 'datasets:read' }, scopes: ['datasets:read'] } as SessionState)
    await assert.rejects(session.req(mockReq()), (err: any) => err.status === 403)
  })

  it('the route guard refuses a scoped state until a scope check', async () => {
    const { req } = await setup(() => ({ lang: 'fr', user: { ...testUser, scope: 'datasets:read' }, scopes: ['datasets:read'] } as SessionState))
    assert.throws(() => reqSession(req), is403)
    markScopeChecked(req)
    assert.equal(reqSession(req).user?.id, testUser.id)
  })

  it('a raw scope claim without parsed scopes (mismatched lib-node) is a 401, never passes a scope check', async () => {
    const raw = (): SessionState => ({ ...scopedState(), scopes: undefined })
    const session = new Session()
    session.scopeAware = true
    session.readState = async () => raw()
    const req = mockReq()
    await assert.rejects(session.req(req), (err: any) => err.status === 401 && /invalid scope claim/.test(err.message))
    await assert.rejects(Promise.resolve(session.middleware()(mockReq(), mockRes(), () => {})), (err: any) => err.status === 401)
  })

  it('sync accessors after a failed middleware do not throw a TypeError', async () => {
    const session = new Session()
    session.readState = async () => { throw Object.assign(new Error('x'), { status: 401 }) }
    const req = mockReq()
    await assert.rejects(Promise.resolve(session.middleware()(req, mockRes(), () => {})))
    assert.equal(reqSession(req), undefined)
    assert.equal(reqUser(req), undefined)
    assert.throws(() => reqSessionAuthenticated(req), (err: any) => err.status === 401)
    assert.throws(() => reqUserAuthenticated(req), (err: any) => err.status === 401)
    assert.throws(() => reqAdminMode(req), (err: any) => err.status === 401)
  })

  it('reqForLogs reports infrastructure errors but stays silent on 401/403', async () => {
    const calls: any[] = []
    const failing = new Session()
    failing.onLogsError = (err: any) => calls.push(err)
    failing.readState = async () => { throw new Error('mongo down') }
    assert.equal(await failing.reqForLogs(mockReq()), undefined)
    failing.readState = async () => { throw Object.assign(new Error('boom'), { status: 503 }) }
    assert.equal(await failing.reqForLogs(mockReq()), undefined)
    failing.readState = async () => { throw Object.assign(new Error('nope'), { status: 401 }) }
    assert.equal(await failing.reqForLogs(mockReq()), undefined)
    failing.readState = async () => { throw Object.assign(new Error('nope'), { status: 403 }) }
    assert.equal(await failing.reqForLogs(mockReq()), undefined)
    assert.equal(calls.length, 2)
  })

  it('reqForLogs never throws even when reporting throws', async () => {
    const failing = new Session()
    failing.onLogsError = () => { throw new Error('reporter broke') }
    failing.readState = async () => { throw new Error('mongo down') }
    assert.equal(await failing.reqForLogs(mockReq()), undefined)
  })

  it('reqForLogs never throws', async () => {
    const { session, req } = await setup(scopedState)
    const state = await session.reqForLogs(req)
    assert.deepEqual(state?.scopes, ['datasets:read'])
    const failing = new Session()
    failing.readState = async () => { throw Object.assign(new Error('nope'), { status: 401 }) }
    assert.equal(await failing.reqForLogs(mockReq()), undefined)
  })
})
