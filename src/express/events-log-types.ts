import { type Account, type UserRef } from '../shared/session/index.js'
import { type Request } from 'express'

export type EventLogLevel = 'info' | 'warn' | 'alert'

export interface EventLog {
  time: string
  code: string
  message: string
  level: EventLogLevel
  hostname: string
  accountKey?: string
  accountDep?: string
  accountName?: string
  userId?: string
  userName?: string
  ip?: string
  host?: string
}

export interface EventLogContext {
  req?: Request
  account?: Account
  user?: UserRef
  ip?: string
  host?: string
}
