// fields of the implicit log context of a request, see withLogContext in lib-node/log.js

import type { IncomingMessage } from 'node:http'
import type { Request } from 'express'
import type { SessionState } from '@data-fair/lib-common-types/session/index.js'
import type { LogContext } from '@data-fair/lib-node/log.js'
import { reqIp } from './req-origin.js'

export function reqLogFields (req: Request | IncomingMessage): { ip?: string, host: string } {
  let host = req.headers.host
  // internal calls are not attributed to a site
  if (!host || host.startsWith('localhost') || host.endsWith(':8080')) host = '-'
  const fields: { ip?: string, host: string } = { host }
  // a malformed X-Forwarded-For must not make logging break the request
  try {
    const ip = reqIp(req, { optional: true })
    if (ip) fields.ip = ip
  } catch {}
  return fields
}

export function sessionLogFields (state: SessionState): LogContext {
  const fields: LogContext = {}
  if (state.user) {
    fields.userId = state.user.id
    fields.userName = state.user.name
  }
  if (state.account) {
    fields.accountKey = state.account.type + '.' + state.account.id
    if (state.account.department) fields.accountDep = state.account.department
    fields.accountName = state.account.name
  }
  return fields
}
