import type { IncomingMessage } from 'node:http'
import type { RequestHandler, Request } from 'express'
import { escapeRegExp } from '@data-fair/lib-utils/micro-template.js'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import { reqOrigin, reqIsInternal } from '@data-fair/lib-express'

export const createPrefixRegexp = (servicePathPart: string) => new RegExp(`(.*?)\\/${escapeRegExp(servicePathPart)}(\\/|$)`)

const reqSitePathKey = Symbol('reqSitePath')

/**
 * extract site path prefix from url and strip the full service prefix for next routes
 */
export function createSiteMiddleware (servicePathPart: string, prefixOptional?: boolean): RequestHandler {
  const prefixRegexp = createPrefixRegexp(servicePathPart)
  return (req, res, next) => {
    if (reqIsInternal(req)) {
      if (req.url.startsWith('/' + servicePathPart + '/')) {
        req.url = req.url.slice(servicePathPart.length + 1)
      }
      return next()
    }

    const match = req.url.match(prefixRegexp)
    if (match) {
      // @ts-ignore
      req[reqSitePathKey] = match[1]
      req.url = req.url.slice(match[1].length + servicePathPart.length + 1)
    } else {
      if (!prefixOptional) throw httpError(404, 'URL path does not contain service prefix')
      // case where the prefix was removed by the reverse proxy
      // @ts-ignore
      req[reqSitePathKey] = ''
    }

    next()
  }
}

export function reqSitePath (req: Request | IncomingMessage): string {
  // @ts-ignore
  const sitePath = req[reqSitePathKey]
  if (sitePath === undefined) throw httpError(500, 'reqSitePath was not set, either createSiteMiddleware was not called or this HTTP request is internal')
  return sitePath
}

export function reqSitePathSafe (req: Request | IncomingMessage): string {
  // @ts-ignore
  return req[reqSitePathKey] ?? ''
}

export function reqSiteUrl (req: Request): string {
  return reqOrigin(req) + reqSitePath(req)
}
