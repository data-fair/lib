import { execFileSync, spawnSync } from 'node:child_process'

export type Exec = (cmd: string, args: string[]) => string

export const realExec: Exec = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 256 * 1024 * 1024 }) // a full pane scrollback exceeds the 1 MiB default

/** Run a command with the terminal attached (output visible to the user), throw if it fails. */
export const run = (cmd: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) => {
  const result = spawnSync(cmd, args, { cwd, env, stdio: 'inherit' })
  if (result.status !== 0) throw new Error(`${cmd} ${args.join(' ')} failed with exit code ${result.status}`)
}
