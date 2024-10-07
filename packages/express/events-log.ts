// log sensitive events, for security ,traceability and audit purposes
// this info is not going  to be exposed on any web service, public file, etc
// it is for admins only and can contain sensitive information if useful
// but, of course, not ultra sensitive like clear-text passwords for example

// account events might be sent to a an organization's security officer
// global events are only for hosting superadmins

import { type Account, type UserRef } from '@data-fair/lib-common-types/session/index.js'
import { type Request } from 'express'
import { hostname as getHostname } from 'os'
import { Counter } from 'prom-client'
import session from './session/index.js'
import { internalError } from '../node/observer.js'

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
  host: string
}

export interface EventLogContext {
  req?: Request
  account?: Account
  user?: UserRef
  ip?: string
  host?: string
}

const level = process.env.EVENTS_LOG_LEVEL || 'info'
const levels = ['silent', 'alert', 'warn', 'info']
const activeLevels = levels.slice(0, levels.indexOf(level) + 1)

const hostname = getHostname()

export const eventsLogCounter = new Counter({
  name: 'df_events_log',
  help: 'A counter of sensitive events logged by the service. Each increment should be accompanied by a log of the event in stdout.',
  labelNames: ['level', 'code', 'host']
})

const globalInfo: { service?: string } = {}

export function init (service: string) {
  globalInfo.service = service
}

export function logEvent (event: EventLog) {
  event.hostname = hostname
  eventsLogCounter.inc({ level: event.level, code: event.code, host: event.host })
  if (activeLevels.includes(event.level)) {
    console.log('df-event:', JSON.stringify(event))
  }
}

async function log (level: EventLogLevel, code: string, message: string, context: EventLogContext = {}) {
  // looking into req.user and req.user.activeAccount for retro-compatibility with older session management

  /** @type {import('../shared/session/index.js').UserRef | undefined} */
  // @ts-ignore
  let user = context.user ?? context.req?.user
  /** @type {import('../shared/session/index.js').Account | undefined} */
  // @ts-ignore
  let account = context.account ?? user?.activeAccount

  // new session management
  if (!user && context.req) {
    try {
      const sessionState = await session.req(context.req)
      user = sessionState.user
      account = sessionState.account
    } catch (/** @type {any} */err) {
      internalError('event-log-session', err)
    }
  }

  let host = context.host ?? context.req?.get('Host')
  if (!host || host.startsWith('localhost') || host.endsWith(':8080')) host = '-'

  /** @type {import('./events-log-types.js').EventLog} */
  const event = {
    time: new Date().toISOString(),
    level,
    code,
    message,
    hostname,
    ip: context.ip ?? context.req?.get('X-Client-IP'),
    host,
    accountKey: account && (account.type + '.' + account.id),
    accountDep: account?.department,
    accountName: account?.name,
    userId: user?.id,
    userName: user?.name
  }
  logEvent(event)
}

function info (code: string, message: string, context: EventLogContext) {
  log('info', code, message, context)
    .catch(err => internalError('event-log-fail', err))
}

function warn (code: string, message: string, context: EventLogContext) {
  log('warn', code, message, context)
    .catch(err => internalError('event-log-fail', err))
}

function alert (code: string, message: string, context: EventLogContext) {
  log('alert', code, message, context)
    .catch(err => internalError('event-log-fail', err))
}

export default { info, warn, alert }
