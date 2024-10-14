import type { RequestHandler, Request } from 'express'
import { escapeRegExp } from '@data-fair/lib-utils/micro-template.js'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import { reqOrigin, reqIsInternal } from '@data-fair/lib-express'

export const createPrefixRegexp = (servicePathPart: string) => new RegExp(`(.*?)\\/${escapeRegExp(servicePathPart)}(\\/|$)`)

const reqSitePathKey = Symbol('reqSitePath')

/**
 * extract site path prefix from url and strip the full service prefix for next routes
 */
export function createSiteMiddleware (servicePathPart: string): RequestHandler {
  const prefixRegexp = createPrefixRegexp(servicePathPart)
  return (req, res, next) => {
    const match = req.url.match(prefixRegexp)
    if (!match) {
      if (reqIsInternal(req)) return next()
      throw httpError(404, 'URL path does not contain service prefix')
    }

    // @ts-ignore
    req[reqSitePathKey] = match[1]

    req.url = req.url.slice(match[1].length + servicePathPart.length + 1)
    next()
  }
}

export function reqSitePath (req: Request): string {
  // @ts-ignore
  const sitePath = req[reqSitePathKey]
  if (sitePath === undefined) throw httpError(500, 'reqSitePath was not set, either createSiteMiddleware was not called ot this HTTP request is internal')
  return sitePath
}

export function reqSiteUrl (req: Request): string {
  return reqOrigin(req) + reqSitePath(req)
}
