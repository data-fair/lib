import { escapeRegExp } from '@data-fair/lib/micro-template.js'
import { httpError } from '@data-fair/lib/http-errors.js'
import { reqOrigin } from '@data-fair/lib/express/index.js'

/**
 * @param {string} servicePathPart
 */
export const createPrefixRegexp = (servicePathPart) => new RegExp(`(.*?)\\/${escapeRegExp(servicePathPart)}(\\/|$)`)

const reqSitePathKey = Symbol('reqSitePath')

/**
 * extract site path prefix from url and strip the full service prefix for next routes
 * @param {string} servicePathPart
 * @returns {import('express').RequestHandler}
 */
export const createSiteMiddleware = (servicePathPart) => {
  const prefixRegexp = createPrefixRegexp(servicePathPart)
  return (req, res, next) => {
    const match = req.url.match(prefixRegexp)
    if (!match) throw httpError(404, 'URL path does not contain service prefix')
    // @ts-ignore
    req[reqSitePathKey] = match[1]

    req.url = req.url.slice(match[1].length + servicePathPart.length + 1)
    next()
  }
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
export const reqSitePath = (req) => {
  // @ts-ignore
  const sitePath = req[reqSitePathKey]
  if (sitePath === undefined) throw httpError(500, 'reqSitePath was not set, please use createSiteMiddleware')
  return sitePath
}

/**
 * @param {import('express').Request} req
 * @returns {string}
 */
export const reqSiteUrl = (req) => {
  return reqOrigin(req) + reqSitePath(req)
}
