// the logger shared by all the services of the data-fair stack
// JSON lines on stdout in production, pretty output in dev, see README for the conventions

import { hostname } from 'node:os'
import { pino, type Logger as PinoLogger, type DestinationStream } from 'pino'
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
    mixin: () => service ? { service } : {}
  }, destination)
}
_resetLogger()

const write = (level: LogLevel, msg: string, fields?: LogFields) => {
  try {
    instance[level](fields ?? {}, msg)
  } catch {
    // logging must never become a new error
  }
}

const log: Logger = {
  info: (msg, fields) => write('info', msg, fields),
  warn: (msg, fields) => write('warn', msg, fields),
  alert: (msg, fields) => write('alert', msg, fields),
  error: (msg, fields) => write('error', msg, fields),
  init: (opts) => { if (opts.service) service = opts.service }
}

export default log
