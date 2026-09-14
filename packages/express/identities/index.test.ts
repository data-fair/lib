import { describe, it, before, after, beforeEach } from 'node:test'
import { strict as assert } from 'assert'
import express from 'express'
import type { Server } from 'node:http'
import { createIdentitiesRouter, type IdentityUpdate, type IdentityDelete } from './index.js'

const secretKey = 'test-secret'
const updates: IdentityUpdate[] = []
const deletes: IdentityDelete[] = []
let server: Server
let baseUrl: string

before(async () => {
  const app = express()
  app.use(express.json())
  app.use('/api/identities', createIdentitiesRouter(
    secretKey,
    async (identity) => { updates.push(identity) },
    async (identity) => { deletes.push(identity) }
  ))
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.status(err.status ?? 500).send(err.message)
  })
  await new Promise<void>(resolve => { server = app.listen(0, () => resolve()) })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('unexpected server address')
  baseUrl = `http://127.0.0.1:${address.port}/api/identities`
})

after(() => server.close())

beforeEach(() => {
  updates.length = 0
  deletes.length = 0
})

const call = (method: string, path: string, opts: { key?: string, headers?: Record<string, string>, body?: any } = {}) => {
  const url = new URL(baseUrl + path)
  if (opts.key !== undefined) url.searchParams.set('key', opts.key)
  return fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...opts.headers },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body)
  })
}

describe('createIdentitiesRouter', () => {
  it('should refuse a request from outside the platform', async () => {
    const res = await call('POST', '/user/u1', { key: secretKey, headers: { 'x-forwarded-host': 'example.com' }, body: { name: 'User 1' } })
    assert.equal(res.status, 421)
    assert.equal(updates.length, 0)
  })

  it('should refuse a missing or bad secret key', async () => {
    assert.equal((await call('POST', '/user/u1', { body: { name: 'User 1' } })).status, 401)
    assert.equal((await call('POST', '/user/u1', { key: 'bad', body: { name: 'User 1' } })).status, 401)
    assert.equal((await call('DELETE', '/user/u1', { key: 'bad' })).status, 401)
    assert.equal(updates.length, 0)
    assert.equal(deletes.length, 0)
  })

  it('should refuse everything when the service has no secret key', async () => {
    const app = express()
    app.use('/api/identities', createIdentitiesRouter(undefined, async () => {}, async () => {}))
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(err.status ?? 500).send(err.message)
    })
    const noSecretServer = app.listen(0)
    const address = noSecretServer.address()
    if (!address || typeof address === 'string') throw new Error('unexpected server address')
    const res = await fetch(`http://127.0.0.1:${address.port}/api/identities/user/u1`, { method: 'DELETE' })
    assert.equal(res.status, 401)
    noSecretServer.close()
  })

  it('should accept the secret key in the x-secret-key header', async () => {
    const res = await call('POST', '/user/u1', { headers: { 'x-secret-key': secretKey }, body: { name: 'User 1' } })
    assert.equal(res.status, 200)
    assert.equal(updates.length, 1)
  })

  it('should validate the update request', async () => {
    assert.equal((await call('POST', '/user/u1', { key: secretKey, body: {} })).status, 400)
    assert.equal((await call('POST', '/group/g1', { key: secretKey, body: { name: 'Group' } })).status, 400)
    assert.equal(updates.length, 0)
  })

  it('should pass the full identity state to onUpdate', async () => {
    const body = {
      name: 'Org 1',
      departments: [{ id: 'dep1', name: 'Department 1' }],
      partners: [{ id: 'org2', name: 'Org 2' }]
    }
    const res = await call('POST', '/organization/org1', { key: secretKey, body })
    assert.equal(res.status, 200)
    assert.deepEqual(updates, [{ type: 'organization', id: 'org1', ...body }])

    await call('POST', '/user/u1', { key: secretKey, body: { name: 'User 1', organizations: [{ id: 'org1', role: 'admin', department: 'dep1' }] } })
    assert.deepEqual(updates[1], { type: 'user', id: 'u1', name: 'User 1', organizations: [{ id: 'org1', role: 'admin', department: 'dep1' }] })
  })

  it('should pass the identity to onDelete', async () => {
    const res = await call('DELETE', '/organization/org1', { key: secretKey })
    assert.equal(res.status, 200)
    assert.deepEqual(deletes, [{ type: 'organization', id: 'org1' }])
  })

  it('should respond only once the hook is finished', async () => {
    let finished = false
    const app = express()
    app.use(express.json())
    app.use('/api/identities', createIdentitiesRouter(secretKey, async () => {}, async () => {
      await new Promise(resolve => setTimeout(resolve, 50))
      finished = true
    }))
    const slowServer = app.listen(0)
    const address = slowServer.address()
    if (!address || typeof address === 'string') throw new Error('unexpected server address')
    const res = await fetch(`http://127.0.0.1:${address.port}/api/identities/user/u1?key=${secretKey}`, { method: 'DELETE' })
    assert.equal(res.status, 200)
    assert.equal(finished, true)
    slowServer.close()
  })

  it('should not implement the report route', async () => {
    const res = await call('GET', '/user/u1/report', { key: secretKey })
    assert.equal(res.status, 501)
  })
})
