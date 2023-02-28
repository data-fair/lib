// a wrapper around a websocket connection with auto reconnect
// JSON parsing and channel subscriptions

import EventEmitter from 'node:events'
import WebSocket from 'ws'
import { type Account } from '../types/session-state'
import Debug from 'debug'

const debug = Debug('ws')

interface WsClientOpts {
  log?: any
  url: string
  headers?: Record<string, string>
  apiKey?: string
  adminMode?: boolean
  account?: Account
}

interface Message {
  type: string
  channel: string
  data?: any
  status?: number
}

export class WsClient extends EventEmitter {
  _channels: string[]
  _ws: WebSocket | undefined
  opts: WsClientOpts
  constructor (opts: WsClientOpts) {
    super()
    this._channels = []
    this.opts = { log: console, ...opts }
  }

  async _connect (): Promise<WebSocket> {
    return await new Promise((resolve, reject) => {
      const wsUrl = this.opts.url.replace('http://', 'ws://').replace('https://', 'wss://') + '/'
      debug(`connect Web Socket to ${wsUrl}`)
      const ws = new WebSocket(wsUrl, { headers: this.opts.headers ?? {} })
      this._ws = ws
      ws.on('error', (err: any) => {
        debug('WS encountered an error', err.message)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this._reconnect()
        reject(err)
      })
      ws.once('open', () => {
        debug('WS is opened')
        resolve(ws)
      })
      ws.on('message', (msg: string) => {
        const message = JSON.parse(msg) as Message
        debug('received message', message)
        this.emit('message', message)
      })
    })
  }

  async _reconnect () {
    if (!this._ws) return
    debug('reconnect')
    this._ws.terminate()
    await this._connect()
    for (const channel of this._channels) {
      await this.subscribe(channel, true)
    }
  }

  async subscribe (channel: string, force = false, timeout = 2000) {
    if (this._channels.includes(channel) && !force) return
    const ws = this._ws ?? await this._connect()

    debug('subscribe to channel', channel)
    const subscribeMessage: any = { type: 'subscribe', channel }
    if (this.opts.apiKey) subscribeMessage.apiKey = this.opts.apiKey
    if (this.opts.adminMode && this.opts.account) subscribeMessage.account = JSON.stringify(this.opts.account)
    ws.send(JSON.stringify(subscribeMessage))
    const event = await this.waitFor(channel, (e: Message) => e.type === 'subscribe-confirm' || e.type === 'error', timeout, true, true)
    if (event.type === 'error') throw new Error(event.data)
    if (this._channels.includes(channel)) this._channels.push(channel)
  }

  async waitFor (channel: string, filter?: (message: any) => boolean, timeout = 300000, skipSubscribe = false, fullMessage = false): Promise<Message> {
    if (!skipSubscribe) await this.subscribe(channel)
    return await new Promise((resolve, reject) => {
      const _timeout = setTimeout(() => { reject(new Error('timeout')) }, timeout)
      const messageCb = (message: any) => {
        if (message.channel === channel && (!filter || filter(fullMessage ? message : message.data))) {
          clearTimeout(_timeout)
          this.off('message', messageCb)
          resolve(fullMessage ? message : message.data)
        }
      }
      this.on('message', messageCb)
    })
  }

  close () {
    if (this._ws) this._ws.terminate()
  }
}

export class DataFairWsClient extends WsClient {
  async waitForJournal (datasetId: string, eventType: string, timeout = 300000) {
    await this.opts.log.info(`wait for event "${eventType}" on dataset "${datasetId}"`)
    const event = await this.waitFor(`datasets/${datasetId}/journal`, (e: Message) => e.type === eventType || e.type === 'error', timeout)
    if (event.type === 'error') throw new Error(event.data)
    return event
  }
}
