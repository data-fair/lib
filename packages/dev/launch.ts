import { existsSync } from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { readEnvFile } from './config.js'
import { realExec, type Exec } from './exec.js'
import { sessionName, sessionState, checkVersion, type SessionState } from './zellij.js'

export const launchPlan = (state: SessionState, session: string, services: string[]) => {
  if (state === 'running') {
    const plan: { deleteFirst: boolean, args: string[], warning?: string } = { deleteFirst: false, args: ['attach', session] }
    if (services.length) plan.warning = `session ${session} is already running, --services ignored: add them with "npx --no df-dev up ${services.join(' ')}"`
    return plan
  }
  // an EXITED session keeps its name reserved and makes the creation fail;
  // --layout with --session would add a tab to an existing session instead of creating one
  return { deleteFirst: state === 'exited', args: ['--session', session, '--new-session-with-layout', '.zellij.kdl'] }
}

const realSpawn = (args: string[], env: NodeJS.ProcessEnv) => spawnSync('zellij', args, { stdio: 'inherit', env }).status ?? 1

export const launch = (root: string, services: string[], deps: { exec?: Exec, spawn?: typeof realSpawn } = {}) => {
  const exec = deps.exec ?? realExec
  if (!existsSync(path.join(root, '.env'))) throw new Error('no .env in this worktree, run "npx --no df-dev setup" first')
  checkVersion(exec)
  const session = sessionName(root)
  const plan = launchPlan(sessionState(exec, session), session, services)
  if (plan.warning) console.warn(plan.warning)
  if (plan.deleteFirst) exec('zellij', ['delete-session', session])
  const env = { ...process.env, ...readEnvFile(root) }
  if (services.length) env.COMPOSE_PROFILES = services.join(',')
  process.chdir(root)
  return (deps.spawn ?? realSpawn)(plan.args, env)
}
