// TODO: use sirv https://www.npmjs.com/package/sirv ?

import crypto from 'crypto'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import { static as expressStatic, type Request } from 'express'
import { reqSitePath } from '@data-fair/lib-express'

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
  'style-src': "'self' 'unsafe-inline'", // adjusted because we always self-host styles
  'upgrade-insecure-requests': '',
  'worker-src': 'blob:', // necessary for maplibre
  'child-src': 'blob:', // same
}
export const defaultCSPHeader = getCSPHeaderFromDirectives(defaultCSPDirectives)
export const defaultNonceCSPDirectives = {
  ...defaultCSPDirectives,
  'default-src': "'nonce-{NONCE}' 'self'",
  'script-src': "'nonce-{NONCE}' 'self'",
  'style-src': "'nonce-{NONCE}' 'self'"
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
  }
}

async function createHtmlMiddleware (directory: string, uiConfig: any, options?: ServeSpaOptions): Promise<import('express').RequestHandler> {
  const uiConfigStr = JSON.stringify(uiConfig)
  const rawHtml = await readFile(join(directory, 'index.html'), 'utf8')
  const htmlCache: Record<string, string> = {}
  const cspHeaderOption = options?.csp?.header
  let rawCSPHeader: string | undefined
  if (cspHeaderOption && typeof cspHeaderOption !== 'function') rawCSPHeader = getCSPHeader(cspHeaderOption, options.csp?.nonce)

  return (req, res, next) => {
    const sitePath = options?.ignoreSitePath ? '' : reqSitePath(req)
    let html = htmlCache[sitePath] = htmlCache[sitePath] ?? microTemplate(rawHtml, { ...options?.extraHtmlTemplateParams, SITE_PATH: sitePath, UI_CONFIG: uiConfigStr })

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

function createStaticMiddleware (directory: string): import('express').RequestHandler {
  // source code should always be hashed, a long cache duration is ok
  const sourceMaxAge = 60 * 60 * 24 * 10 // 10 days
  // static assets, images, etc are generally not hashed but a short cache is still ok
  const fileMaxAge = 60 * 5 // 5 minutes
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
  const staticMiddleware = createStaticMiddleware(directory)
  const htmlMiddleware = await createHtmlMiddleware(directory, uiConfig, options)
  return (req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.status(404).send()
    // force buffering, necessary for caching of source files in the reverse proxy
    res.setHeader('X-Accel-Buffering', 'yes')

    if (req.url.startsWith('/index.html')) {
      htmlMiddleware(req, res, next)
    } else {
      staticMiddleware(req, res, (err) => {
        if (err) return next(err)
        try {
          htmlMiddleware(req, res, next)
        } catch (err) {
          next(err)
        }
      })
    }
  }
}
