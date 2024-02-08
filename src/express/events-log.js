// log sensitive events, for security ,traceability and audit purposes
// this info is not going  to be exposed on any web service, public file, etc
// it is for admins only and can contain sensitive information if useful
// but, of course, not ultra sensitive like clear-text passwords for example

// account events might be sent to a an organization's security officer
// global events are only for hosting superadmins

import { Counter } from 'prom-client'
import session from './session/index.js'
import { internalError } from '../node/prometheus.js'

export const eventsLogCounter = new Counter({
  name: 'df_events_log',
  help: 'A counter of sensitive events logged by the service. Each increment should be accompanied by a log of the event in stdout.',
  labelNames: ['type']
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
 * @param {import('../shared/session/index.js').Account} account
 * @param {import('../shared/session/index.js').UserRef | undefined} user
 * @param {string} type
 * @param {string} message
 * @param {string} [ip]
 * @param {string} [origin]
 * @param {string} [path]
 */
export function logAccountEvent (account, user, type, message, ip, origin, path) {
  try {
    console.log('df-account-event:', JSON.stringify({
      ...globalInfo,
      accountKey: account.type + ':' + account.id,
      accountName: account.name,
      userId: user?.id,
      userName: user?.name,
      type,
      message,
      ip,
      origin,
      path
    }))
    eventsLogCounter.inc({ type })
  } catch (err) {
    internalError('log-account-event', 'Failure to log account event', err, account, user, type, message, ip)
  }
}

/**
 * @param {import('express').Request} req
 * @param {import('../shared/session/index.js').Account} account
 * @param {string} type
 * @param {string} message
 */
export function logAccountReqEvent (req, account, type, message) {
  session.req(req).then(sessionState => {
    logAccountEvent(account, sessionState.user, type, message, req.get('X-Client-IP'), req.get('Origin'), req.originalUrl)
  }).catch(err => {
    internalError('log-account-req-event', err)
  })
}

/**
 * @param {import('../shared/session/index.js').UserRef | undefined} user
 * @param {string} type
 * @param {string} message
 * @param {string} [ip]
 * @param {string} [url]
 */
export function logGlobalEvent (user, type, message, ip, url) {
  try {
    console.log('df-global-event:', JSON.stringify({
      ...globalInfo,
      userId: user?.id,
      userName: user?.name,
      type,
      message,
      ip
    }))
    eventsLogCounter.inc({ type })
  } catch (err) {
    internalError('log-global-event', 'Failure to log global event', err, user, type, message, ip)
  }
}

/**
 * @param {import('express').Request} req
 * @param {string} type
 * @param {string} message
 */
export function logGlobalReqEvent (req, type, message) {
  session.req(req).then(sessionState => {
    logGlobalEvent(sessionState.user, type, message, req.get('X-Client-IP'), req.originalUrl)
  }).catch(err => {
    internalError('log-global-req-event', err)
  })
}
