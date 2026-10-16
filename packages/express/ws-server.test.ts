import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { subscribeDecision } from './ws-server.js'
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
