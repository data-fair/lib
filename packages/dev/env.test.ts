import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pickPorts, hostLabel, initEnv, PORT_MIN, PORT_MAX } from './env.js'
import { readEnvFile } from './config.js'

const config = { ports: ['NGINX_PORT', 'DEV_API_PORT'], panes: {} }

describe('pickPorts', () => {
  it('draws distinct free ports in range', async () => {
    const ports = await pickPorts(config.ports, async () => true)
    for (const name of ['NGINX_PORT', 'DEV_API_PORT']) {
      assert.ok(ports[name] >= PORT_MIN && ports[name] <= PORT_MAX)
    }
    assert.notEqual(ports.NGINX_PORT, ports.DEV_API_PORT)
  })

  it('skips ports that are busy', async () => {
    const busy = new Set([PORT_MIN])
    let n = 0
    const random = () => (n++ === 0 ? 0 : 0.5) // first draw hits the busy PORT_MIN
    const ports = await pickPorts(['A'], async port => !busy.has(port), random)
    assert.notEqual(ports.A, PORT_MIN)
  })
})

describe('hostLabel', () => {
  it('turns any branch name into a valid hostname label', () => {
    assert.equal(hostLabel('feat/X_y'), 'feat-x-y')
    assert.equal(hostLabel('master'), 'master')
    assert.equal(hostLabel('--weird--'), 'weird')
  })

  it('caps the label at 63 characters (DNS limit)', () => {
    const label = hostLabel('a'.repeat(70) + '-b')
    assert.equal(label.length, 63)
    assert.ok(!label.endsWith('-'))
  })
})

describe('initEnv', () => {
  it('writes ports, DEV_HOST and SSRF_PUBLIC_IPS', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
    const res = await initEnv(root, config, { branch: 'feat/X', isFree: async () => true })
    assert.equal(res.written, true)
    const env = readEnvFile(root)
    assert.equal(env.DEV_HOST, 'feat-x.localhost')
    assert.equal(env.SSRF_PUBLIC_IPS, '127.0.0.1,::1')
    assert.ok(Number(env.DEV_API_PORT) >= PORT_MIN)
  })

  it('never overwrites an existing .env without force', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
    writeFileSync(path.join(root, '.env'), 'NGINX_PORT=1\n')
    const res = await initEnv(root, config, { branch: 'x', isFree: async () => true })
    assert.equal(res.written, false)
    assert.equal(readFileSync(path.join(root, '.env'), 'utf8'), 'NGINX_PORT=1\n')
  })

  it('regenerates with force', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
    writeFileSync(path.join(root, '.env'), 'NGINX_PORT=1\n')
    await initEnv(root, config, { force: true, branch: 'x', isFree: async () => true })
    assert.notEqual(readEnvFile(root).NGINX_PORT, '1')
  })

  it('keeps the variables added by hand when regenerating with force', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
    writeFileSync(path.join(root, '.env'), 'NGINX_PORT=1\nDEV_HOST=old.localhost\nMY_TOKEN=secret\n')
    await initEnv(root, config, { force: true, branch: 'x', isFree: async () => true })
    const env = readEnvFile(root)
    assert.equal(env.MY_TOKEN, 'secret')
    assert.equal(env.DEV_HOST, 'x.localhost')
    assert.notEqual(env.NGINX_PORT, '1')
  })
})
