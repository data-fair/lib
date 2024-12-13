import type { Request } from 'express'
import { isIP } from 'node:net'
import { httpError } from '@data-fair/lib-utils/http-errors.js'

export const reqHost = (req: Request) => {
  const forwardedHost = req.get('x-forwarded-host')
  if (!forwardedHost) throw new Error('The "X-Forwarded-Host" header is required, please check the configuration of the reverse-proxy.')
  return forwardedHost
}

/**
 * similar to https://www.npmjs.com/package/original-url but with these specificities:
 *  - we don't care for the path
 *  - only based on the de-facto standard x-forwarded-* headers
 *  - we make these headers required
 *  - limiting the accepted headers and making them required removes any ambiguity that could be exploited
 */
export const reqOrigin = (req: Request) => {
  const host = reqHost(req)

  const forwardedProto = req.get('x-forwarded-proto')
  if (!forwardedProto) throw new Error('The "X-Forwarded-Proto" header is required, please check the configuration of the reverse-proxy.')

  const origin = `${forwardedProto}://${host}`
  const port = req.get('x-forwarded-port')
  if (port && !(port === '443' && forwardedProto === 'https') && !(port === '80' && forwardedProto === 'http')) {
    return origin + ':' + port
  } else {
    return origin
  }
}

export const reqIp = (req: Request) => {
  const ip = req.get('x-forwarded-for')
  if (!ip) throw new Error('The "X-Forwarded-For" header is required, please check the configuration of the reverse-proxy.')
  if (!isIP(ip)) throw new Error(`The "X-Forwarded-For" header should contain an IP. "${ip}" is not valid.`)
  return ip
}

export const reqIsInternal = (req: Request) => {
  return !req.get('x-forwarded-host')
}

export const assertReqInternal = (req: Request) => {
  // when an environment makes service to service calls using public urls this check can be disabled
  if (process.env.IGNORE_ASSERT_REQ_INTERNAL === 'true' || process.env.IGNORE_ASSERT_REQ_INTERNAL === '1') return
  if (!reqIsInternal(req)) throw httpError(421, 'This endpoint should only be used internally.')
}

export const assertReqInternalSecret = (req: Request, expectedSecretKey: string) => {
  assertReqInternal(req)
  let secretKey = req.get('x-secret-key')
  if (!secretKey && typeof req.query.key === 'string') {
    console.warn('passing internal secret key through query parameter is not recommended, use x-secret-key header')
    secretKey = req.query.key
  }
  if (!secretKey || expectedSecretKey !== secretKey) throw httpError(401, 'Bad secret key')
}

export default reqOrigin
