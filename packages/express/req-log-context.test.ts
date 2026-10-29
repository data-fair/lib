import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import type { Request } from 'express'
import { reqLogFields, sessionLogFields } from './req-log-context.js'

const mockReq = (headers: Record<string, string>) => ({ headers, get: (name: string) => headers[name.toLowerCase()] }) as unknown as Request

describe('reqLogFields', () => {
  it('reads the client IP from X-Forwarded-For, not X-Client-IP', () => {
    assert.equal(reqLogFields(mockReq({ 'x-forwarded-for': '203.0.113.7', 'x-client-ip': '10.0.0.9', host: 'example.com' })).ip, '203.0.113.7')
  })

  it('has no IP for a request without one (an in-cluster call)', () => {
    assert.equal(reqLogFields(mockReq({ host: 'data-fair:8080' })).ip, undefined)
  })

  it('never throws on a malformed X-Forwarded-For', () => {
    assert.doesNotThrow(() => reqLogFields(mockReq({ 'x-forwarded-for': 'unknown', host: 'example.com' })))
    assert.equal(reqLogFields(mockReq({ 'x-forwarded-for': 'garbage, 1.2.3.4', host: 'example.com' })).ip, undefined)
  })

  it('normalizes internal hosts', () => {
    assert.equal(reqLogFields(mockReq({ host: 'example.com' })).host, 'example.com')
    assert.equal(reqLogFields(mockReq({ host: 'data-fair:8080' })).host, '-')
    assert.equal(reqLogFields(mockReq({ host: 'localhost:5600' })).host, '-')
    assert.equal(reqLogFields(mockReq({})).host, '-')
  })
})

describe('sessionLogFields', () => {
  it('describes the user and the active account', () => {
    const fields = sessionLogFields({ lang: 'fr', user: { id: 'u1', name: 'User 1', email: 'u@x.org', organizations: [] }, account: { type: 'organization', id: 'o1', name: 'Org 1', department: 'dep1' }, accountRole: 'admin' })
    assert.deepEqual(fields, { userId: 'u1', userName: 'User 1', accountKey: 'organization.o1', accountDep: 'dep1', accountName: 'Org 1' })
  })

  it('omits missing values', () => {
    assert.deepEqual(sessionLogFields({ lang: 'fr' }), {})
  })
})
