import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { IncomingMessage } from 'node:http'
import { Socket } from 'node:net'
import { subscribeDecision, subscribeForRequest } from './ws-server.js'
import { session } from './session.js'
import type { SessionState } from '@data-fair/lib-common-types/session/index.js'

const user = { email: 'a@b.c', id: 'u1', name: 'U', organizations: [] }
const unrestricted = { user } as unknown as SessionState
const scoped = { user, scopes: ['datasets:read'] } as unknown as SessionState
const rawClaimOnly = { user: { ...user, scope: 'datasets:read' } } as unknown as SessionState
const adminState = { user: { ...user, adminMode: 1 } } as unknown as SessionState

const counter = (result = true) => {
  const calls: string[] = []
  return { calls, fn: async (channel: string) => { calls.push(channel); return result } }
}

describe('ws-server subscribeDecision', () => {
  it('unrestricted session: canSubscribe decides', async () => {
    const c = counter()
    assert.deepEqual(await subscribeDecision(unrestricted, 'ch', {}, c.fn), { ok: true })
    assert.equal(c.calls.length, 1)
    const d = counter(false)
    const refused: any = await subscribeDecision(unrestricted, 'ch', {}, d.fn)
    assert.equal(refused.status, 403)
  })

  it('adminMode does not bypass canSubscribe for a scoped state', async () => {
    const c = counter(false)
    const st = { user: { ...user, adminMode: 1 }, scopes: ['datasets:read'] } as unknown as SessionState
    const r: any = await subscribeDecision(st, 'ch', {}, c.fn, () => ['datasets:read'])
    assert.equal(r.status, 403)
    assert.equal(c.calls.length, 1)
  })

  it('adminMode bypasses canSubscribe', async () => {
    const c = counter(false)
    assert.deepEqual(await subscribeDecision(adminState, 'ch', {}, c.fn), { ok: true })
    assert.equal(c.calls.length, 0)
  })

  it('scoped session without channelScopes is refused', async () => {
    const c = counter()
    const r: any = await subscribeDecision(scoped, 'ch', {}, c.fn)
    assert.equal(r.status, 403)
    assert.equal(r.data, 'scope-restricted sessions cannot subscribe to this channel')
    assert.equal(c.calls.length, 0)
  })

  it('scoped session on a channel without accepted scopes is refused', async () => {
    const c = counter()
    const r: any = await subscribeDecision(scoped, 'ch', {}, c.fn, () => undefined)
    assert.equal(r.status, 403)
    assert.equal(c.calls.length, 0)
  })

  it('scoped session with an accepted scope reaches canSubscribe', async () => {
    const c = counter()
    assert.deepEqual(await subscribeDecision(scoped, 'ch', {}, c.fn, () => ['datasets:read']), { ok: true })
    assert.equal(c.calls.length, 1)
    const d = counter(false)
    const refused: any = await subscribeDecision(scoped, 'ch', {}, d.fn, () => ['datasets:read'])
    assert.equal(refused.status, 403)
  })

  it('scoped session with an uncovered scope is refused', async () => {
    const c = counter()
    const r: any = await subscribeDecision(scoped, 'ch', {}, c.fn, () => ['datasets:write'])
    assert.equal(r.status, 403)
    assert.equal(c.calls.length, 0)
  })

  it('raw claim only state is refused', async () => {
    const c = counter()
    const r: any = await subscribeDecision(rawClaimOnly, 'ch', {}, c.fn, () => ['datasets:read'])
    assert.equal(r.status, 403)
    assert.equal(c.calls.length, 0)
    const r2: any = await subscribeDecision(rawClaimOnly, 'ch', {}, c.fn)
    assert.equal(r2.status, 403)
  })
})

describe('ws-server subscribeForRequest', () => {
  const fakeReq = () => {
    const req = new IncomingMessage(new Socket())
    req.headers['x-test'] = '1'
    return req
  }
  const withState = async (state: SessionState, scopeAware: boolean, fn: () => Promise<void>) => {
    const s = session as any
    const orig = { readState: s.readState, scopeAware: s.scopeAware }
    s.readState = async (r: IncomingMessage) => { assert.equal(r.headers['x-test'], '1'); return state }
    s.scopeAware = scopeAware
    try { await fn() } finally { Object.assign(s, orig) }
  }

  it('does not mark the upgrade request after a scoped subscribe', async () => {
    await withState(scoped, true, async () => {
      const req = fakeReq()
      const c = counter()
      const before = Object.getOwnPropertySymbols(req).length
      assert.deepEqual(await subscribeForRequest(req, 'ch', {}, c.fn, () => ['datasets:read']), { ok: true })
      assert.equal(Object.getOwnPropertySymbols(req).length, before, 'no symbol (mark, session cache) set on the upgrade req')
      // a later channel without accepted scopes is still refused
      const r: any = await subscribeForRequest(req, 'other', {}, c.fn, () => undefined)
      assert.equal(r.status, 403)
      assert.equal(c.calls.length, 1)
    })
  })

  it('a scoped session on a service that is not scope-aware is refused', async () => {
    await withState(scoped, false, async () => {
      const c = counter()
      await assert.rejects(subscribeForRequest(fakeReq(), 'ch', {}, c.fn, () => ['datasets:read']), (err: any) => err.status === 403)
      assert.equal(c.calls.length, 0)
    })
  })

  it('an unrestricted session reaches canSubscribe', async () => {
    await withState(unrestricted, false, async () => {
      const c = counter()
      assert.deepEqual(await subscribeForRequest(fakeReq(), 'ch', {}, c.fn), { ok: true })
      assert.equal(c.calls.length, 1)
    })
  })
})
