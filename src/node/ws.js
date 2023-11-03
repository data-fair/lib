// a wrapper around a websocket connection with auto reconnect
// JSON parsing and channel subscriptions

import EventEmitter from 'node:events'
import WebSocket from 'ws'
import Debug from 'debug'

const debug = Debug('ws')

/**
 * @typedef {import('./ws-types.js').Message} Message
 * @typedef {import('./ws-types.js').WsClientOpts} WsClientOpts
 */

export class WsClient extends EventEmitter {
  /** @type {string[]} */
  _channels
  /** @type {WebSocket | undefined} */
  _ws
  /** @type {WsClientOpts} */
  opts

  /**
   * @param {WsClientOpts} opts
   */
  constructor (opts) {
    super()
    this._channels = []
    this.opts = { log: console, ...opts }
  }

  /**
   * @returns {Promise<WebSocket>}
   */
  async _connect () {
    return await new Promise((resolve, reject) => {
      const wsUrl = this.opts.url.replace('http://', 'ws://').replace('https://', 'wss://') + '/'
      debug(`connect Web Socket to ${wsUrl}`)
      const ws = new WebSocket(wsUrl, { headers: this.opts.headers ?? {} })
      this._ws = ws
      ws.on('error', (/** @type {any} */err) => {
        debug('WS encountered an error', err.message)
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this._reconnect()
        reject(err)
      })
      ws.once('open', () => {
        debug('WS is opened')
        resolve(ws)
      })
      ws.on('message', (/** @type {string} */msg) => {
        const message = /** @type {Message} */(JSON.parse(msg))
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

  /**
   * @param {string} channel
   * @param {boolean} [force]
   * @param {number} [timeout]
   * @returns {Promise<undefined>}
   */
  async subscribe (channel, force = false, timeout = 2000) {
    if (this._channels.includes(channel) && !force) return
    const ws = this._ws ?? await this._connect()

    debug('subscribe to channel', channel)
    /** @type {any} */
    const subscribeMessage = { type: 'subscribe', channel }
    if (this.opts.apiKey) subscribeMessage.apiKey = this.opts.apiKey
    if (this.opts.adminMode && this.opts.account) subscribeMessage.account = JSON.stringify(this.opts.account)
    ws.send(JSON.stringify(subscribeMessage))
    const event = await this.waitFor(
      channel,
      (/** @type {Message} */e) => {
        return e.type === 'subscribe-confirm' || e.type === 'error'
      },
      timeout,
      true,
      true
    )
    if (event.type === 'error') throw new Error(event.data)
    if (this._channels.includes(channel)) this._channels.push(channel)
  }

  /**
   * @param {string} channel
   * @param {(message: Message) => boolean} [filter]
   * @param {number} [timeout]
   * @param {boolean} [skipSubscribe]
   * @param {boolean} [fullMessage]
   * @returns {Promise<Message>}
   */
  async waitFor (channel, filter, timeout = 300000, skipSubscribe = false, fullMessage = false) {
    if (!skipSubscribe) await this.subscribe(channel)
    return await new Promise((resolve, reject) => {
      const _timeout = setTimeout(() => { reject(new Error('timeout')) }, timeout)
      const messageCb = (/** @type {any} */message) => {
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
  /**
   * @param {string} datasetId
   * @param {string} eventType
   * @param {number} [timeout]
   * @returns {Promise<Message>}
   */
  async waitForJournal (datasetId, eventType, timeout = 300000) {
    await this.opts.log.info(`wait for event "${eventType}" on dataset "${datasetId}"`)
    const event = await this.waitFor(
      `datasets/${datasetId}/journal`,
      (/** @type {Message} */e) => {
        return e.type === eventType || e.type === 'error'
      },
      timeout
    )
    if (event.type === 'error') throw new Error(event.data)
    return event
  }
}
