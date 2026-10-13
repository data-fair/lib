import path from 'node:path'
import type { Exec } from './exec.js'

export type SessionState = 'running' | 'exited' | 'absent'
export type Pane = { id: number, title: string, exited: boolean, exit_status: number | null, is_plugin: boolean, terminal_command: string | null }

export const sessionName = (root: string) => path.basename(root)

export const parseSessions = (out: string) => {
  const sessions: Record<string, 'running' | 'exited'> = {}
  for (const line of out.split('\n')) {
    const name = line.trim().split(/\s+/)[0]
    if (name) sessions[name] = line.includes('EXITED') ? 'exited' : 'running'
  }
  return sessions
}

export const sessionState = (exec: Exec, name: string): SessionState => {
  let out: string
  try {
    out = exec('zellij', ['list-sessions', '--no-formatting'])
  } catch {
    return 'absent' // zellij exits 1 when there is no session at all
  }
  return parseSessions(out)[name] ?? 'absent'
}

// list-panes --json, dump-screen -p and send-keys -p appeared in zellij 0.44
export const checkVersion = (exec: Exec) => {
  const version = exec('zellij', ['--version']).trim().split(' ')[1] ?? '0.0.0'
  const [major, minor] = version.split('.').map(Number)
  if (major === 0 && minor < 44) throw new Error(`zellij ${version} is too old, df-dev needs zellij >= 0.44`)
}

export const requireSession = (exec: Exec, root: string) => {
  checkVersion(exec)
  const name = sessionName(root)
  const state = sessionState(exec, name)
  if (state !== 'running') throw new Error(`zellij session "${name}" is not running (${state}): ask the user to start it with "npm run dev-zellij"`)
  return name
}

export const listPanes = (exec: Exec, session: string): Pane[] =>
  (JSON.parse(exec('zellij', ['--session', session, 'action', 'list-panes', '--json'])) as Pane[]).filter(p => !p.is_plugin)

export const findPane = (exec: Exec, session: string, title: string) => {
  const all = listPanes(exec, session)
  const pane = all.find(p => p.title === title)
  if (!pane) throw new Error(`no pane "${title}" in session ${session}, available panes: ${all.map(p => p.title).join(', ')}`)
  return pane
}

const paneRef = (pane: Pane) => `terminal_${pane.id}`

export const dumpScreen = (exec: Exec, session: string, pane: Pane) =>
  exec('zellij', ['--session', session, 'action', 'dump-screen', '-p', paneRef(pane), '--full'])

export const sendKeys = (exec: Exec, session: string, pane: Pane, keys: string) => {
  exec('zellij', ['--session', session, 'action', 'send-keys', '-p', paneRef(pane), keys])
}
