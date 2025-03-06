// very light web server to expose prometheus metrics, export a cpu profile and maybe other incoming obervability features

// follow this doc for prometheus metrics naming conventions https://prometheus.io/docs/practices/naming/
// /metrics serves container/process/pod specific metrics while /global-metrics
// serves metrics for the whole service installation no matter the scaling

import type { Server, ServerResponse } from 'node:http'
import { hostname } from 'node:os'
import { createServer } from 'node:http'
import { Registry, Counter, register, collectDefaultMetrics } from 'prom-client'
import eventPromise from '@data-fair/lib-utils/event-promise.js'

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

export const internalError = (errorCode: string, error: any, ...optionalParams: any) => {
  internalErrorCounter.inc({ errorCode })
  const message = error.message || error
  console.error(`[${errorCode}] ${message}`, ...optionalParams)
  if (error.stack) console.error(error.stack)
}

/**
 * @param {import('node:http').ServerResponse} res
 * @param {any} err
 */
const httpErrorHandler = (res: ServerResponse, err: any) => {
  console.error('failed to server prometheus /metrics', err)
  res.writeHead(500)
  res.end()
}

const serveRegistry = async (res: ServerResponse, registry: Registry) => {
  const metrics = await registry.metrics()
  res.setHeader('Content-Type', registry.contentType)
  res.writeHead(200)
  res.write(metrics)
  res.end()
}

// live CPU performance inspection
const serveCPUProfile = async (res: ServerResponse, duration: number) => {
  const { Session } = await import('node:inspector/promises')
  const session = new Session()
  session.connect()
  await session.post('Profiler.enable')
  await session.post('Profiler.start')
  await new Promise(resolve => setTimeout(resolve, duration))
  const { profile } = await session.post('Profiler.stop')
  await session.post('Profiler.disable')
  session.disconnect()

  res.setHeader('Content-Disposition', `attachment; filename="data-fair-${hostname()}-${new Date().toISOString()}.cpuprofile"`)
  res.write(JSON.stringify(profile))
  res.end()
}

// live heap allocation sampler
const serveHeapSnapshot = async (res: ServerResponse, includeCollected: boolean, duration: number) => {
  const { Session } = await import('node:inspector/promises')
  const session = new Session()
  session.connect()
  await session.post('HeapProfiler.enable')
  await session.post('HeapProfiler.startSampling', { includeObjectsCollectedByMajorGC: includeCollected, includeObjectsCollectedByMinorGC: true })
  await new Promise(resolve => setTimeout(resolve, duration))
  const { profile } = await session.post('HeapProfiler.stopSampling')
  await session.post('HeapProfiler.disable')
  session.disconnect()

  res.setHeader('Content-Disposition', `attachment; filename="data-fair-${hostname()}-${new Date().toISOString()}.heapprofile"`)
  res.write(JSON.stringify(profile))
  res.end()
}

let server: Server

export const startObserver = async (port = 9090) => {
  server = createServer((req, res) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`)
    if (req.method === 'GET' && url.pathname === '/metrics') {
      serveRegistry(res, register).catch(err => httpErrorHandler(res, err))
    } else if (req.method === 'GET' && (url.pathname === '/global-metrics' || url.pathname === '/service-metrics')) {
      serveRegistry(res, servicePromRegistry).catch(err => httpErrorHandler(res, err))
    } else if (req.method === 'GET' && url.pathname === '/cpu-profile') {
      const duration = parseInt(url.searchParams.get('duration') || '2000')
      serveCPUProfile(res, duration).catch(err => httpErrorHandler(res, err))
    } else if (req.method === 'GET' && url.pathname === '/heap-profile') {
      const duration = parseInt(url.searchParams.get('duration') || '2000')
      serveHeapSnapshot(res, false, duration).catch(err => httpErrorHandler(res, err))
    } else if (req.method === 'GET' && url.pathname === '/heap-profile-all') {
      const duration = parseInt(url.searchParams.get('duration') || '2000')
      serveHeapSnapshot(res, true, duration).catch(err => httpErrorHandler(res, err))
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  server.listen(port)
  await eventPromise(server, 'listening')
  console.log(`Observer server available on http://localhost:${port}
    GET /metrics -> get prometheus metrics for this instance
    GET /service-metrics -> get prometheus metrics shared accross all instances
    GET /cpu-profile -> generate and fetch a CPU profile
    GET /heap-snapshot -> generate and fetch a sampled heap allocation snapshot
    GET /heap-snapshot-all -> generate and fetch a sampled heap allocation snapshot including objects collected by GC
`)
}

export const stopObserver = async () => {
  if (server) server.close()
}
