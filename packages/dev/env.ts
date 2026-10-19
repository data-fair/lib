import { existsSync, writeFileSync } from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { readEnvFile, type DevConfig } from './config.js'

// below the kernel ephemeral range (32768+), so a port is not taken later by an outgoing connection
export const PORT_MIN = 20000
export const PORT_MAX = 29999

export const isPortFree = (port: number) => new Promise<boolean>(resolve => {
  const server = net.createServer()
  server.once('error', () => resolve(false))
  server.listen(port, '127.0.0.1', () => server.close(() => resolve(true)))
})

export const pickPorts = async (ports: string[], isFree = isPortFree, random = Math.random) => {
  const result: Record<string, number> = {}
  const taken = new Set<number>()
  for (const name of ports) {
    for (let attempt = 0; ; attempt++) {
      if (attempt >= 100) throw new Error(`no free port found for ${name} in ${PORT_MIN}-${PORT_MAX}`)
      const port = PORT_MIN + Math.floor(random() * (PORT_MAX - PORT_MIN + 1))
      if (!taken.has(port) && await isFree(port)) {
        result[name] = port
        taken.add(port)
        break
      }
    }
  }
  return result
}

/** Ports already written in the .env of the other worktrees of the repository: free now while their env is stopped, taken later. */
const gitWorktreeList = (root: string) => execFileSync('git', ['worktree', 'list', '--porcelain'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })

export const otherWorktreePorts = (root: string, worktreeList = gitWorktreeList) => {
  const ports = new Set<number>()
  let list = ''
  try {
    list = worktreeList(root)
  } catch {
    return ports // not a git checkout: nothing to avoid
  }
  for (const line of list.split('\n')) {
    if (!line.startsWith('worktree ')) continue
    const dir = line.slice('worktree '.length)
    if (path.resolve(dir) === path.resolve(root)) continue
    for (const value of Object.values(readEnvFile(dir))) {
      const port = Number(value)
      if (Number.isInteger(port) && port >= PORT_MIN && port <= PORT_MAX) ports.add(port)
    }
  }
  return ports
}

// quoted only when parseEnv would otherwise cut or change the value (#, spaces, quotes, new lines)
export const formatEnvValue = (value: string | number) => {
  const s = String(value)
  if (/^[\w.,:/@%+=-]*$/.test(s)) return s
  // single quotes are read literally by parseEnv, backticks for a value that contains one
  for (const quote of ["'", '`', '"']) if (!s.includes(quote)) return quote + s + quote
  throw new Error(`cannot write a .env value that contains ', \` and ": ${s}`)
}

export const hostLabel = (branch: string) =>
  branch.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 63).replace(/-$/, '') || 'dev'

const currentBranch = (root: string) => {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'detached'
  } catch {
    return 'dev'
  }
}

export const initEnv = async (root: string, config: DevConfig, opts: { force?: boolean, branch?: string, isFree?: (port: number) => Promise<boolean>, reserved?: Set<number>, random?: () => number } = {}) => {
  const file = path.join(root, '.env')
  if (existsSync(file) && !opts.force) return { written: false, file }
  const reserved = opts.reserved ?? otherWorktreePorts(root)
  const isFree = opts.isFree ?? isPortFree
  const ports = await pickPorts(config.ports, async port => !reserved.has(port) && await isFree(port), opts.random)
  const vars: Record<string, string | number> = {
    // with --force, variables added by hand survive; the generated ones are drawn again
    ...readEnvFile(root),
    DEV_HOST: `${hostLabel(opts.branch ?? currentBranch(root))}.localhost`,
    // all dev services listen on the loopback, the SSRF protection of the default http agents must accept it
    SSRF_PUBLIC_IPS: '127.0.0.1,::1',
    ...ports
  }
  writeFileSync(file, Object.entries(vars).map(([k, v]) => `${k}=${formatEnvValue(v)}`).join('\n') + '\n')
  return { written: true, file }
}
