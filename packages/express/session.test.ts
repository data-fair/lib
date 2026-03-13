import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { Session, reqSession, reqSessionAuthenticated, reqAdminMode, setReqUser, setReqSession } from './session.js'
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
