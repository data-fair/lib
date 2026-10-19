import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const cli = path.join(import.meta.dirname, 'cli.js')

describe('df-dev cli', () => {
  it('lists its commands', () => {
    const out = execFileSync('node', [cli, '--help'], { encoding: 'utf8' })
    for (const cmd of ['setup', 'init-env', 'zellij', 'status', 'logs', 'restart', 'up', 'down', 'wait-deps']) assert.match(out, new RegExp(cmd))
  })

  it('runs init-env from a sub-directory of a repo', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
    mkdirSync(path.join(root, 'dev'))
    mkdirSync(path.join(root, 'api'))
    writeFileSync(path.join(root, 'dev/dev.json'), JSON.stringify({ ports: ['NGINX_PORT'] }))
    const res = spawnSync('node', [cli, 'init-env'], { cwd: path.join(root, 'api'), encoding: 'utf8' })
    assert.match(readFileSync(path.join(root, '.env'), 'utf8'), /NGINX_PORT=2\d{4}/)
    assert.equal(res.stderr, '', 'outside a git repo, git errors must not leak')
  })

  it('fails with a readable message, not a stack trace', () => {
    try {
      execFileSync('node', [cli, 'status'], { cwd: tmpdir(), encoding: 'utf8', stdio: 'pipe' })
      assert.fail('should have failed')
    } catch (err: any) {
      assert.match(err.stderr, /dev\/dev\.json not found/)
      assert.ok(!err.stderr.includes('    at '))
    }
  })

  it('absent-config prints the overrides of the optional services that do not run', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
    mkdirSync(path.join(root, 'dev'))
    writeFileSync(path.join(root, 'dev/dev.json'), JSON.stringify({ optional: { events: { privateEventsUrl: null }, clamav: { clamav: { active: false } } } }))
    const bin = mkdtempSync(path.join(tmpdir(), 'fakebin-'))
    writeFileSync(path.join(bin, 'docker'), '#!/usr/bin/env bash\nprintf "mongodb\\nevents\\n"\n')
    chmodSync(path.join(bin, 'docker'), 0o755)
    const res = spawnSync('node', [cli, 'absent-config'], { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: bin + ':' + process.env.PATH } })
    assert.deepEqual(JSON.parse(res.stdout), { clamav: { active: false } })
  })
})
