import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, writeFileSync, chmodSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const script = path.join(import.meta.dirname, 'mem-cap.sh')
const runtimeDir = process.env.XDG_RUNTIME_DIR
// the cap only applies with a user systemd instance: the script checks its socket
const hasSystemd = !!runtimeDir && existsSync(path.join(runtimeDir, 'systemd/private'))

// fake systemd-run on the PATH: prints the NODE_OPTIONS the capped command would get
const fakeBin = () => {
  const bin = mkdtempSync(path.join(tmpdir(), 'fakebin-'))
  writeFileSync(path.join(bin, 'systemd-run'), '#!/usr/bin/env bash\necho "$NODE_OPTIONS"\n')
  chmodSync(path.join(bin, 'systemd-run'), 0o755)
  return bin
}

const nodeOptions = (env: Record<string, string>) => {
  const res = spawnSync('bash', [script, 'node', '-e', ''], {
    env: { ...process.env, PATH: `${fakeBin()}:${process.env.PATH}`, NODE_OPTIONS: '', ...env },
    encoding: 'utf8'
  })
  assert.equal(res.status, 0, res.stderr)
  return res.stdout.trim()
}

describe('df-mem-cap', { skip: !hasSystemd && 'no user systemd instance' }, () => {
  it('gives the V8 heap 3/4 of the memory cap', () => {
    assert.equal(nodeOptions({ DEV_MEMORY_MAX: '4G' }), '--max-old-space-size=3072')
    assert.equal(nodeOptions({ DEV_MEMORY_MAX: '1536M' }), '--max-old-space-size=1152')
  })

  it('keeps the other node options', () => {
    assert.equal(nodeOptions({ DEV_MEMORY_MAX: '2G', NODE_OPTIONS: '--no-warnings' }), '--no-warnings --max-old-space-size=1536')
  })

  it('never overrides a heap size chosen by the caller', () => {
    assert.equal(nodeOptions({ NODE_OPTIONS: '--max-old-space-size=1000' }), '--max-old-space-size=1000')
  })
})
