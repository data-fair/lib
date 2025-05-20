// TODO: use sirv https://www.npmjs.com/package/sirv ?

import crypto from 'crypto'
import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import { static as expressStatic } from 'express'
import { reqSitePath } from '@data-fair/lib-express'

const htmlCache: Record<string, string> = {}

type ServeSpaOptions = {
  ignoreSitePath?: boolean,
  csp?: {
    nonce?: boolean,
    header: string
  }
}

async function createHtmlMiddleware (directory: string, uiConfig: any, options?: ServeSpaOptions): Promise<import('express').RequestHandler> {
  const uiConfigStr = JSON.stringify(uiConfig)
  const rawHtml = await readFile(join(directory, 'index.html'), 'utf8')
  return (req, res, next) => {
    const sitePath = options?.ignoreSitePath ? '' : reqSitePath(req)
    let html = htmlCache[sitePath] = htmlCache[sitePath] ?? microTemplate(rawHtml, { SITE_PATH: sitePath, UI_CONFIG: uiConfigStr })
    if (options?.csp?.nonce) {
      const nonce = crypto.randomBytes(16).toString('base64')
      html = microTemplate(html, { CSP_NONCE: nonce })
      res.set('Content-Security-Policy', microTemplate(options.csp.header, { NONCE: nonce }))
    } else if (options?.csp) {
      res.set('Content-Security-Policy', options.csp.header)
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
        htmlMiddleware(req, res, next)
      })
    }
  }
}
