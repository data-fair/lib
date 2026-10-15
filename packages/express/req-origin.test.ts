import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { reqOrigin, reqHost, reqIp, ipRateLimitKey, reqIsInternal, assertReqInternal, assertReqInternalSecret, secretKeyMatches } from './req-origin.js'
import type { Request } from 'express'
import type { IncomingMessage } from 'node:http'

function mockReq (headers: Record<string, string>, query: Record<string, string> = {}): Request {
  return {
    headers,
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

  // the edge proxy should overwrite the header with the client address: several entries mean a layer
  // appended to it, so the first one may be what the client chose. Still the origin, so it is used,
  // but the environment is flagged (once, then at most hourly) instead of failing every request.
  it('should take the first of several IPs, and flag the environment once', () => {
    const errors: string[] = []
    const originalError = console.error
    console.error = (...args: unknown[]) => { errors.push(String(args[0])) }
    try {
      assert.equal(reqIp(mockReq({ 'x-forwarded-for': '10.0.0.1, 192.168.1.1' })), '10.0.0.1')
      assert.equal(reqIp(mockReq({ 'x-forwarded-for': '10.0.0.2, 192.168.1.1' })), '10.0.0.2')
    } finally {
      console.error = originalError
    }
    const flags = errors.filter(e => e.startsWith('[x-forwarded-for-several]'))
    assert.equal(flags.length, 1)
    assert.match(flags[0], /must overwrite it/)
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

  // websocket upgrades are handled on plain IncomingMessage, without the express helpers
  it('should work on a request without the express get method', () => {
    const req = { headers: { 'x-forwarded-for': '10.0.0.1' } } as unknown as IncomingMessage
    assert.equal(reqIp(req), '10.0.0.1')
  })

  describe('optional', () => {
    it('returns undefined when there is no X-Forwarded-For', () => {
      assert.equal(reqIp(mockReq({}), { optional: true }), undefined)
      // a relay acting for nobody's address sends its site but no client IP
      assert.equal(reqIp(mockReq({ 'x-forwarded-host': 'example.com' }), { optional: true }), undefined)
    })

    it('still reads the header when there is one', () => {
      assert.equal(reqIp(mockReq({ 'x-forwarded-for': ' 10.0.0.1 ' }), { optional: true }), '10.0.0.1')
    })

    it('takes the first of several IPs too', () => {
      assert.equal(reqIp(mockReq({ 'x-forwarded-for': '10.0.0.1, 192.168.1.1' }), { optional: true }), '10.0.0.1')
    })

    it('still throws on a value that is not an IP', () => {
      assert.throws(() => reqIp(mockReq({ 'x-forwarded-for': 'not-an-ip' }), { optional: true }), /not valid/)
    })

    it('works on a plain IncomingMessage (websocket upgrade)', () => {
      assert.equal(reqIp({ headers: {} } as unknown as IncomingMessage, { optional: true }), undefined)
    })
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

describe('secretKeyMatches', () => {
  it('should match the same secret only', () => {
    assert.equal(secretKeyMatches('my-secret', 'my-secret'), true)
    for (const wrong of ['my-secret-longer', 'my-secre', 'my-secreT', '']) {
      assert.equal(secretKeyMatches(wrong, 'my-secret'), false, wrong)
    }
  })

  it('should never match an unconfigured secret or a non-string value', () => {
    for (const expected of ['', undefined, null]) {
      assert.equal(secretKeyMatches('', expected), false)
      assert.equal(secretKeyMatches(undefined, expected), false)
    }
    // e.g. a repeated ?key= query parameter
    assert.equal(secretKeyMatches(['my-secret'], 'my-secret'), false)
    assert.equal(secretKeyMatches(undefined, 'my-secret'), false)
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

  it('should throw 401 with a secret of a different length, or a prefix of the right one', () => {
    for (const wrong of ['my-secret-longer', 'my-secre', 'my-secreT']) {
      const req = mockReq({ 'x-secret-key': wrong })
      assert.throws(() => assertReqInternalSecret(req, 'my-secret'), (err: any) => err.status === 401, wrong)
    }
  })

  it('should throw 401 when no secret is configured, whatever is sent', () => {
    for (const sent of ['', 'anything']) {
      const req = mockReq({ 'x-secret-key': sent })
      assert.throws(() => assertReqInternalSecret(req, ''), (err: any) => err.status === 401)
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

describe('ipRateLimitKey', () => {
  it('keeps an IPv4 address', () => {
    assert.equal(ipRateLimitKey('192.0.2.1'), '192.0.2.1')
  })
  it('keys an IPv6 address on its /64, however it is written', () => {
    assert.equal(ipRateLimitKey('2001:db8:1:2:aaaa:bbbb:cccc:dddd'), '2001:db8:1:2::/64')
    assert.equal(ipRateLimitKey('2001:DB8:0001:0002::5'), '2001:db8:1:2::/64')
    assert.equal(ipRateLimitKey('2001:db8::1'), '2001:db8:0:0::/64')
    assert.equal(ipRateLimitKey('::1'), '0:0:0:0::/64')
  })
  it('keys an IPv4-mapped IPv6 address on its IPv4', () => {
    assert.equal(ipRateLimitKey('::ffff:192.0.2.1'), '192.0.2.1')
  })
})
