#!/usr/bin/env node
import { program } from 'commander'
import { findRoot, readDevConfig, readEnvFile } from './config.js'
import { initEnv } from './env.js'
import { setup } from './setup.js'
import { launch } from './launch.js'
import { logs, restart } from './panes.js'
import { composeUp, composeDown, waitDeps } from './compose.js'
import { collectStatus, renderStatus, checkReadiness } from './status.js'
import { absentConfig } from './optional.js'
import { realExec } from './exec.js'

const root = () => findRoot(process.cwd())

program.name('df-dev').description('Dev environment of a data-fair service: setup, zellij session, status, logs and restart.')

program.command('setup').description('create .env if missing, build types, build the ui workspace if missing (first install and new worktrees)')
  .action(async () => { const r = root(); await setup(r, readDevConfig(r)) })

program.command('init-env').description('write .env with free ports if missing').option('--force', 'draw the ports and DEV_HOST again, keep the variables added by hand')
  .action(async (opts) => {
    const r = root()
    const res = await initEnv(r, readDevConfig(r), { force: opts.force })
    console.log(res.written ? `wrote ${res.file}` : `${res.file} exists, use --force to regenerate it`)
  })

program.command('zellij').description('attach to the session of this worktree, or create it').option('--services <list>', 'optional compose services to start, comma separated', '')
  .action((opts) => { process.exitCode = launch(root(), opts.services.split(',').filter(Boolean)) })

program.command('status').description('containers, panes (with readiness) and dev processes memory, for agents (the status pane is df-status)')
  .action(async () => {
    const r = root()
    const data = collectStatus(r)
    try {
      data.panes = await checkReadiness(data.panes, readDevConfig(r), readEnvFile(r))
    } catch (err: any) {
      data.panesError = `readiness not checked: ${err.message}`
    }
    console.log(renderStatus(data, false))
  })

program.command('absent-config').description('JSON config overrides (dev.json "optional") for the optional services that do not run, for NODE_CONFIG')
  .action(() => {
    const r = root()
    const running = realExec('docker', ['compose', '--project-directory', r, 'ps', '--services', '--status', 'running']).split('\n').filter(Boolean)
    console.log(JSON.stringify(absentConfig(readDevConfig(r).optional ?? {}, running)))
  })

program.command('logs <pane>').description('last lines of a zellij pane, plain text').option('-n, --lines <n>', 'number of lines', '100')
  .action((pane, opts) => { console.log(logs(root(), pane, Number(opts.lines))) })

program.command('restart <pane>').description('stop and rerun a zellij pane, then wait for its readiness URL')
  .action(async (pane) => {
    const r = root()
    const res = await restart(r, pane, readDevConfig(r))
    console.log(res.message)
    if (res.logs) console.log('--- last logs ---\n' + res.logs)
    if (!res.ok) process.exitCode = 1
  })

program.command('up <services...>').description('start optional compose services in the running env')
  .action((services) => { composeUp(root(), services) })

program.command('down <services...>').description('stop optional compose services')
  .action((services) => { composeDown(root(), services) })

program.command('wait-deps').description('wait until the containers of the active profiles are healthy (first command of process panes; the status pane starts them)')
  .action(async () => { await waitDeps(root()) })

program.parseAsync().catch((err) => {
  console.error(`df-dev: ${err.message}`)
  process.exitCode = 1
})
