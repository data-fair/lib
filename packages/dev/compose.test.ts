import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { composeUp, composeDown, waitDeps, pendingDeps } from './compose.js'
import type { Exec } from './exec.js'

const recorder = () => {
  const calls: string[] = []
  return { calls, run: (cmd: string, args: string[]) => { calls.push([cmd, ...args].join(' ')) } }
}

describe('compose', () => {
  it('starts named services and waits for them', () => {
    const r = recorder()
    composeUp('/x', ['agents', 'events'], r.run)
    assert.deepEqual(r.calls, ['docker compose up -d --wait agents events'])
  })

  it('refuses to stop the whole stack', () => {
    assert.throws(() => composeDown('/x', [], recorder().run), /name the services/)
  })

  it('stops only the named services', () => {
    const r = recorder()
    composeDown('/x', ['agents'], r.run)
    assert.deepEqual(r.calls, ['docker compose stop agents'])
  })

  it('lists the services of the active profiles that are not ready yet', () => {
    const rows = [
      { Service: 'mongo', State: 'running', Health: 'healthy' },
      { Service: 'elasticsearch', State: 'running', Health: 'starting' },
      { Service: 'nginx', State: 'running', Health: '' }
    ]
    assert.deepEqual(pendingDeps(['elasticsearch', 'mongo', 'nginx', 'simple-directory'], rows), ['elasticsearch (starting)', 'simple-directory (not created)'])
  })

  it('counts a one-shot container that exited with 0 as done (s3-init)', () => {
    assert.deepEqual(pendingDeps(['s3-init', 'job'], [{ Service: 's3-init', State: 'exited', ExitCode: 0 }, { Service: 'job', State: 'exited', ExitCode: 1 }]), ['job (exited 1)'])
  })

  it('waits for the containers without ever starting them (no race between panes)', async () => {
    let t = 0
    const calls: string[] = []
    const exec: Exec = (cmd, args) => {
      calls.push(args.join(' '))
      if (args.includes('config')) return 'mongo\n'
      return t < 3000 ? '' : JSON.stringify({ Service: 'mongo', State: 'running', Health: 'healthy' }) + '\n'
    }
    await waitDeps('/x', { exec, sleep: async (ms) => { t += ms }, now: () => t, log: () => {} })
    assert.ok(t >= 3000)
    assert.ok(!calls.some(c => c.includes(' up')), calls.join(' | '))
  })

  it('fails at once when a dependency stays exited with an error code', async () => {
    let t = 0
    const exec: Exec = (cmd, args) => args.includes('config') ? 'mongo\n' : JSON.stringify({ Service: 'mongo', State: 'exited', ExitCode: 1 }) + '\n'
    await assert.rejects(waitDeps('/x', { exec, sleep: async (ms) => { t += ms }, now: () => t, log: () => {} }), /containers failed: mongo \(exited 1\).*docker compose logs mongo/)
    assert.ok(t < 10_000, `waited ${t} ms`)
  })

  it('keeps waiting for a container that restarts after a failed attempt', async () => {
    let t = 0
    const states = [{ State: 'exited', ExitCode: 1 }, { State: 'restarting' }, { State: 'running', Health: 'healthy' }]
    const exec: Exec = (cmd, args) => {
      if (args.includes('config')) return 'data-fair\n'
      return JSON.stringify({ Service: 'data-fair', ...states[Math.min(Math.floor(t / 1000), states.length - 1)] }) + '\n'
    }
    await waitDeps('/x', { exec, sleep: async (ms) => { t += ms }, now: () => t, log: () => {} })
    assert.equal(t, 2000)
  })

  it('gives up after 3 minutes and names what is not ready', async () => {
    let t = 0
    const exec: Exec = (cmd, args) => args.includes('config') ? 'mongo\n' : ''
    await assert.rejects(waitDeps('/x', { exec, sleep: async (ms) => { t += ms }, now: () => t, log: () => {} }), /not ready after 180s: mongo \(not created\).*status pane/)
  })
})
