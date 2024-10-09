import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import { static as expressStatic } from 'express'
import { reqSitePath } from '@data-fair/lib-express'

const htmlCache: Record<string, string> = {}

async function createHtmlMiddleware (directory: string, uiConfig: any): Promise<import('express').RequestHandler> {
  const uiConfigStr = JSON.stringify(uiConfig)
  const html = await readFile(join(directory, 'index.html'), 'utf8')
  return (req, res, next) => {
    const sitePath = reqSitePath(req)
    htmlCache[sitePath] = htmlCache[sitePath] ?? microTemplate(html, { SITE_PATH: sitePath, UI_CONFIG: uiConfigStr })
    res.type('html')
    res.set('Cache-Control', 'no-cache')
    res.send(htmlCache[sitePath])
  }
}

function createStaticMiddleware (directory: string): import('express').RequestHandler {
  // source code should always be hashed, a long cache duration is ok
  const sourceMaxAge = 60 * 60 * 24 // 1 day
  // static assets, images, etc are generally not hashed but a short cache is still ok
  const fileMaxAge = 60 * 5 // 5 minutes
  return expressStatic(directory, {
    setHeaders: (res, path) => {
      if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=' + sourceMaxAge)
      } else {
        res.setHeader('Cache-Control', 'public, max-age=' + fileMaxAge)
      }
    }
  })
}

/**
 * serve a built SPA from a directory
 */
export async function createSpaMiddleware (directory: string, uiConfig: any): Promise<import('express').RequestHandler> {
  const staticMiddleware = createStaticMiddleware(directory)
  const htmlMiddleware = await createHtmlMiddleware(directory, uiConfig)
  return (req, res, next) => {
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
