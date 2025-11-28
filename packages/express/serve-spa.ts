// TODO: use sirv https://www.npmjs.com/package/sirv ?

import crypto from 'node:crypto'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import { static as expressStatic, type Request } from 'express'
import { reqSitePath, reqSiteUrl, reqOrigin } from '@data-fair/lib-express'
import serialize from 'serialize-javascript'

type CSPDirectives = Record<string, string | string[]>
type CSPHeader = string | CSPDirectives | boolean

export function getCSPHeaderFromDirectives (cspDirectives: CSPDirectives) {
  return Object.entries(cspDirectives).map(([key, value]) => `${key} ${Array.isArray(value) ? value.join(' ') : value}`).join('; ')
}

// similar to the default policy of helmet https://helmetjs.github.io/#content-security-policy
export const defaultCSPDirectives = {
  'default-src': "'self'",
  'base-uri': "'self'",
  'font-src': "'self'", // adjusted because we always self-host fonts
  'form-action': "'self'",
  'frame-ancestors': "'self'",
  'frame-src': "'self'",
  'img-src': "'self' data: blob: https:", // we often allow free img integration
  'object-src': "'none'",
  'script-src': "'self'",
  'script-src-attr': "'none'",
  'style-src': "'self' 'unsafe-inline'", // adjusted because we always self-host styles, unsafe-inline is mostly for vuetify
  // 'upgrade-insecure-requests': '', // not necessary and breaks on simple http instances
  'worker-src': "'self' blob:", // necessary for maplibre
  'child-src': "'self' blob:", // same
  'connect-src': "'self' https://koumoul.com" // used by fetch, xhr, etc. we allow specifically koumoul.com as it contains icons datasets for example
}
export const defaultCSPHeader = getCSPHeaderFromDirectives(defaultCSPDirectives)
export const defaultNonceCSPDirectives = {
  ...defaultCSPDirectives,
  'default-src': "'nonce-{NONCE}'",
  'script-src': "'nonce-{NONCE}'",
  'style-src': "'nonce-{NONCE}'"
}
export const defaultNonceCSPHeader = getCSPHeaderFromDirectives(defaultNonceCSPDirectives)

export function getCSPHeader (cspHeader: CSPHeader, nonce?: boolean) {
  if (typeof cspHeader === 'string') return cspHeader
  else if (cspHeader === true) return nonce ? defaultNonceCSPHeader : defaultCSPHeader
  else if (typeof cspHeader === 'object') return getCSPHeaderFromDirectives(cspHeader)
}

type ServeSpaOptions = {
  ignoreSitePath?: boolean,
  extraHtmlTemplateParams?: Record<string, string>
  csp?: {
    header: CSPHeader | ((req: Request) => CSPHeader),
    nonce?: boolean
  },
  getSiteExtraParams?: (siteUrl: string) => Promise<Record<string, string>>
}

async function createHtmlMiddleware (directory: string, baseParams: Record<string, string>, options?: ServeSpaOptions): Promise<import('express').RequestHandler> {
  const rawHtml = await readFile(join(directory, 'index.html'), 'utf8')
  const htmlCache: Record<string, string> = {}
  const cspHeaderOption = options?.csp?.header
  let rawCSPHeader: string | undefined
  if (cspHeaderOption && typeof cspHeaderOption !== 'function') rawCSPHeader = getCSPHeader(cspHeaderOption, options.csp?.nonce)

  return async (req, res, next) => {
    const sitePath = options?.ignoreSitePath ? '' : reqSitePath(req)
    let html = htmlCache[sitePath] = htmlCache[sitePath] ?? microTemplate(rawHtml, { ...options?.extraHtmlTemplateParams, ...baseParams, SITE_PATH: sitePath })

    if (options?.getSiteExtraParams) {
      const siteExtraParams = await options.getSiteExtraParams(options?.ignoreSitePath ? reqOrigin(req) : reqSiteUrl(req))
      html = microTemplate(html, siteExtraParams)
    }

    if (cspHeaderOption && typeof cspHeaderOption === 'function') {
      rawCSPHeader = getCSPHeader(cspHeaderOption(req), options.csp?.nonce)
    }
    if (options?.csp?.nonce) {
      const nonce = crypto.randomBytes(16).toString('base64')
      html = microTemplate(html, { CSP_NONCE: nonce })
      if (rawCSPHeader) {
        res.set('Content-Security-Policy', microTemplate(rawCSPHeader, { NONCE: nonce }))
      }
    } else if (rawCSPHeader) {
      res.set('Content-Security-Policy', rawCSPHeader)
    }
    res.type('html')
    res.set('Cache-Control', 'public, max-age=0, must-revalidate')
    res.send(html)
  }
}

// source code should always be hashed, a long cache duration is ok
const sourceMaxAge = 60 * 60 * 24 * 10 // 10 days
// static assets, images, etc are generally not hashed but a short cache is still ok
const fileMaxAge = 60 * 5 // 5 minutes

function createStaticMiddleware (directory: string): import('express').RequestHandler {
  return expressStatic(directory, {
    index: false,
    setHeaders: (res, path) => {
      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', `public, max-age=${sourceMaxAge}, immutable`)
      } else {
        res.setHeader('Cache-Control', 'public, max-age=' + fileMaxAge)
      }
    }
  })
}

/**
 * serve a built SPA from a directory
 */
export async function createSpaMiddleware (directory: string, uiConfig: any, options?: ServeSpaOptions): Promise<import('express').RequestHandler> {
  const { uiConfigStr, uiConfigJs, uiConfigPath } = prepareUiConfig(uiConfig)
  const baseParams = { UI_CONFIG: uiConfigStr, UI_CONFIG_PATH: uiConfigPath }

  const staticMiddleware = createStaticMiddleware(directory)
  const htmlMiddleware = await createHtmlMiddleware(directory, baseParams, options)
  return async (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(404).send()
    // force buffering, necessary for caching of source files in the reverse proxy
    res.setHeader('X-Accel-Buffering', 'yes')
    if (req.url.startsWith('/index.html')) {
      await htmlMiddleware(req, res, next)
    } else if (req.url === uiConfigPath) {
      res.type('application/javascript')
      res.setHeader('Cache-Control', `public, max-age=${sourceMaxAge}, immutable`)
      res.send(uiConfigJs)
    } else {
      staticMiddleware(req, res, async (err) => {
        if (err) return next(err)
        try {
          await htmlMiddleware(req, res, next)
        } catch (err) {
          next(err)
        }
      })
    }
  }
}

export function prepareUiConfig (uiConfig: any) {
  const uiConfigStr = serialize(uiConfig)
  const uiConfigJs = `window.__UI_CONFIG=${uiConfigStr}`
  const uiConfigPath = `/${crypto.createHash('md5').update(uiConfigStr).digest('hex')}-ui-config.js`
  return { uiConfigStr, uiConfigJs, uiConfigPath }
}
