import { readlinkSync } from 'node:fs'
import path from 'node:path'
import { realExec, type Exec } from './exec.js'
import { sessionName, sessionState, listPanes } from './zellij.js'
import { readDevConfig, readEnvFile, interpolate, type DevConfig } from './config.js'
import { checkReady } from './panes.js'

export type Container = { service: string, state: string, health: string, memory?: string, exitCode?: number }
export type Proc = { label: string, rssKb: number }
export type PaneState = { title: string, exited: boolean, exit_status: number | null, ready?: boolean, readyUrl?: string }
export type StatusData = { urls?: { label: string, url: string }[], containers: Container[], containersError?: string, panes: PaneState[], panesError?: string, procs: Proc[] }

const COLORS = { green: '32', yellow: '33', red: '31', dim: '2' } as const

export const containerMark = (c: Container) => {
  if (c.state === 'not started') return { mark: '·', color: 'dim' as const, text: 'not started' }
  if (c.state === 'exited' && c.exitCode === 0) return { mark: '✔', color: 'green' as const, text: 'done' } // one-shot init container
  const text = c.health || c.state
  if (text === 'healthy' || (c.state === 'running' && !c.health)) return { mark: '✔', color: 'green' as const, text }
  if (text === 'starting' || c.state === 'restarting' || c.state === 'created') return { mark: '⠿', color: 'yellow' as const, text }
  return { mark: '✘', color: 'red' as const, text }
}

const human = (kb: number) => kb >= 1048576 ? `${(kb / 1048576).toFixed(1)}G` : `${Math.round(kb / 1024)}M`

export const renderStatus = (data: StatusData, color: boolean) => {
  const paint = (c: keyof typeof COLORS, s: string) => color ? `\x1b[${COLORS[c]}m${s}\x1b[0m` : s
  const lines = (data.urls ?? []).map(u => `${u.label}: ${u.url}`)
  if (lines.length) lines.push('')
  lines.push(...data.containersError
    ? [paint('red', `containers unavailable: ${data.containersError}`)]
    : data.containers.map(c => {
        const m = containerMark(c)
        return `${paint(m.color, m.mark)} ${c.service.padEnd(18)} ${paint(m.color, m.text.padEnd(11))} ${c.memory ?? ''}`.trimEnd()
      }))
  lines.push('')
  if (data.panesError) lines.push(paint('red', data.panesError))
  for (const p of data.panes) {
    if (p.exited) lines.push(`${paint('red', '✘')} ${p.title.padEnd(18)} ${paint('red', `exited (${p.exit_status ?? '?'})`)}`)
    else if (p.ready === false) lines.push(`${paint('yellow', '⠿')} ${p.title.padEnd(18)} ${paint('yellow', `running, not ready (${p.readyUrl})`)}`)
    else lines.push(`${paint('green', '✔')} ${p.title.padEnd(18)} ${paint('green', 'running')}`)
  }
  lines.push('')
  for (const p of data.procs) lines.push(`${p.label.slice(0, 40).padEnd(40)} ${human(p.rssKb)}`)
  lines.push(`${'processes total'.padEnd(40)} ${human(data.procs.reduce((sum, p) => sum + p.rssKb, 0))}`)
  return lines.join('\n')
}

// docker compose prints one JSON object per line (older versions: a single JSON array)
const jsonLines = (out: string): any[] => out.split('\n').filter(l => l.trim()).flatMap(l => JSON.parse(l))

const SHELLS = ['bash', 'sh', 'zsh']

/** Processes started by the panes of a zellij session: descendants of its server, shells excluded. */
export const sessionProcesses = (psOut: string, session: string, cwdOf: (pid: number) => string | undefined, root: string, selfPid?: number): Proc[] => {
  const rows = psOut.split('\n').map(line => line.trim().match(/^(\d+)\s+(\d+)\s+(\d+)\s+(.*)$/)).filter(m => !!m)
    .map(m => ({ pid: Number(m[1]), ppid: Number(m[2]), rssKb: Number(m[3]), args: m[4] }))
  const server = rows.find(r => / --server \S*\/zellij\/\S+\//.test(r.args) && r.args.endsWith('/' + session))
  if (!server) return []
  const inSession = new Set([server.pid])
  // the status commands (this one, the df-status pane) and their children (ps, sleep, docker) are tooling, not dev processes
  const self = new Set([...(selfPid ? [selfPid] : []), ...rows.filter(r => / df-dev status\b|df-status\b/.test(' ' + r.args.replace(/^\S*node\s+\S*\//, ' '))).map(r => r.pid)])
  let grew = true
  while (grew) { // ps order is not parents-first when pids wrap around
    grew = false
    for (const r of rows) {
      if (!inSession.has(r.pid) && inSession.has(r.ppid)) { inSession.add(r.pid); grew = true }
      if (!self.has(r.pid) && self.has(r.ppid)) { self.add(r.pid); grew = true }
    }
  }
  const procs: Proc[] = []
  for (const r of rows) {
    if (r.pid === server.pid || !inSession.has(r.pid) || self.has(r.pid) || SHELLS.includes(path.basename(r.args.split(' ')[0]))) continue
    const cwd = cwdOf(r.pid)
    const dir = cwd && (cwd === root || cwd.startsWith(root + path.sep)) ? (path.relative(root, cwd) || '.') : '?'
    procs.push({ label: `${dir}: ${r.args.replace(/^(\S*\/)?node\s+(?=\S*node_modules\/\.bin\/)/, '').replace(/^\S*node_modules\/\.bin\//, '').replace(/^\S*\//, '')}`, rssKb: r.rssKb })
  }
  return procs
}

const collectContainers = (root: string, exec: Exec): Container[] => {
  const ps = jsonLines(exec('docker', ['compose', '--project-directory', root, 'ps', '-a', '--format', 'json']))
  const all = exec('docker', ['compose', '--project-directory', root, '--profile', '*', 'config', '--services']).split('\n').filter(Boolean)
  const memory: Record<string, string> = {}
  if (ps.length) {
    for (const s of jsonLines(exec('docker', ['stats', '--no-stream', '--format', '{{json .}}', ...ps.map((c: any) => c.Name)]))) {
      memory[s.Name] = String(s.MemUsage).split(' / ')[0]
    }
  }
  return all.sort().map(service => {
    const c = ps.find((p: any) => p.Service === service)
    return c ? { service, state: c.State, health: c.Health ?? '', memory: memory[c.Name], exitCode: c.ExitCode } : { service, state: 'not started', health: '' }
  })
}

// each part fails on its own: a docker error must not hide the panes, and the reverse
export const collectStatus = (root: string, exec: Exec = realExec): StatusData => {
  const data: StatusData = { containers: [], panes: [], procs: [] }
  try {
    const env = readEnvFile(root)
    data.urls = Object.entries(readDevConfig(root).urls ?? {}).map(([label, url]) => ({ label, url: interpolate(url, env) }))
  } catch {} // URLs are a convenience, the rest of the status must still show
  try {
    data.containers = collectContainers(root, exec)
  } catch (err: any) {
    data.containersError = err.message.split('\n')[0]
  }
  const session = sessionName(root)
  try {
    const state = sessionState(exec, session)
    if (state === 'running') data.panes = listPanes(exec, session).map(p => ({ title: p.title, exited: p.exited, exit_status: p.exit_status }))
    else data.panesError = `zellij session "${session}" is not running (${state}): ask the user to start it with "npm run dev-zellij"`
  } catch (err: any) {
    data.panesError = `panes unavailable: ${err.message.split('\n')[0]}`
  }
  const cwdOf = (pid: number) => { try { return readlinkSync(`/proc/${pid}/cwd`) } catch { return undefined } }
  data.procs = sessionProcesses(exec('ps', ['-u', String(process.getuid?.() ?? ''), '-o', 'pid=,ppid=,rss=,args=']), session, cwdOf, root, process.pid)
  return data
}

/** A running pane can be broken: nodemon (or node --watch) stays alive "waiting for file changes" after a crash. */
export const checkReadiness = async (panes: PaneState[], config: DevConfig, env: Record<string, string>, ready = checkReady): Promise<PaneState[]> =>
  Promise.all(panes.map(async p => {
    const template = config.panes[p.title]?.ready
    if (p.exited || !template) return p
    const readyUrl = interpolate(template, env)
    return { ...p, ready: await ready(readyUrl), readyUrl }
  }))
