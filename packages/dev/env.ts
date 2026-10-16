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

export const hostLabel = (branch: string) =>
  branch.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 63).replace(/-$/, '') || 'dev'

const currentBranch = (root: string) => {
  try {
    return execFileSync('git', ['branch', '--show-current'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() || 'detached'
  } catch {
    return 'dev'
  }
}

export const initEnv = async (root: string, config: DevConfig, opts: { force?: boolean, branch?: string, isFree?: (port: number) => Promise<boolean> } = {}) => {
  const file = path.join(root, '.env')
  if (existsSync(file) && !opts.force) return { written: false, file }
  const ports = await pickPorts(config.ports, opts.isFree)
  const vars: Record<string, string | number> = {
    // with --force, variables added by hand survive; the generated ones are drawn again
    ...readEnvFile(root),
    DEV_HOST: `${hostLabel(opts.branch ?? currentBranch(root))}.localhost`,
    // all dev services listen on the loopback, the SSRF protection of the default http agents must accept it
    SSRF_PUBLIC_IPS: '127.0.0.1,::1',
    ...ports
  }
  writeFileSync(file, Object.entries(vars).map(([k, v]) => `${k}=${v}`).join('\n') + '\n')
  return { written: true, file }
}
