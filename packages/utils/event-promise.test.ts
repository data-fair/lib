import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import EventEmitter from 'node:events'
import eventPromise from './event-promise.js'

describe('eventPromise utility function', () => {
  it('should resolve promise on expected event', async () => {
    const emitter = new EventEmitter()
    let resolved = false
    let rejected = false
    eventPromise(emitter, 'hello')
      .then(data => {
        assert.equal(data, 'world')
        resolved = true
      })
      .catch(() => { rejected = true })
    emitter.emit('hello', 'world')
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(resolved, true)
    assert.equal(rejected, false)

    assert.equal(emitter.listenerCount('error'), 0)
    assert.equal(emitter.listenerCount('hello'), 0)
  })

  it('should reject promise on error event', async () => {
    const emitter = new EventEmitter()
    let resolved = false
    let rejected = false
    eventPromise(emitter, 'hello')
      .then(data => { resolved = true })
      .catch(() => { rejected = true })
    emitter.emit('error', 'world')
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(resolved, false)
    assert.equal(rejected, true)

    assert.equal(emitter.listenerCount('error'), 0)
    assert.equal(emitter.listenerCount('hello'), 0)
  })

  it('should ignore error triggered after success', async () => {
    const emitter = new EventEmitter()
    emitter.on('error', () => {
      // prevent unhandled error
    })
    let resolved = false
    let rejected = false
    eventPromise(emitter, 'hello')
      .then(data => {
        assert.equal(data, 'world')
        resolved = true
      })
      .catch(() => { rejected = true })
    emitter.emit('hello', 'world')
    emitter.emit('error', 'world')
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(resolved, true)
    assert.equal(rejected, false)

    assert.equal(emitter.listenerCount('error'), 1)
    assert.equal(emitter.listenerCount('hello'), 0)
  })
})
