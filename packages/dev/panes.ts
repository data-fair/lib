import type { DevConfig } from './config.js'
import { interpolate, readEnvFile } from './config.js'
import { realExec, type Exec } from './exec.js'
import { requireSession, findPane, listPanes, dumpScreen, sendKeys, type Pane } from './zellij.js'

// eslint-disable-next-line no-control-regex -- matching ANSI escape sequences is the point
export const stripAnsi = (text: string) => text.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, '')

export const tailLines = (text: string, n: number) => text.replace(/\s+$/, '').split('\n').slice(-n).join('\n')

export const logs = (root: string, title: string, n: number, exec: Exec = realExec) => {
  const session = requireSession(exec, root)
  return tailLines(stripAnsi(dumpScreen(exec, session, findPane(exec, session, title))), n)
}

export type RestartResult = { ok: boolean, message: string, logs?: string }

export const checkReady = async (url: string) => {
  try {
    return (await fetch(url, { signal: AbortSignal.timeout(2000) })).ok
  } catch {
    return false
  }
}

const STOP_TIMEOUT = 10_000
const READY_TIMEOUT = 60_000

export const restart = async (root: string, title: string, config: DevConfig, deps: {
  exec?: Exec,
  ready?: (url: string) => Promise<boolean>,
  sleep?: (ms: number) => Promise<void>,
  now?: () => number,
  env?: Record<string, string>
} = {}): Promise<RestartResult> => {
  const exec = deps.exec ?? realExec
  const ready = deps.ready ?? checkReady
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const now = deps.now ?? Date.now
  const session = requireSession(exec, root)
  let pane = findPane(exec, session, title)
  // the failure message must survive a failing dump
  const lastLogs = () => {
    try {
      return tailLines(stripAnsi(dumpScreen(exec, session, pane)), 20)
    } catch (err: any) {
      return `logs unavailable: ${err.message}`
    }
  }
  // follow the pane by id: a process can retitle its pane while exiting
  const current = (): Pane => {
    const found = listPanes(exec, session).find(p => p.id === pane.id)
    if (!found) throw new Error(`pane "${title}" disappeared from session ${session}`)
    return found
  }
  if (!pane.terminal_command) throw new Error(`pane "${title}" has no command to rerun`)
  // resolve the URL first, so a broken .env fails before anything is stopped
  const readyUrl = config.panes[title]?.ready && interpolate(config.panes[title].ready!, deps.env ?? readEnvFile(root))

  if (!pane.exited) {
    sendKeys(exec, session, pane, 'Ctrl c')
    const deadline = now() + STOP_TIMEOUT
    while (!(pane = current()).exited) {
      if (now() > deadline) return { ok: false, message: `pane "${title}" did not stop within 10s after Ctrl+C`, logs: lastLogs() }
      await sleep(200)
    }
  }
  sendKeys(exec, session, pane, 'Enter')

  if (!readyUrl) return { ok: true, message: `pane "${title}" restarted (no readiness URL in dev/dev.json, check its logs)` }
  const start = now()
  while (now() - start < READY_TIMEOUT) {
    if (await ready(readyUrl)) return { ok: true, message: `pane "${title}" ready after ${((now() - start) / 1000).toFixed(1)}s` }
    await sleep(500)
  }
  return { ok: false, message: `pane "${title}" not ready after 60s (${readyUrl}), report to the user instead of retrying`, logs: lastLogs() }
}
