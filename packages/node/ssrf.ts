// protection against server side request forgery: refuse to connect to non public addresses
// the address checks are adapted from https://github.com/azu/request-filtering-agent
// they are applied on top of our keepalive agents instead of node's default agent

import net from 'node:net'
import dns from 'node:dns'
import ipaddr from 'ipaddr.js'
import HttpAgent, { HttpsAgent } from 'agentkeepalive'

type IPRange = [ipaddr.IPv4 | ipaddr.IPv6, number]

export type SsrfRules = {
  publicIPs: IPRange[],
  privateIPs: IPRange[]
}

export class SsrfError extends Error {
  code = 'ERR_SSRF_BLOCKED'
  constructor (message: string) {
    super(message)
    this.name = 'SsrfError'
  }
}

/**
 * Parse a comma separated list of IP addresses and CIDR ranges, as found in SSRF_PUBLIC_IPS and SSRF_PRIVATE_IPS
 */
export const parseIPList = (value: string | undefined, name: string): IPRange[] => {
  if (!value) return []
  return value.split(',').map(s => s.trim()).filter(Boolean).map(s => {
    try {
      if (net.isIP(s)) {
        const addr = ipaddr.process(s)
        return [addr, addr.kind() === 'ipv4' ? 32 : 128] as IPRange
      }
      const [addr, bits] = ipaddr.parseCIDR(s)
      if (addr.kind() === 'ipv6' && (addr as ipaddr.IPv6).isIPv4MappedAddress()) {
        return [(addr as ipaddr.IPv6).toIPv4Address(), bits - 96] as IPRange
      }
      return [addr, bits] as IPRange
    } catch (err) {
      throw new Error(`invalid IP address or CIDR range "${s}" in ${name}`, { cause: err })
    }
  })
}

export const getSsrfRules = (env: NodeJS.ProcessEnv = process.env): SsrfRules => ({
  publicIPs: parseIPList(env.SSRF_PUBLIC_IPS, 'SSRF_PUBLIC_IPS'),
  privateIPs: parseIPList(env.SSRF_PRIVATE_IPS, 'SSRF_PRIVATE_IPS')
})

const matchList = (addr: ipaddr.IPv4 | ipaddr.IPv6, list: IPRange[]) => {
  return list.some(([range, bits]) => {
    if (addr.kind() !== range.kind()) return false
    if (addr.kind() === 'ipv4') return (addr as ipaddr.IPv4).match(range as ipaddr.IPv4, bits)
    return (addr as ipaddr.IPv6).match(range as ipaddr.IPv6, bits)
  })
}

/**
 * Check that an address is public, returns an error if it is not
 * hostnames are not checked here, only the addresses they resolve to
 */
export const checkAddress = (address: string, host: string | undefined, rules: SsrfRules): SsrfError | undefined => {
  if (!net.isIP(address)) return
  // ipv4 mapped ipv6 addresses (::ffff:127.0.0.1) are checked as the ipv4 address they represent
  const addr = ipaddr.process(address)
  const target = host && host !== address ? `${host} (${addr.toString()})` : addr.toString()
  if (matchList(addr, rules.publicIPs)) return
  if (addr.range() !== 'unicast') {
    return new SsrfError(`connection to ${target} refused, it is not a public address (${addr.range()}), if this target is legitimate add it to SSRF_PUBLIC_IPS`)
  }
  if (matchList(addr, rules.privateIPs)) {
    return new SsrfError(`connection to ${target} refused, the address is declared private in SSRF_PRIVATE_IPS`)
  }
}

type LookupFunction = (hostname: string, options: any, callback: (...args: any[]) => void) => void

const guardLookup = (lookup: LookupFunction, rules: SsrfRules): LookupFunction => {
  return (hostname, options, callback) => {
    lookup(hostname, options, (err: Error | null, address: string | dns.LookupAddress[], family?: number) => {
      if (err) return callback(err)
      const addresses = Array.isArray(address) ? address.map(a => a.address) : [address]
      for (const a of addresses) {
        const ssrfError = checkAddress(a, hostname, rules)
        if (ssrfError) return callback(ssrfError)
      }
      callback(null, address, family)
    })
  }
}

// helpers for clients that do not use our http agents (ftp, sftp/ssh2, raw sockets, SDKs, undici...)
// unlike the agents they are not disabled by a proxy env variable: these clients connect directly

let envRules: SsrfRules | undefined
const getEnvRules = () => {
  envRules = envRules ?? getSsrfRules()
  return envRules
}

/**
 * Resolve a host and check all its addresses, returns the address to connect to.
 * Connect to the returned address (with the original host as TLS servername), not to the host:
 * resolving the host again could give a different address (DNS rebinding).
 * Throws a SsrfError if the host is or resolves to a non public address.
 */
export const resolvePublicAddress = async (host: string, rules: SsrfRules = getEnvRules()): Promise<string> => {
  const bareHost = host.replace(/^\[(.*)\]$/, '$1')
  if (net.isIP(bareHost)) {
    const ssrfError = checkAddress(bareHost, undefined, rules)
    if (ssrfError) throw ssrfError
    return bareHost
  }
  const addresses = await dns.promises.lookup(bareHost, { all: true })
  for (const { address } of addresses) {
    const ssrfError = checkAddress(address, bareHost, rules)
    if (ssrfError) throw ssrfError
  }
  return addresses[0].address
}

/**
 * A dns.lookup compatible function that refuses non public addresses, for any client accepting a
 * `lookup` option (net.connect, tls.connect, undici connect options, got dnsLookup...).
 * WARNING: node does not call lookup for IP literals, check those with resolvePublicAddress.
 */
export const publicLookup = (hostname: string, options: any, callback?: (...args: any[]) => void): void => {
  // support the dns.lookup(hostname, callback) signature
  if (typeof options === 'function') return publicLookup(hostname, {}, options)
  return guardLookup(dns.lookup as LookupFunction, getEnvRules())(hostname, options ?? {}, callback as (...args: any[]) => void)
}

// the check happens when the connection is created, on the exact address that will be used:
// IP literals are checked directly (no DNS lookup happens for them),
// hostnames are checked on every address returned by the lookup (no DNS rebinding),
// and each redirection creates a new connection that is checked again
const guardedCreateConnection = (rules: SsrfRules, createConnection: (options: any, oncreate: any) => any) => {
  return (options: any, oncreate: (err: Error | null, socket?: net.Socket) => void) => {
    const host = options.host ?? options.hostname
    if (host) {
      // brackets of ipv6 literals are removed by node before reaching the agent, but be defensive
      const ssrfError = checkAddress(host.replace(/^\[(.*)\]$/, '$1'), undefined, rules)
      if (ssrfError) {
        oncreate(ssrfError)
        return
      }
    }
    return createConnection({ ...options, lookup: guardLookup(options.lookup ?? dns.lookup, rules) }, oncreate)
  }
}

export class SsrfHttpAgent extends HttpAgent {
  constructor (opts: HttpAgent.HttpOptions, rules: SsrfRules) {
    super(opts)
    // @ts-ignore createConnection is not declared in the agentkeepalive typings
    this.createConnection = guardedCreateConnection(rules, super.createConnection.bind(this))
  }
}

export class SsrfHttpsAgent extends HttpsAgent {
  constructor (opts: HttpAgent.HttpsOptions, rules: SsrfRules) {
    super(opts)
    // @ts-ignore createConnection is not declared in the agentkeepalive typings
    this.createConnection = guardedCreateConnection(rules, super.createConnection.bind(this))
  }
}

const proxyEnvNames = ['HTTP_PROXY', 'HTTPS_PROXY', 'ALL_PROXY', 'http_proxy', 'https_proxy', 'all_proxy']

/**
 * The name of the proxy env variable that disables the SSRF protection, if any
 * behind a proxy our agents connect to the proxy, not to the target, so they cannot check the target
 */
export const getProxyEnvName = (env: NodeJS.ProcessEnv = process.env) => proxyEnvNames.find(name => !!env[name])
