import { type Account } from '@data-fair/lib-common-types/session/index.js'

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

export interface Message {
  type: string
  channel: string
  data?: any
  status?: number
}
