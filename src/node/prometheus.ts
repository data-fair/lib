// code instrumentation to expose metrics for prometheus
// follow this doc for naming conventions https://prometheus.io/docs/practices/naming/
// /metrics serves container/process/pod specific metrics while /global-metrics
// serves metrics for the whole service installation no matter the scaling

import { createServer, type Server, type ServerResponse } from 'node:http'
import { Registry, Counter, register } from 'prom-client'

// a special registry for metrics that are global
// not based on this specific process state but instead on the content of db for example
export const globalRegistry = new Registry()

// local metrics incremented throughout the code
const internalErrorCounter = new Counter({
  name: 'df_internal_error',
  help: 'A counter of errors from any service, worker, etc. Do not use for client errors, only for anomalies that should trigger alerts. Each increment should be accompanied by an error log with matching code.',
  labelNames: ['errorCode']
})

export const internalError = (errorCode: string, message: string, ...optionalParams: any[]) => {
  internalErrorCounter.inc({ errorCode })
  console.error(`[${errorCode}] ${message}`, ...optionalParams)
}

const serveRegistry = (res: ServerResponse, registry: Registry) => {
  registry.metrics()
    .then(metrics => {
      res.setHeader('Content-Type', registry.contentType)
      res.writeHead(200)
      res.write(metrics)
      res.end()
    })
    .catch(err => {
      console.error('failed to server prometheus /metrics', err)
      res.writeHead(500)
      res.end()
    })
}

let server: Server
export const start = async (port: number) => {
  server = createServer((req, res) => {
    if (req.method === 'GET' && req.url === '/metrics') {
      serveRegistry(res, register)
    } else if (req.method === 'GET' && req.url === '/global-metrics') {
      serveRegistry(res, globalRegistry)
    } else {
      res.writeHead(404)
      res.end()
    }
  })
  server.listen(port)
  await new Promise(resolve => server.once('listening', resolve))
  console.log(`Prometheus metrics server available on http://localhost:${port}/metrics`)
}

export const stop = async () => {
  if (server) server.close()
}
