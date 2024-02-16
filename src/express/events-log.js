// log sensitive events, for security ,traceability and audit purposes
// this info is not going  to be exposed on any web service, public file, etc
// it is for admins only and can contain sensitive information if useful
// but, of course, not ultra sensitive like clear-text passwords for example

// account events might be sent to a an organization's security officer
// global events are only for hosting superadmins

import { hostname as getHostname } from 'os'
import { Counter } from 'prom-client'
import session from './session/index.js'
import { internalError } from '../node/observer.js'

const level = process.env.EVENTS_LOG_LEVEL || 'info'
const levels = ['silent', 'alert', 'warn', 'info']
const activeLevels = levels.slice(0, levels.indexOf(level) + 1)

/**
 * @typedef {import('./events-log-types.js').EventLogContext} EventLogContext
 */

const hostname = getHostname()

export const eventsLogCounter = new Counter({
  name: 'df_events_log',
  help: 'A counter of sensitive events logged by the service. Each increment should be accompanied by a log of the event in stdout.',
  labelNames: ['level', 'code', 'host']
})

/** @type {{service?: string}} */
const globalInfo = {}

/**
 * @param {string} service
 */
export function init (service) {
  globalInfo.service = service
}

/**
 * @param {import('./events-log-types.js').EventLog} event
 */
export function logEvent (event) {
  event.hostname = hostname
  eventsLogCounter.inc({ level: event.level, code: event.code, host: event.host })
  if (activeLevels.includes(event.level)) {
    console.log('df-event:', JSON.stringify(event))
  }
}

/**
 * @param {import('./events-log-types.js').EventLogLevel} level
 * @param {string} code
 * @param {string} message
 * @param {import('./events-log-types.js').EventLogContext} [context]
 */
async function log (level, code, message, context = {}) {
  // looking into req.user for retro-compatibility with older session management

  /** @type {import('../shared/session/index.js').UserRef | undefined} */
  // @ts-ignore
  let user = context.user ?? context.req?.user
  if (!user && context.req) {
    try {
      const sessionState = await session.req(context.req)
      user = sessionState.user
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
    accountKey: context.account && (context.account.type + '.' + context.account.id),
    accountDep: context.account?.department,
    accountName: context.account?.name,
    userId: user?.id,
    userName: user?.name
  }
  logEvent(event)
}

/**
 * @param {string} code
 * @param {string} message
 * @param {import('./events-log-types.js').EventLogContext} [context]
 */
function info (code, message, context) {
  log('info', code, message, context)
    .catch(err => internalError('event-log-fail', err))
}

/**
 * @param {string} code
 * @param {string} message
 * @param {import('./events-log-types.js').EventLogContext} [context]
 */
function warn (code, message, context) {
  log('warn', code, message, context)
    .catch(err => internalError('event-log-fail', err))
}

/**
 * @param {string} code
 * @param {string} message
 * @param {import('./events-log-types.js').EventLogContext} [context]
 */
function alert (code, message, context) {
  log('alert', code, message, context)
    .catch(err => internalError('event-log-fail', err))
}

export default { info, warn, alert }
