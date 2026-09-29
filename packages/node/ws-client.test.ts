import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { once } from 'node:events'
import { WebSocketServer, type WebSocket } from 'ws'
import { WsClient } from './ws-client.js'

// minimal server following the protocol of @data-fair/lib-express/ws-server
const startServer = async () => {
  const wss = new WebSocketServer({ port: 0 })
  await once(wss, 'listening')
  const subscriptions = new Map<WebSocket, Set<string>>()
  wss.on('connection', (ws) => {
    subscriptions.set(ws, new Set())
    ws.on('message', (str) => {
      const message = JSON.parse(str.toString())
      subscriptions.get(ws)!.add(message.channel)
      ws.send(JSON.stringify({ type: 'subscribe-confirm', channel: message.channel }))
    })
    ws.on('close', () => subscriptions.delete(ws))
  })
  const publish = (channel: string, data: any) => {
    for (const [ws, channels] of subscriptions) {
      if (channels.has(channel)) ws.send(JSON.stringify({ type: 'message', channel, data }))
    }
  }
  return { wss, subscriptions, publish, url: `http://localhost:${(wss.address() as any).port}` }
}

describe('ws client', () => {
  it('should re-subscribe to its channels after a reconnection', async () => {
    const server = await startServer()
    const client = new WsClient({ url: server.url })
    try {
      await client.subscribe('channel1')

      // corrupt the connection: the client receives an invalid frame and emits an error, which triggers a reconnection
      const [serverWs] = server.subscriptions.keys()
      const reconnected = once(server.wss, 'connection')
      // @ts-ignore
      serverWs._socket.write(Buffer.from([0xff, 0x00]))
      await reconnected
      await new Promise(resolve => setTimeout(resolve, 200))

      const [newServerWs] = server.subscriptions.keys()
      assert.notEqual(newServerWs, serverWs)
      assert.deepEqual([...server.subscriptions.get(newServerWs)!], ['channel1'])

      const received = client.waitFor('channel1', undefined, 1000, true)
      server.publish('channel1', 'hello')
      assert.equal(await received, 'hello')
    } finally {
      client.close()
      server.wss.close()
    }
  })

  it('should send a single subscribe message per channel', async () => {
    const server = await startServer()
    const client = new WsClient({ url: server.url })
    let nbSubscribe = 0
    server.wss.on('connection', ws => ws.on('message', () => { nbSubscribe++ }))
    try {
      await client.subscribe('channel1')
      await client.subscribe('channel1')
      assert.equal(nbSubscribe, 1)
    } finally {
      client.close()
      server.wss.close()
    }
  })
})
