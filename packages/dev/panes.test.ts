/* eslint-disable no-template-curly-in-string -- ${VAR} placeholders are the dev/dev.json syntax */
import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { stripAnsi, tailLines, restart } from './panes.js'
import type { Exec } from './exec.js'

const config = { ports: [], panes: { api: { ready: 'http://localhost:${DEV_API_PORT}/api/ping' } } }

// a fake zellij whose api pane stops on Ctrl c (unless stubborn) and runs again on Enter
const makeZellij = (opts: { stubborn?: boolean, retitle?: boolean, dumpFails?: boolean } = {}) => {
  const state = { exited: false, keys: [] as string[], title: 'api' }
  const exec: Exec = (cmd, args) => {
    if (args[0] === '--version') return 'zellij 0.45.1'
    if (args[0] === 'list-sessions') return 'portals [Created 1m ago]\n'
    const action = args[3]
    if (action === 'list-panes') return JSON.stringify([{ id: 3, title: state.title, exited: state.exited, exit_status: state.exited ? 0 : null, is_plugin: false, terminal_command: 'node --watch index.ts' }])
    if (action === 'send-keys') {
      const keys = args[6]
      state.keys.push(keys)
      if (keys === 'Ctrl c' && !opts.stubborn) state.exited = true
      if (keys === 'Ctrl c' && opts.retitle) state.title = 'node (exited)'
      if (keys === 'Enter') state.exited = false
      return ''
    }
    if (action === 'dump-screen') {
      if (opts.dumpFails) throw new Error('spawnSync zellij ENOBUFS')
      return 'line1\nAPI crashed\n\n'
    }
    throw new Error('unexpected ' + args.join(' '))
  }
  return { exec, state }
}

const clock = () => {
  let t = 0
  return { now: () => t, sleep: async (ms: number) => { t += ms } }
}

describe('logs helpers', () => {
  it('strips ANSI codes', () => {
    assert.equal(stripAnsi('\x1b[32mVITE\x1b[0m ready'), 'VITE ready')
  })
  it('keeps the last n non-trailing-blank lines', () => {
    assert.equal(tailLines('a\nb\nc\n\n\n', 2), 'b\nc')
  })
})

describe('restart', () => {
  it('stops the pane, reruns it and waits for readiness', async () => {
    const { exec, state } = makeZellij()
    const { now, sleep } = clock()
    let checks = 0
    const res = await restart('/x/portals', 'api', config, { exec, now, sleep, env: { DEV_API_PORT: '21000' }, ready: async (url) => { assert.equal(url, 'http://localhost:21000/api/ping'); return ++checks >= 3 } })
    assert.deepEqual(state.keys, ['Ctrl c', 'Enter'])
    assert.equal(res.ok, true)
    assert.match(res.message, /ready after/)
  })

  it('reports a pane that ignores Ctrl c instead of pressing Enter on it', async () => {
    const { exec, state } = makeZellij({ stubborn: true })
    const { now, sleep } = clock()
    const res = await restart('/x/portals', 'api', config, { exec, now, sleep, env: { DEV_API_PORT: '21000' }, ready: async () => true })
    assert.equal(res.ok, false)
    assert.match(res.message, /did not stop within 10s/)
    assert.deepEqual(state.keys, ['Ctrl c'])
  })

  it('returns the last logs when the process never gets ready', async () => {
    const { exec } = makeZellij()
    const { now, sleep } = clock()
    const res = await restart('/x/portals', 'api', config, { exec, now, sleep, env: { DEV_API_PORT: '21000' }, ready: async () => false })
    assert.equal(res.ok, false)
    assert.match(res.message, /not ready after 60s/)
    assert.match(res.logs ?? '', /API crashed/)
  })

  it('reruns an already exited pane without sending Ctrl c', async () => {
    const { exec, state } = makeZellij()
    state.exited = true
    const { now, sleep } = clock()
    await restart('/x/portals', 'api', config, { exec, now, sleep, env: { DEV_API_PORT: '21000' }, ready: async () => true })
    assert.deepEqual(state.keys, ['Enter'])
  })

  it('follows the pane by id when its title changes after Ctrl c', async () => {
    const { exec, state } = makeZellij({ retitle: true })
    const { now, sleep } = clock()
    const res = await restart('/x/portals', 'api', config, { exec, now, sleep, env: { DEV_API_PORT: '21000' }, ready: async () => true })
    assert.deepEqual(state.keys, ['Ctrl c', 'Enter'])
    assert.equal(res.ok, true)
  })

  it('keeps the failure message when the logs cannot be read', async () => {
    const { exec } = makeZellij({ dumpFails: true })
    const { now, sleep } = clock()
    const res = await restart('/x/portals', 'api', config, { exec, now, sleep, env: { DEV_API_PORT: '21000' }, ready: async () => false })
    assert.match(res.message, /not ready after 60s/)
    assert.match(res.logs ?? '', /logs unavailable: .*ENOBUFS/)
  })
})
