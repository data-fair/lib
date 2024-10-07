import { join } from 'node:path'
import { readFile } from 'node:fs/promises'
import microTemplate from '@data-fair/lib/micro-template.js'
import { static as expressStatic } from 'express'
import { reqSitePath } from '@data-fair/lib/express/index.js'

/**
 * @param {string} directory
 * @param {any} uiConfig
 * @returns {Promise<import('express').RequestHandler>}
 */
const createHtmlMiddleware = async (directory, uiConfig) => {
  const uiConfigStr = JSON.stringify(uiConfig)
  const html = await readFile(join(directory, 'index.html'), 'utf8')
  const lastModified = (new Date()).toUTCString()
  return (req, res, next) => {
    // using last-modified instead of the automatic etag is slightly faster
    // no need to run microTemplate when cache is revalidated
    if (req.get('If-Modified-Since') === lastModified) return res.status(304).send()

    res.type('html')
    res.set('Cache-Control', 'no-cache')
    res.set('Last-Modified', lastModified)
    res.send(microTemplate(html, { SITE_PATH: reqSitePath(req), UI_CONFIG: uiConfigStr }))
  }
}

/**
 * @param {string} directory
 * @returns {import('express').RequestHandler}
 */
const createStaticMiddleware = (directory) => {
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
 * @param {string} directory
 * @param {any} uiConfig
 * @returns {Promise<import('express').RequestHandler>}
 */
export const createSpaMiddleware = async (directory, uiConfig) => {
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
