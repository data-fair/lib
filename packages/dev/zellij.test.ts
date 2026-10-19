import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { parseSessions, sessionState, requireSession, findPane, checkVersion, sessionName } from './zellij.js'
import type { Exec } from './exec.js'

const panes = [
  { id: 0, title: 'status', exited: false, exit_status: null, is_plugin: false, terminal_command: 'npx --no df-dev status --watch' },
  { id: 1, title: 'api', exited: false, exit_status: null, is_plugin: false, terminal_command: 'bash -c ...' },
  { id: 0, title: 'tab-bar', exited: false, exit_status: null, is_plugin: true, terminal_command: null }
]

const fakeExec = (outputs: Record<string, string | Error>): Exec => (cmd, args) => {
  const key = [cmd, ...args].join(' ')
  const match = Object.keys(outputs).find(k => key.includes(k))
  if (!match) throw new Error(`unexpected call: ${key}`)
  const out = outputs[match]
  if (out instanceof Error) throw out
  return out
}

describe('zellij sessions', () => {
  it('names the session after the worktree dir', () => {
    assert.equal(sessionName('/home/u/Documents/portals_feat-x'), 'portals_feat-x')
  })

  it('parses running and exited sessions', () => {
    const out = 'portals [Created 2m ago] (current)\nportals_feat-x [Created 1h ago] (EXITED - attach to resurrect)\n'
    assert.deepEqual(parseSessions(out), { portals: 'running', 'portals_feat-x': 'exited' })
  })

  it('reports absent when zellij has no session at all', () => {
    const exec = fakeExec({ 'list-sessions': new Error('No active zellij sessions found.') })
    assert.equal(sessionState(exec, 'portals'), 'absent')
  })

  it('tells the agent to ask the user when the session is not running', () => {
    const exec = fakeExec({ '--version': 'zellij 0.45.1', 'list-sessions': 'portals [Created 1h ago] (EXITED - attach to resurrect)\n' })
    assert.throws(() => requireSession(exec, '/x/portals'), /not running.*npm run dev-zellij/)
  })

  it('refuses zellij older than 0.44', () => {
    assert.throws(() => checkVersion(fakeExec({ '--version': 'zellij 0.40.1' })), /0\.44/)
    checkVersion(fakeExec({ '--version': 'zellij 0.45.1' }))
  })
})

describe('zellij panes', () => {
  it('finds a terminal pane by title', () => {
    const exec = fakeExec({ 'list-panes': JSON.stringify(panes) })
    assert.equal(findPane(exec, 'portals', 'api').id, 1)
  })

  it('lists the available titles when a pane is not found', () => {
    const exec = fakeExec({ 'list-panes': JSON.stringify(panes) })
    assert.throws(() => findPane(exec, 'portals', 'worker'), /no pane "worker".*status, api/)
  })
})
