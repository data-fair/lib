import { run as realRun, realExec, type Exec } from './exec.js'

// optional services live in a compose profile named after them; naming a service starts it whatever its profile
export const composeUp = (root: string, services: string[], runFn = realRun) => {
  runFn('docker', ['compose', 'up', '-d', '--wait', ...services], root)
}

export const composeDown = (root: string, services: string[], runFn = realRun) => {
  if (!services.length) throw new Error('name the services to stop, the whole stack is stopped by the user when closing zellij')
  runFn('docker', ['compose', 'stop', ...services], root)
}

type PsRow = { Service: string, State: string, Health?: string, ExitCode?: number }

export const pendingDeps = (services: string[], rows: PsRow[]) => services.flatMap(service => {
  const row = rows.find(r => r.Service === service)
  if (!row) return [`${service} (not created)`]
  if (row.State === 'running' && (!row.Health || row.Health === 'healthy')) return []
  if (row.State === 'exited' && row.ExitCode === 0) return [] // one-shot init container (s3-init…) that completed
  return [`${service} (${row.Health || row.State}${row.State === 'exited' ? ` ${row.ExitCode}` : ''})`]
})

const WAIT_TIMEOUT = 180_000

/**
 * First command of the panes that need the containers. It only waits: the status pane starts
 * the containers, and two panes running "compose up" at the same time conflict on container names.
 * The services are those of the active profiles (COMPOSE_PROFILES comes from the zellij session env).
 */
export const waitDeps = async (root: string, deps: { exec?: Exec, sleep?: (ms: number) => Promise<void>, now?: () => number, log?: (msg: string) => void } = {}) => {
  const exec = deps.exec ?? realExec
  const sleep = deps.sleep ?? ((ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms)))
  const now = deps.now ?? Date.now
  const log = deps.log ?? console.log
  const compose = ['compose', '--project-directory', root]
  const services = exec('docker', [...compose, 'config', '--services']).split('\n').filter(Boolean).sort()
  const start = now()
  let lastLog = -Infinity
  while (true) {
    const out = exec('docker', [...compose, 'ps', '-a', '--format', 'json'])
    const rows: PsRow[] = out.split('\n').filter(l => l.trim()).flatMap(l => JSON.parse(l))
    const pending = pendingDeps(services, rows)
    if (!pending.length) return
    if (now() - start >= WAIT_TIMEOUT) throw new Error(`containers not ready after 180s: ${pending.join(', ')} (see the status pane)`)
    if (now() - lastLog >= 10_000) {
      log(`waiting for containers: ${pending.join(', ')}`)
      lastLog = now()
    }
    await sleep(1000)
  }
}
