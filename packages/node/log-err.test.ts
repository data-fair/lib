import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { serializeErr } from './log-err.js'

describe('serializeErr', () => {
  it('keeps only whitelisted fields of an Error', () => {
    const err = Object.assign(new Error('boom'), { code: 'E1', status: 500, keyValue: { email: 'a@b.c' }, secret: 'x' })
    const s = serializeErr(err)
    assert.deepEqual(Object.keys(s).sort(), ['code', 'message', 'stack', 'status', 'type'])
    assert.equal(s.type, 'Error')
    assert.equal(s.message, 'boom')
  })

  it('uses the error name as type', () => {
    class MongoServerError extends Error { constructor (m: string) { super(m); this.name = 'MongoServerError' } }
    assert.equal(serializeErr(new MongoServerError('dup')).type, 'MongoServerError')
  })

  it('maps statusCode to status', () => {
    assert.equal(serializeErr(Object.assign(new Error('x'), { statusCode: 404 })).status, 404)
  })

  it('drops non primitive code', () => {
    assert.equal(serializeErr(Object.assign(new Error('x'), { code: { a: 1 } })).code, undefined)
  })

  it('never leaks axios request headers and strips the query string', () => {
    const err = Object.assign(new Error('timeout'), { isAxiosError: true, config: { method: 'get', url: 'https://x.org/p?apiKey=s3cret', headers: { Authorization: 'Bearer s3cret' } } })
    const json = JSON.stringify(serializeErr(err))
    assert.ok(!json.includes('s3cret'))
    assert.ok(json.includes('"url":"https://x.org/p"'))
    assert.ok(json.includes('"method":"get"'))
  })

  it('handles AxiosRequestError shape without bodies', () => {
    const err = Object.assign(new Error('500 - fail'), { name: 'AxiosRequestError', status: 500, config: { method: 'post', url: 'http://a/b?k=v', data: 'body' }, data: { secret: 1 }, headers: { 'set-cookie': 'x' } })
    const s = serializeErr(err)
    assert.equal(s.url, 'http://a/b')
    assert.equal(s.status, 500)
    assert.ok(!JSON.stringify(s).includes('secret'))
    assert.ok(!JSON.stringify(s).includes('body'))
  })

  it('truncates long messages and the message line of stacks', () => {
    const body = JSON.stringify({ echoed: 'Bearer SECRET', doc: 'x'.repeat(5000) })
    const err = Object.assign(new Error(`500 - ${body}`), { name: 'AxiosRequestError', status: 500 })
    const s = serializeErr(err)
    assert.ok(s.message.length <= 1001, `message length ${s.message.length}`)
    assert.ok((s.stack ?? '').length < 2000, `stack length ${s.stack?.length}`)
    assert.ok(s.stack?.includes('at '))
  })

  it('serializes cause recursively and stops on cycles', () => {
    const a: any = new Error('a')
    const b: any = new Error('b', { cause: a })
    a.cause = b
    const s = serializeErr(b)
    assert.equal(s.cause?.message, 'a')
    assert.doesNotThrow(() => JSON.stringify(s))
  })

  it('accepts non Error values', () => {
    assert.equal(serializeErr('plain').message, 'plain')
    assert.equal(serializeErr(null).message, 'null')
    assert.equal(serializeErr(undefined).message, 'undefined')
    const s = serializeErr({ message: 'obj', token: 'tok' })
    assert.equal(s.message, 'obj')
    assert.ok(!JSON.stringify(s).includes('tok'))
  })
})
