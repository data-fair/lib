import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { pickPorts, hostLabel, initEnv, otherWorktreePorts, PORT_MIN, PORT_MAX } from './env.js'
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

  it('keeps hand-added values that need quotes intact through a regeneration', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
    writeFileSync(path.join(root, '.env'), 'NGINX_PORT=1\nSECRET=\'abc#def\'\nMSG="a b"\nQUOTE=`it\'s`\nCERT=\'line1\nline2\'\nPLAIN=x\n')
    await initEnv(root, config, { force: true, branch: 'x', isFree: async () => true, reserved: new Set() })
    await initEnv(root, config, { force: true, branch: 'x', isFree: async () => true, reserved: new Set() })
    const env = readEnvFile(root)
    assert.equal(env.SECRET, 'abc#def')
    assert.equal(env.MSG, 'a b')
    assert.equal(env.QUOTE, "it's")
    assert.equal(env.CERT, 'line1\nline2')
    assert.equal(env.PLAIN, 'x')
    assert.match(readFileSync(path.join(root, '.env'), 'utf8'), /^PLAIN=x$/m)
  })

  it('never draws a port written in the .env of another worktree', async () => {
    const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
    // the first draw falls on a port another worktree uses, the second on a fresh one
    const draws = [PORT_MIN + 5, PORT_MIN + 6].map(p => (p - PORT_MIN + 0.5) / (PORT_MAX - PORT_MIN + 1))
    let i = 0
    await initEnv(root, { ...config, ports: ['NGINX_PORT'] }, { branch: 'x', isFree: async () => true, reserved: new Set([PORT_MIN + 5]), random: () => draws[i++] })
    assert.equal(readEnvFile(root).NGINX_PORT, String(PORT_MIN + 6))
    assert.equal(i, 2)
  })

  it('reads the ports of the other worktrees of the repository', () => {
    const tmp = mkdtempSync(path.join(tmpdir(), 'df-dev-wt-'))
    const root = path.join(tmp, 'repo')
    const other = path.join(tmp, 'repo_feat-a')
    mkdirSync(root)
    mkdirSync(other)
    writeFileSync(path.join(other, '.env'), `NGINX_PORT=${PORT_MIN + 5}\nDEV_HOST=feat-a.localhost\nOTHER=80\n`)
    writeFileSync(path.join(root, '.env'), `NGINX_PORT=${PORT_MIN + 6}\n`)
    // output of git worktree list --porcelain, given as text: no git in this test
    const list = () => `worktree ${root}\nHEAD abc\nbranch refs/heads/master\n\nworktree ${other}\nHEAD def\nbranch refs/heads/feat-a\n`
    assert.deepEqual([...otherWorktreePorts(root, list)], [PORT_MIN + 5])
    assert.deepEqual([...otherWorktreePorts(other, list)], [PORT_MIN + 6])
    assert.deepEqual([...otherWorktreePorts(root, () => { throw new Error('not a git repository') })], [])
  })
})
