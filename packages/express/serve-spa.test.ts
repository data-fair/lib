import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'assert'
import { mkdtemp, writeFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Request, Response } from 'express'
import { createSpaMiddleware, prepareUiConfig } from './serve-spa.js'

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
