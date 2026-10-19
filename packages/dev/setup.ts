import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import type { DevConfig } from './config.js'
import { initEnv } from './env.js'
import { run as realRun } from './exec.js'

export const setup = async (root: string, config: DevConfig, deps: { run?: typeof realRun, isFree?: (port: number) => Promise<boolean> } = {}) => {
  const run = deps.run ?? realRun
  const env = await initEnv(root, config, { isFree: deps.isFree })
  console.log(env.written ? `created ${env.file}` : `kept existing ${env.file} (npx --no df-dev init-env --force to regenerate)`)
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'))
  // repo-specific steps (native modules…) that the types or the UI build depend on
  for (const command of config.setup ?? []) run('bash', ['-c', command], root)
  if (pkg.scripts?.['build-types']) run('npm', ['run', 'build-types'], root)
  // the API's serve-spa reads ui/dist/index.html at startup, and the build generates the
  // auto-import declarations check-types needs: build once, later runs keep the existing build
  if (existsSync(path.join(root, 'ui/package.json')) && !existsSync(path.join(root, 'ui/dist/index.html'))) {
    run('npm', ['-w', 'ui', 'run', 'build'], root)
  }
}
