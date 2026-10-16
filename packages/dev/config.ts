import { readFileSync, existsSync } from 'node:fs'
import path from 'node:path'
import { parseEnv } from 'node:util'

export type PaneOptions = { ready?: string }
export type DevConfig = {
  ports: string[]
  panes: Record<string, PaneOptions>
  url?: string
  setup?: string[]
  optional?: Record<string, Record<string, unknown>>
}

export const findRoot = (start: string): string => {
  let dir = path.resolve(start)
  while (true) {
    if (existsSync(path.join(dir, 'dev/dev.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) throw new Error(`dev/dev.json not found in ${start} or its parents: this repo does not use the df-dev convention`)
    dir = parent
  }
}

export const readDevConfig = (root: string): DevConfig => {
  const raw = JSON.parse(readFileSync(path.join(root, 'dev/dev.json'), 'utf8'))
  return { ports: raw.ports ?? [], panes: raw.panes ?? {}, url: raw.url, setup: raw.setup ?? [], optional: raw.optional ?? {} }
}

export const interpolate = (template: string, env: Record<string, string | undefined>) =>
  template.replace(/\$\{(\w+)\}/g, (_, name: string) => {
    const value = env[name]
    if (value === undefined) throw new Error(`variable ${name} is not defined in .env (added to dev/dev.json after .env was created?), regenerate it with "npx --no df-dev init-env --force"`)
    return value
  })

export const readEnvFile = (root: string): Record<string, string> => {
  const file = path.join(root, '.env')
  if (!existsSync(file)) return {}
  // same parser as node --env-file, so panes and df-dev read the same values
  return parseEnv(readFileSync(file, 'utf8')) as Record<string, string>
}
