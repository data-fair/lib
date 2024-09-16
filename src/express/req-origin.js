import { isIP } from 'node:net'
import { httpError } from '@data-fair/lib/http-errors.js'

/**
 * similar to https://www.npmjs.com/package/original-url but with these specificities:
 *  - we don't care for the path
 *  - only based on the de-facto standard x-forwarded-* headers
 *  - we make these headers required
 *  - limiting the accepted headers and making them required removes any ambiguity that could be exploited
 * @param {import('express').Request} req
 */
export const reqOrigin = (req) => {
  const forwardedHost = req.get('x-forwarded-host')
  if (!forwardedHost) throw new Error('The "X-Forwarded-Host" header is required, please check the configuration of the reverse-proxy.')

  const forwardedProto = req.get('x-forwarded-proto')
  if (!forwardedProto) throw new Error('The "X-Forwarded-Proto" header is required, please check the configuration of the reverse-proxy.')

  const origin = `${forwardedProto}://${forwardedHost}`
  const port = req.get('x-forwarded-port')
  if (port && !(port === '443' && forwardedProto === 'https') && !(port === '80' && forwardedProto === 'http')) {
    return origin + ':' + port
  } else {
    return origin
  }
}

/**
 * @param {import('express').Request} req
 */
export const reqIp = (req) => {
  const ip = req.get('x-forwarded-for')
  if (!ip) throw new Error('The "X-Forwarded-For" header is required, please check the configuration of the reverse-proxy.')
  if (!isIP(ip)) throw new Error(`The "X-Forwarded-For" header should contain an IP. "${ip}" is not valid.`)
  return ip
}

/**
 * @param {import('express').Request} req
 */
export const reqIsInternal = (req) => {
  return !req.get('x-forwarded-host')
}

/**
 * @param {import('express').Request} req
 */
export const assertReqInternal = (req) => {
  // when an environment makes service to service calls using public urls this check can be disabled
  if (process.env.IGNORE_ASSERT_REQ_INTERNAL === 'true' || process.env.IGNORE_ASSERT_REQ_INTERNAL === '1') return
  if (!reqIsInternal(req)) throw httpError(421, 'This endpoint should only be used internally.')
}

export default reqOrigin
