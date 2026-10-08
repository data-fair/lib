import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'assert'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Request, Response } from 'express'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import { createSpaMiddleware, prepareUiConfig, getThemeParams } from './serve-spa.js'

let dir: string
before(async () => {
  dir = await mkdtemp(join(tmpdir(), 'serve-spa-'))
  await writeFile(join(dir, 'index.html'), '<html><body>{UI_CONFIG}</body></html>')
})
after(async () => { await rm(dir, { recursive: true, force: true }) })

function mockReq (url: string): Request {
  return { method: 'GET', url, headers: {}, get: () => undefined } as unknown as Request
}

type MockRes = Response & { headers: Record<string, string>, body?: string }
function mockRes (): MockRes {
  const headers: Record<string, string> = {}
  const res = {
    headers,
    body: undefined as string | undefined,
    setHeader (name: string, value: string) { headers[name.toLowerCase()] = value; return res },
    set (name: string, value: string) { headers[name.toLowerCase()] = value; return res },
    type () { return res },
    status () { return res },
    send (body?: string) { res.body = body; return res }
  }
  return res as unknown as MockRes
}

const uiConfig = { some: 'config' }
const { uiConfigPath } = prepareUiConfig(uiConfig)

describe('createSpaMiddleware', () => {
  it('marks the served document noindex by default', async () => {
    const middleware = await createSpaMiddleware(dir, uiConfig, { ignoreSitePath: true })
    const res = mockRes()
    await middleware(mockReq('/index.html'), res, () => {})
    assert.equal(res.headers['x-robots-tag'], 'noindex')
    assert.ok(res.body?.startsWith('<html>'))
  })

  it('marks the ui config script noindex too', async () => {
    const middleware = await createSpaMiddleware(dir, uiConfig, { ignoreSitePath: true })
    const res = mockRes()
    await middleware(mockReq(uiConfigPath), res, () => {})
    assert.equal(res.headers['x-robots-tag'], 'noindex')
    assert.ok(res.body?.startsWith('window.__UI_CONFIG='))
  })

  it('serves an indexable document with noindex: false', async () => {
    const middleware = await createSpaMiddleware(dir, uiConfig, { ignoreSitePath: true, noindex: false })
    const res = mockRes()
    await middleware(mockReq('/index.html'), res, () => {})
    assert.equal(res.headers['x-robots-tag'], undefined)
    assert.ok(res.body?.startsWith('<html>'))
  })
})

describe('site theme resources', () => {
  let themeDir: string
  let directory: Server
  let privateDirectoryUrl: string
  const template = '<html><head><link href="{SITE_PATH}/simple-directory/api/sites/{THEME_CSS_HASH}_theme.css" rel="stylesheet">{PRELOAD_LINKS}' +
    '<script src="{SITE_PATH}/simple-directory/api/sites/{PUBLIC_SITE_INFO_HASH}_public.js"></script></head></html>'

  before(async () => {
    themeDir = await mkdtemp(join(tmpdir(), 'serve-spa-theme-'))
    await writeFile(join(themeDir, 'index.html'), template)
    // stands for simple-directory's /api/sites/_hashes
    directory = createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json')
      res.end(JSON.stringify({ themeCss: 'h1', publicInfo: 'h2', preloadLinks: [{ href: '/font.woff2', as: 'font' }] }))
    })
    await new Promise<void>(resolve => directory.listen(0, resolve))
    privateDirectoryUrl = `http://localhost:${(directory.address() as AddressInfo).port}`
  })
  after(async () => {
    directory.close()
    await rm(themeDir, { recursive: true, force: true })
  })

  // a distinct host per test, the hashes are cached per site
  const siteReq = (host: string, query: Record<string, unknown> = {}) => {
    const headers: Record<string, string> = { host, 'x-forwarded-host': host, 'x-forwarded-proto': 'http' }
    return { method: 'GET', url: '/index.html', headers, query, get: (name: string) => headers[name.toLowerCase()] } as unknown as Request
  }

  it('getThemeParams keeps the _t_* string parameters only', () => {
    assert.equal(getThemeParams({ _t_primary: 'FFEB3B', _c_concept_eq: 'x', primary: 'ff0000', _t_secondary: ['a', 'b'] }).toString(), '_t_primary=FFEB3B')
  })

  it('references the hashed resources of the site by default', async () => {
    const middleware = await createSpaMiddleware(themeDir, uiConfig, { ignoreSitePath: true, privateDirectoryUrl })
    const res = mockRes()
    await middleware(siteReq('site1.test'), res, () => {})
    assert.ok(res.body?.includes('href="/simple-directory/api/sites/h1/_theme.css"'), res.body)
    assert.ok(res.body?.includes('src="/simple-directory/api/sites/h2/_public.js"'), res.body)
    assert.ok(res.body?.includes('<link rel="preload" as="font" href="/font.woff2">'), res.body)
  })

  it('references the plain resources with the _t_* parameters of a local theme override', async () => {
    const middleware = await createSpaMiddleware(themeDir, uiConfig, { ignoreSitePath: true, privateDirectoryUrl })
    const res = mockRes()
    await middleware(siteReq('site2.test', { _t_primary: 'FFEB3B', _t_secondary: '#004D40', other: 'x' }), res, () => {})
    assert.ok(res.body?.includes('href="/simple-directory/api/sites/_theme.css?_t_primary=FFEB3B&amp;_t_secondary=%23004D40"'), res.body)
    assert.ok(res.body?.includes('src="/simple-directory/api/sites/_public.js?_t_primary=FFEB3B&amp;_t_secondary=%23004D40"'), res.body)
    assert.ok(res.body?.includes('<link rel="preload" as="font" href="/font.woff2">'), res.body)
    assert.ok(!res.body?.includes('h1/') && !res.body?.includes('h2/'), res.body)
  })
})
