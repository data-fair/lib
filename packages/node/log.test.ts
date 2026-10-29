import { describe, it, after } from 'node:test'
import { strict as assert } from 'assert'
import { hostname } from 'node:os'
import { Writable } from 'node:stream'
import log, { _resetLogger } from './log.js'

// collect the JSON lines written by the logger
const capture = () => {
  const lines: any[] = []
  _resetLogger({ format: 'json', destination: { write: (s: string) => { for (const l of s.split('\n')) if (l) lines.push(JSON.parse(l)) } } })
  return lines
}

describe('log output', () => {
  after(() => _resetLogger())

  it('writes one JSON object per line with label level, ISO time, hostname and no pid', () => {
    const lines = capture()
    log.info('hello', { a: 1 })
    assert.equal(lines.length, 1)
    assert.equal(lines[0].level, 'info')
    assert.equal(lines[0].msg, 'hello')
    assert.equal(lines[0].a, 1)
    assert.match(lines[0].time, /^\d{4}-\d{2}-\d{2}T/)
    assert.equal(lines[0].hostname, hostname())
    assert.equal(lines[0].pid, undefined)
  })

  it('supports the alert level between warn and error', () => {
    const lines = capture()
    log.alert('x', { code: 'c' })
    assert.equal(lines[0].level, 'alert')
    assert.equal(lines[0].code, 'c')
  })

  it('adds service from init', () => {
    const lines = capture()
    log.init({ service: 'svc' })
    log.warn('x')
    assert.equal(lines[0].service, 'svc')
  })

  it('pretty format writes human readable non-JSON output', () => {
    const out: string[] = []
    // pino-pretty needs a real stream as destination
    _resetLogger({ format: 'pretty', destination: new Writable({ write (chunk, _enc, cb) { out.push(chunk.toString()); cb() } }) })
    log.info('pretty hello')
    assert.ok(out.join('').includes('pretty hello'))
    assert.throws(() => JSON.parse(out[0]))
  })

  it('never throws', () => {
    capture()
    const circular: any = {}
    circular.self = circular
    assert.doesNotThrow(() => log.info('x', circular))
    assert.doesNotThrow(() => log.error('x', { get boom () { throw new Error('getter') } }))
  })
})
