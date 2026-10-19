import { run as realRun, realExec, jsonLines, type Exec } from './exec.js'

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

/** Dependencies that exited with an error code: they will not become ready by waiting. */
export const failedDeps = (services: string[], rows: PsRow[]) => rows
  .filter(r => services.includes(r.Service) && r.State === 'exited' && r.ExitCode !== 0)
  .map(r => `${r.Service} (exited ${r.ExitCode})`)

const WAIT_TIMEOUT = 180_000
// a container with a restart policy is briefly "exited" between two attempts: fail on a lasting exit only
const FAILED_POLLS = 3

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
  let failedPolls = 0
  while (true) {
    const rows: PsRow[] = jsonLines(exec('docker', [...compose, 'ps', '-a', '--format', 'json']))
    const pending = pendingDeps(services, rows)
    if (!pending.length) return
    const failed = failedDeps(services, rows)
    failedPolls = failed.length ? failedPolls + 1 : 0
    if (failedPolls >= FAILED_POLLS) throw new Error(`containers failed: ${failed.join(', ')} (see "docker compose logs ${failed.map(f => f.split(' ')[0]).join(' ')}")`)
    if (now() - start >= WAIT_TIMEOUT) throw new Error(`containers not ready after 180s: ${pending.join(', ')} (see the status pane)`)
    if (now() - lastLog >= 10_000) {
      log(`waiting for containers: ${pending.join(', ')}`)
      lastLog = now()
    }
    await sleep(1000)
  }
}
