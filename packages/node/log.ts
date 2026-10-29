// the logger shared by all the services of the data-fair stack
// JSON lines on stdout in production, pretty output in dev, see README for the conventions

import { hostname } from 'node:os'
import { format } from 'node:util'
import { AsyncLocalStorage } from 'node:async_hooks'
import createDebug from 'debug'
import { pino, type Logger as PinoLogger, type DestinationStream } from 'pino'
import type { Counter } from 'prom-client'
import { serializeErr } from './log-err.js'

export type LogLevel = 'debug' | 'info' | 'warn' | 'alert' | 'error'

export type LogFields = { code?: string, err?: unknown, [key: string]: unknown }

export interface Logger {
  info (msg: string, fields?: LogFields): void
  warn (msg: string, fields?: LogFields): void
  alert (msg: string, fields?: LogFields): void
  error (msg: string, fields?: LogFields): void
  init (opts: { service?: string }): void
}

type LogFormat = 'json' | 'pretty'

export type LogContext = Record<string, string | number | boolean | undefined>

// implicit context merged into every log line
// only small immutable values (ids, keys, short names), never req, documents, buffers, etc
// long-lived resources (pools, intervals, caches) must be created outside any scope
// or they would capture it and attribute later lines to the wrong user
const contextStorage = new AsyncLocalStorage<LogContext>()

/** run fn in a scope where every log line carries the fields of the parent scope plus these */
export function withLogContext<T> (fields: LogContext, fn: () => T): T {
  return contextStorage.run({ ...contextStorage.getStore(), ...fields }, fn)
}

/** a copy of the current context, for example to pass it to a worker thread in a task payload */
export function getLogContext (): LogContext {
  return { ...contextStorage.getStore() }
}

// optional peer dependency, absent in production images
let prettyFactory: ((opts: Record<string, unknown>) => DestinationStream) | null = null
try {
  // @ts-ignore optional peer dependency
  prettyFactory = (await import('pino-pretty')).default
} catch {
  prettyFactory = null
}

let service: string | undefined = process.env.OTEL_SERVICE_NAME

let instance: PinoLogger<'alert'>

const defaultFormat = (): LogFormat => {
  if (process.env.LOG_FORMAT === 'json' || process.env.LOG_FORMAT === 'pretty') return process.env.LOG_FORMAT
  return process.env.NODE_ENV === 'production' ? 'json' : 'pretty'
}

/** @internal test seam, not API */
export function _resetLogger (opts: { destination?: { write (s: string): unknown }, format?: LogFormat } = {}) {
  const format = opts.format ?? defaultFormat()
  let destination: DestinationStream
  if (format === 'pretty' && prettyFactory) {
    destination = prettyFactory({ sync: true, customLevels: 'alert:45', destination: opts.destination ?? 1 })
  } else {
    destination = (opts.destination as DestinationStream) ?? pino.destination({ dest: 1, sync: true })
  }
  instance = pino({
    level: 'debug',
    customLevels: { alert: 45 },
    base: { hostname: hostname() },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
    serializers: { err: serializeErr },
    // per-call fields win over the mixin (pino's default merge strategy)
    mixin: () => service ? { service, ...contextStorage.getStore() } : { ...contextStorage.getStore() }
  }, destination)
}
_resetLogger()

// prom-client is an optional peer dependency, without it log lines are simply not counted
let promClient: typeof import('prom-client') | null = null
try {
  promClient = await import('prom-client')
} catch {
  promClient = null
}

export const logsCounter: Counter<'level' | 'code' | 'host'> | null = promClient && new promClient.Counter({
  name: 'df_logs',
  help: 'A counter of warn, alert and error log lines. The code label comes from the code field of the line, it must be a static string.',
  labelNames: ['level', 'code', 'host']
})

export const internalErrorCounter: Counter<'errorCode'> | null = promClient && new promClient.Counter({
  name: 'df_internal_error',
  help: 'DEPRECATED, use df_logs. A counter of error log lines.',
  labelNames: ['errorCode']
})

export const eventsLogCounter: Counter<'level' | 'code' | 'host'> | null = promClient && new promClient.Counter({
  name: 'df_events_log',
  help: 'DEPRECATED, use df_logs. A counter of warn and alert log lines that have a code.',
  labelNames: ['level', 'code', 'host']
})

const count = (level: LogLevel, fields?: LogFields) => {
  if (level !== 'warn' && level !== 'alert' && level !== 'error') return
  const code = typeof fields?.code === 'string' ? fields.code : ''
  const host = fields?.host ?? contextStorage.getStore()?.host
  const hostLabel = typeof host === 'string' && host ? host : '-'
  logsCounter?.inc({ level, code, host: hostLabel })
  if (level === 'error') internalErrorCounter?.inc({ errorCode: code })
  else if (code) eventsLogCounter?.inc({ level, code, host: hostLabel })
}

// keys written by pino itself, a field with the same name would duplicate them in the JSON line
const reservedKeys = ['level', 'time', 'msg', 'hostname']

const write = (level: LogLevel, msg: string, fields?: LogFields) => {
  try {
    // tolerate loosely ported calls like log.error(err) from javascript code
    if (typeof msg !== 'string') {
      if ((msg as unknown) instanceof Error) fields = { err: msg, ...fields }
      msg = (msg as any)?.message ?? format(msg)
    }
    if (fields && reservedKeys.some(key => key in fields!)) {
      fields = { ...fields }
      for (const key of reservedKeys) {
        if (key in fields) {
          fields[key + '_'] = fields[key]
          delete fields[key]
        }
      }
    }
    count(level, fields)
    instance[level](fields ?? {}, msg)
  } catch {
    // logging must never become a new error
  }
}

// the debug module stays the API for debug logs, only its output is redirected here
// debug reads these properties at each call so instances created earlier are redirected too
createDebug.formatArgs = function () {}
createDebug.log = function (this: { namespace: string }, ...args: unknown[]) {
  write('debug', format(...args), { ns: this.namespace })
}

const log: Logger = {
  info: (msg, fields) => write('info', msg, fields),
  warn: (msg, fields) => write('warn', msg, fields),
  alert: (msg, fields) => write('alert', msg, fields),
  error: (msg, fields) => write('error', msg, fields),
  init: (opts) => { if (opts.service) service = opts.service }
}

export default log
