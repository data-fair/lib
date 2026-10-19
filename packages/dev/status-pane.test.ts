import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, chmodSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

// fake docker and ps on the PATH: the status pane script only reads their output
const RUNNING_PS = 'mongo\\trunning\\thealthy\\t0\\tp-mongo-1\\nes\\trunning\\tstarting\\t0\\tp-es-1\\ns3-init\\texited\\t\\t0\\tp-s3-init-1\\nsd\\texited\\t\\t1\\tp-sd-1\\n'
const fakeBin = (session: string, psOut = RUNNING_PS, log = '/dev/null') => {
  const bin = mkdtempSync(path.join(tmpdir(), 'fakebin-'))
  const write = (name: string, body: string) => { writeFileSync(path.join(bin, name), '#!/usr/bin/env bash\n' + body); chmodSync(path.join(bin, name), 0o755) }
  write('docker', `echo "$*" >> ${log}
case "$*" in
  *"config --services"*) printf 'agents\\nmongo\\ns3-init\\nes\\nsd\\n' ;;
  *"up -d"*) sleep 1 ;;
  *"compose ps"*) printf '${psOut}' ;;
  *stats*) printf 'p-mongo-1\\t512MiB / 31GiB\\np-es-1\\t1.5GiB / 31GiB\\n' ;;
esac`)
  write('ps', `printf '%s\\n' \\
  '  100     1 20000 /usr/bin/zellij --server /run/user/1000/zellij/0.45.1/${session}' \\
  '  101   100 1048576 node --watch index.ts' \\
  '  102   101 524288 node index.ts' \\
  '  200     1 900000 claude'`)
  return bin
}

describe('status pane (bash)', () => {
  it('renders containers like compose up --wait and one RAM line', () => {
    const root = path.join(mkdtempSync(path.join(tmpdir(), 'repo-')), 'portals_x')
    mkdirSync(root)
    const res = spawnSync('bash', [path.join(import.meta.dirname, 'status-pane.sh'), '--once'], { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: fakeBin('portals_x') + ':' + process.env.PATH, NO_COLOR: '1' } })
    assert.equal(res.status, 0, res.stderr)
    // eslint-disable-next-line no-control-regex -- strips the ANSI codes of the pane output
    const lines = res.stdout.replace(/\x1b\[[0-9;]*[A-Za-z]/g, '').split('\n').filter(Boolean)
    assert.deepEqual(lines, [
      '· agents             not started',
      '⠿ es                 starting    1.5G',
      '✔ mongo              healthy     512M',
      '✔ s3-init            done',
      '✘ sd                 exited 1',
      'RAM  containers 2.0G · dev servers 1.5G · total 3.5G'
    ])
  })

  it('shows the containers the background compose up has not started yet as waiting, not failed', () => {
    const root = path.join(mkdtempSync(path.join(tmpdir(), 'repo-')), 'portals_x')
    mkdirSync(root)
    const res = spawnSync('bash', [path.join(import.meta.dirname, 'status-pane.sh'), '--once', '--start-deps'], { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: fakeBin('portals_x') + ':' + process.env.PATH, NO_COLOR: '1' } })
    assert.equal(res.status, 0, res.stderr)
    assert.match(res.stdout, /⠿ sd\s+waiting/)
    assert.match(res.stdout, /✔ s3-init\s+done/)
  })

  it('shows a stack stopped with exit code 0 as stopped, not done', () => {
    const root = path.join(mkdtempSync(path.join(tmpdir(), 'repo-')), 'portals_x')
    mkdirSync(root)
    const stopped = 'mongo\\texited\\t\\t0\\tp-mongo-1\\ns3-init\\texited\\t\\t0\\tp-s3-init-1\\n'
    const res = spawnSync('bash', [path.join(import.meta.dirname, 'status-pane.sh'), '--once'], { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: fakeBin('portals_x', stopped) + ':' + process.env.PATH, NO_COLOR: '1' } })
    assert.equal(res.status, 0, res.stderr)
    assert.match(res.stdout, /· mongo\s+stopped/)
    assert.match(res.stdout, /· s3-init\s+stopped/)
    assert.ok(!res.stdout.includes('done'))
  })

  it('parses the compose file once, not at every refresh', () => {
    const root = path.join(mkdtempSync(path.join(tmpdir(), 'repo-')), 'portals_x')
    mkdirSync(root)
    const log = path.join(root, 'docker.log')
    spawnSync('timeout', ['4', 'bash', path.join(import.meta.dirname, 'status-pane.sh')], { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: fakeBin('portals_x', RUNNING_PS, log) + ':' + process.env.PATH, NO_COLOR: '1' } })
    const calls = readFileSync(log, 'utf8').split('\n')
    assert.ok(calls.filter(c => c.includes('compose ps')).length >= 2, 'refreshed at least twice')
    assert.equal(calls.filter(c => c.includes('config --services')).length, 1)
  })
})
