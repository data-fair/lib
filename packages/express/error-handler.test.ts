import { describe, it, after, before, beforeEach } from 'node:test'
import { strict as assert } from 'assert'
import type { Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import express from 'express'
import { httpError } from '@data-fair/lib-utils/http-errors.js'
import { _resetLogger } from '@data-fair/lib-node/log.js'
import errorHandler from './error-handler.js'

describe('errorHandler', () => {
  let server: Server
  let baseUrl: string
  let lines: any[] = []

  before(async () => {
    const app = express()
    const router = express.Router()
    router.get('/no-message/:status', (req) => { throw httpError(Number(req.params.status)) })
    router.get('/message/:status', (req) => { throw httpError(Number(req.params.status), 'some reason') })
    router.get('/message/:status/:long', (req) => { throw httpError(Number(req.params.status), 'some reason') })
    router.get('/failure', () => { throw new Error('boom') })
    app.use('/api', router)
    // a handler mounted on a sub-router sees a req.url relative to its mount path
    const mounted = express.Router()
    mounted.get('/route', () => { throw httpError(403, 'some reason') })
    mounted.use(errorHandler)
    app.use('/mounted', mounted)
    app.use(errorHandler)

    await new Promise<void>(resolve => { server = app.listen(0, () => resolve()) })
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`
    _resetLogger({ format: 'json', destination: { write: (s: string) => { for (const l of s.split('\n')) if (l) lines.push(JSON.parse(l)) } } })
  })

  beforeEach(() => {
    lines = []
  })

  after(async () => {
    _resetLogger()
    await new Promise(resolve => server.close(resolve))
  })

  it('gives 401 and 403 errors without message a default log message', async () => {
    await fetch(`${baseUrl}/api/no-message/401`)
    await fetch(`${baseUrl}/api/no-message/403`)
    assert.equal(lines[0].msg, 'unauthorized request')
    assert.equal(lines[0].code, 'unauthorized-req')
    assert.equal(lines[1].msg, 'forbidden request')
    assert.equal(lines[1].code, 'forbidden-req')
  })

  it('does not send the default log message to the client', async () => {
    const previous = process.env.NODE_ENV
    process.env.NODE_ENV = 'production'
    try {
      const res = await fetch(`${baseUrl}/api/no-message/401`)
      assert.equal(res.status, 401)
      assert.equal(await res.text(), '')
    } finally {
      process.env.NODE_ENV = previous
    }
  })

  it('keeps the message of the error when there is one', async () => {
    await fetch(`${baseUrl}/api/message/403`)
    assert.equal(lines[0].msg, 'some reason')
  })

  it('logs the method and the url on 401, 403 and 5xx', async () => {
    await fetch(`${baseUrl}/api/no-message/401`)
    await fetch(`${baseUrl}/api/message/403`)
    await fetch(`${baseUrl}/api/failure`)
    assert.deepEqual(lines.map(l => [l.level, l.method, l.url]), [
      ['warn', 'GET', '/api/no-message/401'],
      ['warn', 'GET', '/api/message/403'],
      ['error', 'GET', '/api/failure']
    ])
  })

  it('never logs the query string', async () => {
    await fetch(`${baseUrl}/api/no-message/401?apiKey=secret`)
    assert.equal(lines[0].url, '/api/no-message/401')
    assert.ok(!JSON.stringify(lines[0]).includes('secret'))
  })

  it('logs the full url when mounted on a sub-router', async () => {
    await fetch(`${baseUrl}/mounted/route`)
    assert.equal(lines[0].url, '/mounted/route')
  })

  it('truncates long urls', async () => {
    const res = await fetch(`${baseUrl}/api/message/403/${'a'.repeat(2000)}`)
    assert.equal(res.status, 403)
    assert.equal(lines[0].url.length, 1001)
    assert.ok(lines[0].url.endsWith('…'))
  })
})
