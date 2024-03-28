// very light web server to expose prometheus metrics, export a cpu profile and maybe other incoming obervability features

// follow this doc for prometheus metrics naming conventions https://prometheus.io/docs/practices/naming/
// /metrics serves container/process/pod specific metrics while /global-metrics
// serves metrics for the whole service installation no matter the scaling

import { hostname } from 'node:os'
import { createServer } from 'node:http'
import { Registry, Counter, register, collectDefaultMetrics } from 'prom-client'

// a special registry for metrics that are global
// not based on this specific process state but instead on the content of db for example
export const servicePromRegistry = new Registry()

collectDefaultMetrics()

// local metrics incremented throughout the code
const internalErrorCounter = new Counter({
  name: 'df_internal_error',
  help: 'A counter of errors from any service, worker, etc. Do not use for client errors, only for anomalies that should trigger alerts. Each increment should be accompanied by an error log with matching code.',
  labelNames: ['errorCode']
})

/**
 * @param {string} errorCode
 * @param {any} error
 * @param  {...any} optionalParams
 */
export const internalError = (errorCode, error, ...optionalParams) => {
  internalErrorCounter.inc({ errorCode })
  const message = error.message || error
  console.error(`[${errorCode}] ${message}`, ...optionalParams)
  if (error.stack) console.error(error.stack)
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {any} err
 */
const httpErrorHandler = (res, err) => {
  console.error('failed to server prometheus /metrics', err)
  res.writeHead(500)
  res.end()
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {Registry} registry
 */
const serveRegistry = async (res, registry) => {
  const metrics = await registry.metrics()
  res.setHeader('Content-Type', registry.contentType)
  res.writeHead(200)
  res.write(metrics)
  res.end()
}

/**
 * live CPU performance inspection
 * @param {import('node:http').ServerResponse} res
 * @param {number} duration
 */
const serveCPUProfile = async (res, duration = 2000) => {
  // @ts-ignore
  const { Session } = await import('node:inspector/promises')
  const session = new Session()
  session.connect()
  await session.post('Profiler.enable')
  await session.post('Profiler.start')
  await new Promise(resolve => setTimeout(resolve, duration))
  const { profile } = await session.post('Profiler.stop')
  session.disconnect()

  res.setHeader('Content-Disposition', `attachment; filename="data-fair-${hostname()}-${new Date().toISOString()}.cpuprofile"`)
  res.write(profile)
  res.end()
}

/**
 * @type {import('node:http').Server}
 */
let server

/**
 * @param {number} [port]
 */
export const startObserver = async (port = 9090) => {
  server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/metrics') {
      serveRegistry(res, register).catch(err => httpErrorHandler(res, err))
    } else if (req.method === 'GET' && (req.url === '/global-metrics' || req.url === '/service-metrics')) {
      serveRegistry(res, servicePromRegistry).catch(err => httpErrorHandler(res, err))
    } else if (req.method === 'GET' && req.url === '/cpu-profile') {
      // TODO: duration
      serveCPUProfile(res).catch(err => httpErrorHandler(res, err))
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  server.listen(port)
  await new Promise(resolve => server.once('listening', resolve))
  console.log(`Observer server available on http://localhost:${port}
    GET /metrics -> get prometheus metrics for this instance
    GET /service-metrics -> get prometheus metrics shared accross all instances
    GET /cpu-profile -> generate and fetch a CPU profile
`)
}

export const stopObserver = async () => {
  if (server) server.close()
}
