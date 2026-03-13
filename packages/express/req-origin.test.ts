import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { reqOrigin, reqHost, reqIp, reqIsInternal, assertReqInternal, assertReqInternalSecret } from './req-origin.js'
import type { Request } from 'express'

function mockReq (headers: Record<string, string>, query: Record<string, string> = {}): Request {
  return {
    get: (name: string) => headers[name.toLowerCase()],
    query
  } as unknown as Request
}

describe('reqHost', () => {
  it('should return the forwarded host', () => {
    const req = mockReq({ 'x-forwarded-host': 'example.com' })
    assert.equal(reqHost(req), 'example.com')
  })

  it('should take first value from comma-separated list', () => {
    const req = mockReq({ 'x-forwarded-host': 'example.com, proxy.com' })
    assert.equal(reqHost(req), 'example.com')
  })

  it('should throw when header is missing', () => {
    const req = mockReq({})
    assert.throws(() => reqHost(req), /X-Forwarded-Host/)
  })
})

describe('reqOrigin', () => {
  it('should build origin from forwarded headers', () => {
    const req = mockReq({
      'x-forwarded-host': 'example.com',
      'x-forwarded-proto': 'https'
    })
    assert.equal(reqOrigin(req), 'https://example.com')
  })

  it('should include non-default port', () => {
    const req = mockReq({
      'x-forwarded-host': 'example.com:8080',
      'x-forwarded-proto': 'https'
    })
    assert.equal(reqOrigin(req), 'https://example.com:8080')
  })

  it('should omit default https port 443', () => {
    const req = mockReq({
      'x-forwarded-host': 'example.com:443',
      'x-forwarded-proto': 'https'
    })
    assert.equal(reqOrigin(req), 'https://example.com')
  })

  it('should omit default http port 80', () => {
    const req = mockReq({
      'x-forwarded-host': 'example.com:80',
      'x-forwarded-proto': 'http'
    })
    assert.equal(reqOrigin(req), 'http://example.com')
  })

  it('should use x-forwarded-port when present', () => {
    const req = mockReq({
      'x-forwarded-host': 'example.com',
      'x-forwarded-proto': 'https',
      'x-forwarded-port': '9090'
    })
    assert.equal(reqOrigin(req), 'https://example.com:9090')
  })

  it('should throw when x-forwarded-proto is missing', () => {
    const req = mockReq({ 'x-forwarded-host': 'example.com' })
    assert.throws(() => reqOrigin(req), /X-Forwarded-Proto/)
  })
})

describe('reqIp', () => {
  it('should return valid IP', () => {
    const req = mockReq({ 'x-forwarded-for': '192.168.1.1' })
    assert.equal(reqIp(req), '192.168.1.1')
  })

  it('should take first IP from comma-separated list', () => {
    const req = mockReq({ 'x-forwarded-for': '10.0.0.1, 192.168.1.1' })
    assert.equal(reqIp(req), '10.0.0.1')
  })

  it('should accept IPv6', () => {
    const req = mockReq({ 'x-forwarded-for': '::1' })
    assert.equal(reqIp(req), '::1')
  })

  it('should throw on missing header', () => {
    const req = mockReq({})
    assert.throws(() => reqIp(req), /X-Forwarded-For/)
  })

  it('should throw on invalid IP', () => {
    const req = mockReq({ 'x-forwarded-for': 'not-an-ip' })
    assert.throws(() => reqIp(req), /not valid/)
  })
})

describe('reqIsInternal', () => {
  it('should return true when no forwarded host', () => {
    const req = mockReq({})
    assert.equal(reqIsInternal(req), true)
  })

  it('should return false when forwarded host present', () => {
    const req = mockReq({ 'x-forwarded-host': 'example.com' })
    assert.equal(reqIsInternal(req), false)
  })
})

describe('assertReqInternal', () => {
  it('should pass for internal requests', () => {
    const req = mockReq({})
    assert.doesNotThrow(() => assertReqInternal(req))
  })

  it('should throw 421 for external requests', () => {
    const req = mockReq({ 'x-forwarded-host': 'example.com' })
    try {
      assertReqInternal(req)
      assert.fail('should have thrown')
    } catch (err: any) {
      assert.equal(err.status, 421)
    }
  })
})

describe('assertReqInternalSecret', () => {
  it('should pass with correct header secret', () => {
    const req = mockReq({ 'x-secret-key': 'my-secret' })
    assert.doesNotThrow(() => assertReqInternalSecret(req, 'my-secret'))
  })

  it('should pass with correct query param secret', () => {
    const req = mockReq({}, { key: 'my-secret' })
    assert.doesNotThrow(() => assertReqInternalSecret(req, 'my-secret'))
  })

  it('should throw 401 with wrong secret', () => {
    const req = mockReq({ 'x-secret-key': 'wrong' })
    try {
      assertReqInternalSecret(req, 'my-secret')
      assert.fail('should have thrown')
    } catch (err: any) {
      assert.equal(err.status, 401)
    }
  })

  it('should throw 421 for external requests', () => {
    const req = mockReq({ 'x-forwarded-host': 'example.com', 'x-secret-key': 'my-secret' })
    try {
      assertReqInternalSecret(req, 'my-secret')
      assert.fail('should have thrown')
    } catch (err: any) {
      assert.equal(err.status, 421)
    }
  })

  it('should throw 401 when no secret provided', () => {
    const req = mockReq({})
    try {
      assertReqInternalSecret(req, 'my-secret')
      assert.fail('should have thrown')
    } catch (err: any) {
      assert.equal(err.status, 401)
    }
  })
})
