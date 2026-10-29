import type { Request } from 'express'
import type { IncomingMessage } from 'node:http'
import { isIP } from 'node:net'
import { createHash, timingSafeEqual } from 'node:crypto'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import log from '@data-fair/lib-node/log.js'

export const reqHost = (req: Request) => {
  const forwardedHost = req.get('x-forwarded-host')
  if (!forwardedHost) throw new Error('The "X-Forwarded-Host" header is required, please check the configuration of the reverse-proxy.')
  return forwardedHost.split(',')[0]
}

/**
 * similar to https://www.npmjs.com/package/original-url but with these specificities:
 *  - we don't care for the path
 *  - only based on the de-facto standard x-forwarded-* headers
 *  - we make these headers required
 *  - limiting the accepted headers and making them required removes any ambiguity that could be exploited
 */
export const reqOrigin = (req: Request) => {
  let [host, port] = reqHost(req).split(':')

  let forwardedProto = req.get('x-forwarded-proto')
  if (!forwardedProto) throw new Error('The "X-Forwarded-Proto" header is required, please check the configuration of the reverse-proxy.')
  forwardedProto = forwardedProto.split(',')[0]

  const origin = `${forwardedProto}://${host}`

  // we didn't make x-forwarded-port required contrary to x-forwarded-host and x-forwarded-proto
  // sometimes the port is passed as part of x-forwarded-host
  const forwardedPort = req.get('x-forwarded-port')
  if (forwardedPort) port = forwardedPort.split(',')[0]

  if (port && !(port === '443' && forwardedProto === 'https') && !(port === '80' && forwardedProto === 'http')) {
    return origin + ':' + port
  } else {
    return origin
  }
}

// first occurrence in the process, then at most hourly: an appending environment would otherwise
// log an error per request and bury the cause in its own noise
const FLAG_INTERVAL_MS = 60 * 60 * 1000
let lastFlagged: number | undefined
const flagAppendedForwardedFor = (value: string) => {
  const now = Date.now()
  if (lastFlagged !== undefined && now - lastFlagged < FLAG_INTERVAL_MS) return
  lastFlagged = now
  log.error(`X-Forwarded-For holds several IPs ("${value}"): a layer appends to it, so its first entry can be chosen by the client. The edge proxy must overwrite it with the client address.`, { code: 'x-forwarded-for-several' })
}

// read from req.headers and not req.get: this is also used on the plain IncomingMessage
// of a websocket upgrade, where the express helpers are not available
//
// Strict by default: a request is limited by its user or by this IP, and one with neither is a
// misconfiguration. `optional` is for the places where no client IP is legitimate (audit logs, a
// relay deciding what to forward): undefined without the header, still an error on a non-IP value.
export function reqIp (req: Request | IncomingMessage): string
export function reqIp (req: Request | IncomingMessage, options: { optional: true }): string | undefined
export function reqIp (req: Request | IncomingMessage, options?: { optional?: boolean }): string | undefined {
  const forwardedFor = req.headers['x-forwarded-for']
  let ip = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  if (!ip) {
    if (options?.optional) return undefined
    throw new Error('The "X-Forwarded-For" header is required, please check the configuration of the reverse-proxy.')
  }
  // The edge proxy should overwrite the header with the client address (a trusted relay's value
  // included, see data-fair docs/architecture/agent-rate-limiting.md). Several entries mean a layer
  // appended to it, so the first one may be what the client chose: it is still the origin and is
  // used, but the environment is flagged rather than failing every request of a live deployment.
  if (ip.includes(',')) {
    flagAppendedForwardedFor(ip)
    ip = ip.split(',')[0]
  }
  ip = ip.trim()
  if (!isIP(ip)) throw new Error(`The "X-Forwarded-For" header should contain an IP. "${ip}" is not valid.`)
  return ip
}

/**
 * The key a per-IP rate limiter uses for a client IP (from reqIp). An IPv6 host usually controls a
 * whole /64 and can pick a new address in it per request, so it is limited as its /64; an
 * IPv4-mapped IPv6 address is its IPv4.
 */
export function ipRateLimitKey (ip: string): string {
  if (isIP(ip) !== 6) return ip
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)
  if (mapped) return mapped[1]
  const [head, tail] = ip.toLowerCase().split('::')
  const headGroups = head ? head.split(':') : []
  const tailGroups = tail ? tail.split(':') : []
  const groups = tail === undefined ? headGroups : [...headGroups, ...Array(8 - headGroups.length - tailGroups.length).fill('0'), ...tailGroups]
  return groups.slice(0, 4).map(g => parseInt(g, 16).toString(16)).join(':') + '::/64'
}

export const reqIsInternal = (req: Request) => {
  return !req.get('x-forwarded-host')
}

export const assertReqInternal = (req: Request) => {
  // when an environment makes service to service calls using public urls this check can be disabled
  if (process.env.IGNORE_ASSERT_REQ_INTERNAL === 'true' || process.env.IGNORE_ASSERT_REQ_INTERNAL === '1') return
  if (!reqIsInternal(req)) throw httpError(421, 'This endpoint should only be used internally.')
}

const digest = (value: string) => createHash('sha256').update(value).digest()

/**
 * Compare a received secret with the configured one, in constant time.
 *
 * Use it instead of `===` / `!==`, which return as soon as a character differs and let a caller
 * able to time many requests recover the key one character at a time. Both values are hashed so
 * the compared buffers have equal lengths (timingSafeEqual requires it), which leaks neither the
 * key nor its length.
 *
 * Takes the raw values: anything but a non-empty string on either side never matches, so an
 * unconfigured secret or a missing / repeated query parameter (`req.query.key`) is a refusal.
 */
export const secretKeyMatches = (secretKey: unknown, expectedSecretKey: unknown): boolean => {
  if (typeof secretKey !== 'string' || typeof expectedSecretKey !== 'string' || !secretKey || !expectedSecretKey) return false
  return timingSafeEqual(digest(secretKey), digest(expectedSecretKey))
}

export const assertReqInternalSecret = (req: Request, expectedSecretKey: string) => {
  assertReqInternal(req)
  let secretKey = req.get('x-secret-key')
  if (!secretKey && typeof req.query.key === 'string') {
    log.warn('passing internal secret key through query parameter is not recommended, use x-secret-key header')
    secretKey = req.query.key
  }
  if (!secretKeyMatches(secretKey, expectedSecretKey)) throw httpError(401, 'Bad secret key')
}

export default reqOrigin
