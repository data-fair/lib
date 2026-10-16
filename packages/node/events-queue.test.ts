import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'assert'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { EventsQueue } from './events-queue.js'

describe('events queue', () => {
  let server: http.Server
  let port: number
  const received: { url?: string, body: any }[] = []

  before(async () => {
    server = http.createServer((req, res) => {
      let body = ''
      req.on('data', chunk => { body += chunk })
      req.on('end', () => {
        received.push({ url: req.url, body: JSON.parse(body) })
        res.end()
      })
    })
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
    port = (server.address() as AddressInfo).port
  })

  after(() => { server.close() })

  // the events service is configured, not user provided: it must stay reachable on a private address
  // even though the default http agents refuse those (SSRF protection)
  it('should push events to a private events service', async () => {
    assert.ok(!process.env.SSRF_PUBLIC_IPS, 'the test must run without SSRF_PUBLIC_IPS')
    const queue = new EventsQueue()
    queue._options = { eventsUrl: `http://127.0.0.1:${port}`, eventsSecret: 'secret' }
    queue.pushEvent({ title: 'test event', topic: { key: 'test' }, sender: { type: 'user', id: 'user1' } } as any)
    await queue.drain()
    assert.equal(received.length, 1)
    assert.equal(received[0].url, '/api/events')
    assert.equal(received[0].body[0].title, 'test event')
  })

  const event = { title: 'dropped', topic: { key: 'test' }, sender: { type: 'user', id: 'user1' } } as any

  it('should drop events silently when the events service has no url', async () => {
    const queue = new EventsQueue()
    await queue.start({ eventsUrl: '', eventsSecret: 'secret' })
    assert.equal(queue.options().inactive, true)
    queue.pushEvent(event)
    queue.pushNotification({ title: 'dropped', topic: { key: 'test' } } as any)
    assert.equal(queue.eventsQueue.length, 0)
    assert.equal(queue.notificationsQueue.length, 0)
    await queue.stop()
  })

  it('should drop events when the url is set but the secret is missing', async () => {
    const queue = new EventsQueue()
    await queue.start({ eventsUrl: `http://127.0.0.1:${port}` })
    assert.equal(queue.options().inactive, true)
    queue.pushEvent(event)
    assert.equal(queue.eventsQueue.length, 0)
    await queue.stop()
  })

  it('should still refuse events before start', () => {
    assert.throws(() => new EventsQueue().pushEvent(event), /not initialized/)
  })
})
