// a wrapper around a websocket connection with auto reconnect
// JSON parsing and channel subscriptions

import { type Message } from '@data-fair/lib-common-types/ws.js'
import { type Account } from '@data-fair/lib-common-types/session/index.js'
import EventEmitter from 'node:events'
import WebSocket from 'ws'
import Debug from 'debug'

const debug = Debug('ws')

type logFn = (msg: string, ...args: any[]) => void

export interface WsClientOpts {
  log?: { info: logFn, error: logFn, debug: logFn }
  url: string
  headers?: Record<string, string>
  apiKey?: string
  adminMode?: boolean
  account?: Account
}

export type FullWsClientOpts = WsClientOpts & Required<Pick<WsClientOpts, 'log'>>

export class WsClient extends EventEmitter {
  private _channels: string[]
  private _ws: WebSocket | undefined
  opts: FullWsClientOpts

  constructor (opts: WsClientOpts) {
    super()
    this._channels = []
    this.opts = { log: console, ...opts }
  }

  private async _connect (): Promise<WebSocket> {
    return await new Promise((resolve, reject) => {
      const wsUrl = this.opts.url.replace('http://', 'ws://').replace('https://', 'wss://') + '/'
      debug(`connect Web Socket to ${wsUrl}`)
      const ws = new WebSocket(wsUrl, { headers: this.opts.headers ?? {} })
      this._ws = ws
      ws.on('error', (err: any) => {
        debug('WS encountered an error', err.message)
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

  private async _reconnect () {
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
    const event = await this.waitFor(
      channel,
      (e: Message) => {
        return e.type === 'subscribe-confirm' || e.type === 'error'
      },
      timeout,
      true,
      true
    )
    if (event.type === 'error') throw new Error(event.data)
    if (this._channels.includes(channel)) this._channels.push(channel)
  }

  async waitFor (channel: string, filter?: (message: Message) => boolean, timeout = 300000, skipSubscribe = false, fullMessage = false): Promise<Message> {
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
    const event = await this.waitFor(
      `datasets/${datasetId}/journal`,
      (e) => {
        return e.type === eventType || e.type === 'error'
      },
      timeout
    )
    if (event.type === 'error') throw new Error(event.data)
    return event
  }
}
