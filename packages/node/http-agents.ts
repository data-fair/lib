// use better DNS lookup than nodejs default and try to reduce number of socket openings
// and protect against server side request forgery (SSRF)
//
// public agents (httpAgent / httpsAgent, the default) refuse to connect to non public addresses,
// they must be used for every URL that a user can influence
// private agents (privateHttpAgent / privateHttpsAgent) must only be used for URLs that come
// from the configuration of the service (other services of the same infrastructure)
//
// SSRF_PUBLIC_IPS: comma separated IPs / CIDR ranges to consider public (an intranet source of a self-hosted instance)
// SSRF_PRIVATE_IPS: comma separated IPs / CIDR ranges to consider private (public IPs of databases, etc.)

import CacheableLookup from 'cacheable-lookup'
import HttpAgent, { HttpsAgent } from 'agentkeepalive'
import { Counter, Gauge } from 'prom-client'
import { SsrfHttpAgent, SsrfHttpsAgent, getSsrfRules, getProxyEnvName } from './ssrf.js'

// not very high number of sockets but we don't want to saturate our reverse proxies
// if a higher number is needed the service should probably be scaled anyway
const keepaliveOpts = {
  maxSockets: 8,
  maxFreeSockets: 8,
  timeout: 60000,
  freeSocketTimeout: 30000
}

export const privateHttpAgent = new HttpAgent(keepaliveOpts)
export const privateHttpsAgent = new HttpsAgent(keepaliveOpts)

const createPublicAgents = () => {
  const proxyEnvName = getProxyEnvName()
  if (proxyEnvName) {
    console.warn(`WARNING: ${proxyEnvName} is defined, the protection against server side request forgery (SSRF) is disabled, outgoing requests are not checked against non public addresses`)
    return { httpAgent: new HttpAgent(keepaliveOpts), httpsAgent: new HttpsAgent(keepaliveOpts) }
  }
  const rules = getSsrfRules()
  return { httpAgent: new SsrfHttpAgent(keepaliveOpts, rules), httpsAgent: new SsrfHttpsAgent(keepaliveOpts, rules) }
}

export const { httpAgent, httpsAgent } = createPublicAgents()

const cacheableLookup = new CacheableLookup()
for (const agent of [httpAgent, httpsAgent, privateHttpAgent, privateHttpsAgent]) {
  cacheableLookup.install(agent)
}

// monitor agent statuses
const agents = {
  public: { http: httpAgent, https: httpsAgent },
  private: { http: privateHttpAgent, https: privateHttpsAgent }
}

const socketsGauge = new Gauge({
  name: 'df_http_agent_sockets',
  help: 'Number of open sockets in the http agent',
  labelNames: ['network', 'protocol', 'host']
})
const freeSocketsGauge = new Gauge({
  name: 'df_http_agent_free_sockets',
  help: 'Number of free sockets in the http agent',
  labelNames: ['network', 'protocol', 'host']
})
const createSocketCounter = new Counter({
  name: 'df_http_agent_create_socket_total',
  help: 'Total number of sockets created by the http agent',
  labelNames: ['network', 'protocol']
})
const requestCounter = new Counter({
  name: 'df_http_agent_request_total',
  help: 'Total number of requests created by the http agent',
  labelNames: ['network', 'protocol']
})

// unref'd so that importing this module never keeps a process alive on its own:
// a server is kept running by its own handles and still gets the metrics, while
// CLIs, tests and build tools can exit normally
setInterval(() => {
  for (const network of ['public', 'private'] as const) {
    for (const protocol of ['http', 'https'] as const) {
      const agentStatus = agents[network][protocol].getCurrentStatus()
      for (const host in agentStatus.sockets) {
        socketsGauge.set({ network, protocol, host }, agentStatus.sockets[host])
      }
      for (const host in agentStatus.freeSockets) {
        freeSocketsGauge.set({ network, protocol, host }, agentStatus.freeSockets[host])
      }
      createSocketCounter.remove({ network, protocol })
      createSocketCounter.inc({ network, protocol }, agentStatus.createSocketCount)
      requestCounter.remove({ network, protocol })
      requestCounter.inc({ network, protocol }, agentStatus.requestCount)
    }
  }
}, 60000).unref()
