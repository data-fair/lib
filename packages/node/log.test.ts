import { describe, it, after } from 'node:test'
import { strict as assert } from 'assert'
import { hostname } from 'node:os'
import { Writable } from 'node:stream'
import { register } from 'prom-client'
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

  it('serializes err with the safe serializer', () => {
    const lines = capture()
    log.warn('x', { err: Object.assign(new Error('e'), { config: { headers: { Authorization: 'secret' } } }) })
    assert.equal(lines[0].err.message, 'e')
    assert.ok(lines[0].err.stack)
    assert.equal(lines[0].err.config, undefined)
  })

  it('never throws', () => {
    capture()
    const circular: any = {}
    circular.self = circular
    assert.doesNotThrow(() => log.info('x', circular))
    assert.doesNotThrow(() => log.error('x', { get boom () { throw new Error('getter') } }))
  })
})

const metricValues = async (name: string) => (await register.getSingleMetric(name)!.get()).values

describe('log metrics', () => {
  after(() => _resetLogger())

  it('counts warn/alert/error in df_logs with level, code and host', async () => {
    capture()
    log.warn('w', { code: 'm-w', host: 'h1' })
    log.alert('a', { code: 'm-a' })
    log.error('e', { code: 'm-e' })
    const v = await metricValues('df_logs')
    assert.ok(v.find(x => x.labels.code === 'm-w' && x.labels.level === 'warn' && x.labels.host === 'h1' && x.value === 1))
    assert.ok(v.find(x => x.labels.code === 'm-a' && x.labels.level === 'alert' && x.labels.host === '-' && x.value === 1))
    assert.ok(v.find(x => x.labels.code === 'm-e' && x.labels.level === 'error' && x.value === 1))
  })

  it('does not count info lines', async () => {
    capture()
    log.info('i', { code: 'm-i' })
    assert.ok(!(await metricValues('df_logs')).find(x => x.labels.code === 'm-i'))
  })

  it('counts uncoded lines with an empty code', async () => {
    capture()
    log.warn('x', { host: 'm-uncoded' })
    assert.ok((await metricValues('df_logs')).find(x => x.labels.code === '' && x.labels.host === 'm-uncoded'))
  })

  it('keeps df_internal_error for error lines', async () => {
    capture()
    log.error('e', { code: 'm-ie' })
    assert.ok((await metricValues('df_internal_error')).find(x => x.labels.errorCode === 'm-ie' && x.value === 1))
  })

  it('keeps df_events_log only for coded warn/alert', async () => {
    capture()
    log.alert('a', { code: 'm-ev-a' })
    log.warn('w', { host: 'm-ev-uncoded' })
    log.error('e', { code: 'm-ev-e' })
    const v = await metricValues('df_events_log')
    assert.ok(v.find(x => x.labels.code === 'm-ev-a' && x.labels.level === 'alert' && x.value === 1))
    assert.ok(!v.find(x => x.labels.host === 'm-ev-uncoded'))
    assert.ok(!v.find(x => x.labels.code === 'm-ev-e'))
  })
})
