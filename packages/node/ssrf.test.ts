import { describe, it, before, after } from 'node:test'
import { strict as assert } from 'assert'
import http from 'node:http'
import type { AddressInfo } from 'node:net'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'
import axios from 'axios'
import CacheableLookup from 'cacheable-lookup'
import net from 'node:net'
import { checkAddress, parseIPList, getSsrfRules, getProxyEnvName, resolvePublicAddress, publicLookup, SsrfHttpAgent, SsrfHttpsAgent, type SsrfRules } from './ssrf.js'

const execFileAsync = promisify(execFile)

const noRules: SsrfRules = { publicIPs: [], privateIPs: [] }

describe('ssrf address checks', () => {
  it('should refuse non public addresses', () => {
    for (const address of [
      '127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.1.1', '100.64.0.1', '169.254.169.254', '0.0.0.0',
      '255.255.255.255', '224.0.0.1', '::1', '::', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1', '::ffff:169.254.169.254',
      '64:ff9b::a9fe:a9fe', '2002:a9fe:a9fe::1'
    ]) {
      assert.ok(checkAddress(address, undefined, noRules), `${address} should be refused`)
    }
  })

  it('should accept public addresses and ignore hostnames', () => {
    for (const address of ['8.8.8.8', '141.95.149.122', '2001:4860:4860::8888', '::ffff:8.8.8.8', 'koumoul.com']) {
      assert.equal(checkAddress(address, undefined, noRules), undefined, `${address} should be accepted`)
    }
  })

  it('should extend public and private addresses from env variables', () => {
    const rules = getSsrfRules({ SSRF_PUBLIC_IPS: '10.0.0.0/8, 192.168.1.1', SSRF_PRIVATE_IPS: '141.95.149.120/30,2001:4860:4860::8888' })
    assert.equal(checkAddress('10.1.2.3', undefined, rules), undefined)
    assert.equal(checkAddress('::ffff:10.1.2.3', undefined, rules), undefined)
    assert.equal(checkAddress('192.168.1.1', undefined, rules), undefined)
    assert.ok(checkAddress('192.168.1.2', undefined, rules))
    assert.ok(checkAddress('141.95.149.122', undefined, rules)?.message.includes('SSRF_PRIVATE_IPS'))
    assert.equal(checkAddress('141.95.149.124', undefined, rules), undefined)
    assert.ok(checkAddress('2001:4860:4860::8888', undefined, rules))
  })

  it('should name the env variable to change in the error message', () => {
    const err = checkAddress('10.1.2.3', 'internal.example.com', noRules)
    assert.ok(err?.message.includes('internal.example.com (10.1.2.3)'))
    assert.ok(err?.message.includes('SSRF_PUBLIC_IPS'))
    assert.equal(err?.code, 'ERR_SSRF_BLOCKED')
  })

  it('should reject invalid lists', () => {
    assert.throws(() => parseIPList('10.0.0.0/8,not-an-ip', 'SSRF_PUBLIC_IPS'), /not-an-ip.*SSRF_PUBLIC_IPS/)
    assert.deepEqual(parseIPList(' , ', 'SSRF_PUBLIC_IPS'), [])
  })

  it('should detect proxy env variables', () => {
    assert.equal(getProxyEnvName({}), undefined)
    assert.equal(getProxyEnvName({ https_proxy: 'http://proxy:3128' }), 'https_proxy')
  })
})

describe('ssrf agents', () => {
  let server: http.Server
  let port: number

  before(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/redirect') {
        res.writeHead(302, { location: `http://127.0.0.2:${port}/` })
        return res.end()
      }
      res.end('ok')
    })
    await new Promise<void>(resolve => server.listen(0, '0.0.0.0', resolve))
    port = (server.address() as AddressInfo).port
  })

  after(() => { server.close() })

  // same setup as http-agents.ts
  const buildAgents = (rules: SsrfRules) => {
    const httpAgent = new SsrfHttpAgent({ keepAlive: true }, rules)
    const httpsAgent = new SsrfHttpsAgent({ keepAlive: true }, rules)
    const cacheableLookup = new CacheableLookup()
    cacheableLookup.install(httpAgent)
    cacheableLookup.install(httpsAgent)
    return { httpAgent, httpsAgent, proxy: false as const }
  }

  it('should refuse IP literals before connecting', async () => {
    await assert.rejects(axios.get(`http://127.0.0.1:${port}/`, buildAgents(noRules)), { code: 'ERR_SSRF_BLOCKED' })
    await assert.rejects(axios.get('https://169.254.169.254/', buildAgents(noRules)), { code: 'ERR_SSRF_BLOCKED' })
  })

  it('should refuse hostnames resolving to non public addresses', async () => {
    await assert.rejects(axios.get(`http://localhost:${port}/`, buildAgents(noRules)), { code: 'ERR_SSRF_BLOCKED' })
  })

  it('should accept addresses declared public', async () => {
    const agents = buildAgents(getSsrfRules({ SSRF_PUBLIC_IPS: '127.0.0.1,::1' }))
    assert.equal((await axios.get(`http://127.0.0.1:${port}/`, agents)).data, 'ok')
    assert.equal((await axios.get(`http://localhost:${port}/`, agents)).data, 'ok')
  })

  it('should check every redirection', async () => {
    const agents = buildAgents(getSsrfRules({ SSRF_PUBLIC_IPS: '127.0.0.1' }))
    await assert.rejects(axios.get(`http://127.0.0.1:${port}/redirect`, agents), { code: 'ERR_SSRF_BLOCKED' })
    const allAgents = buildAgents(getSsrfRules({ SSRF_PUBLIC_IPS: '127.0.0.0/8' }))
    assert.equal((await axios.get(`http://127.0.0.1:${port}/redirect`, allAgents)).data, 'ok')
  })

  it('should guard the default lib instance, not the private one', async () => {
    const script = `
      import { axiosInstance, privateAxiosInstance } from ${JSON.stringify(fileURLToPath(new URL('./axios.ts', import.meta.url)))}
      const url = 'http://localhost:${port}/'
      try { await axiosInstance.get(url); console.log('public:allowed') } catch (err) { console.log('public:' + err.code) }
      console.log('private:' + (await privateAxiosInstance.get(url)).data)
    `
    const env = { ...process.env, SSRF_PUBLIC_IPS: '', HTTP_PROXY: '', HTTPS_PROXY: '', ALL_PROXY: '', http_proxy: '', https_proxy: '', all_proxy: '' }
    const { stdout } = await execFileAsync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', script], { env, timeout: 10000 })
    assert.match(stdout, /public:ERR_SSRF_BLOCKED/)
    assert.match(stdout, /private:ok/)
  })

  it('should disable the protection with a warning behind a proxy', async () => {
    const script = `import ${JSON.stringify(fileURLToPath(new URL('./http-agents.ts', import.meta.url)))}`
    const env = { ...process.env, HTTPS_PROXY: 'http://proxy.example.com:3128' }
    const { stderr } = await execFileAsync(process.execPath, ['--experimental-strip-types', '--input-type=module', '--eval', script], { env, timeout: 10000 })
    assert.match(stderr, /WARNING: HTTPS_PROXY is defined, the protection against server side request forgery \(SSRF\) is disabled/)
  })
})

describe('ssrf helpers for other clients', () => {
  it('should resolve and check hosts', async () => {
    await assert.rejects(resolvePublicAddress('localhost', noRules), { code: 'ERR_SSRF_BLOCKED' })
    await assert.rejects(resolvePublicAddress('127.0.0.1', noRules), { code: 'ERR_SSRF_BLOCKED' })
    await assert.rejects(resolvePublicAddress('[::1]', noRules), { code: 'ERR_SSRF_BLOCKED' })
    await assert.rejects(resolvePublicAddress('169.254.169.254'), { code: 'ERR_SSRF_BLOCKED' })
    assert.equal(await resolvePublicAddress('8.8.8.8', noRules), '8.8.8.8')
    assert.equal(await resolvePublicAddress('[2001:4860:4860::8888]', noRules), '2001:4860:4860::8888')
    const loopback = getSsrfRules({ SSRF_PUBLIC_IPS: '127.0.0.1,::1' })
    assert.ok(['127.0.0.1', '::1'].includes(await resolvePublicAddress('localhost', loopback)))
  })

  it('should refuse non public addresses in a lookup option', async () => {
    assert.ok(!process.env.SSRF_PUBLIC_IPS, 'the test must run without SSRF_PUBLIC_IPS')
    const err = await new Promise<any>((resolve) => {
      const socket = net.connect({ host: 'localhost', port: 1, lookup: publicLookup })
      socket.on('error', resolve)
      socket.on('connect', () => { socket.destroy(); resolve(undefined) })
    })
    assert.equal(err?.code, 'ERR_SSRF_BLOCKED')
    const legacyErr = await new Promise<any>(resolve => publicLookup('localhost', resolve))
    assert.equal(legacyErr?.code, 'ERR_SSRF_BLOCKED')
  })
})
