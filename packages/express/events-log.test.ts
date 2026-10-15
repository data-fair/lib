import { describe, it, beforeEach, afterEach } from 'node:test'
import { strict as assert } from 'assert'
import type { Request } from 'express'
import eventsLog from './events-log.js'

const user = { id: 'u1', name: 'User 1' }
const mockReq = (headers: Record<string, string>) => ({ headers, get: (name: string) => headers[name.toLowerCase()] }) as unknown as Request

// info() is fire-and-forget: collect the df-event lines it prints
let lines: string[] = []
const originalLog = console.log
const settle = () => new Promise(resolve => setImmediate(resolve))

describe('events-log ip', () => {
  beforeEach(() => {
    lines = []
    console.log = (...args: unknown[]) => { if (args[0] === 'df-event:') lines.push(args[1] as string) }
  })
  afterEach(() => { console.log = originalLog })

  it('logs the client IP from X-Forwarded-For, not X-Client-IP', async () => {
    eventsLog.info('test', 'msg', { user, req: mockReq({ 'x-forwarded-for': '203.0.113.7', 'x-client-ip': '10.0.0.9', host: 'example.com' }) })
    await settle()
    assert.equal(JSON.parse(lines[0]).ip, '203.0.113.7')
  })

  it('logs no IP for a request without one (an in-cluster call)', async () => {
    eventsLog.info('test', 'msg', { user, req: mockReq({ host: 'data-fair:8080' }) })
    await settle()
    assert.equal(JSON.parse(lines[0]).ip, undefined)
  })

  it('keeps an explicit ip from the context', async () => {
    eventsLog.info('test', 'msg', { user, ip: '198.51.100.1', req: mockReq({ 'x-forwarded-for': '203.0.113.7' }) })
    await settle()
    assert.equal(JSON.parse(lines[0]).ip, '198.51.100.1')
  })
})
