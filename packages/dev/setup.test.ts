import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { setup } from './setup.js'

const makeRepo = (scripts: Record<string, string>, ui = true) => {
  const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
  writeFileSync(path.join(root, 'package.json'), JSON.stringify({ scripts }))
  if (ui) {
    mkdirSync(path.join(root, 'ui'))
    writeFileSync(path.join(root, 'ui/package.json'), '{}')
  }
  return root
}
const config = { ports: ['NGINX_PORT'], panes: {} }

describe('setup', () => {
  it('creates .env, runs build-types then builds the ui workspace', async () => {
    const root = makeRepo({ 'build-types': 'df-build-types api/types' })
    const calls: string[] = []
    await setup(root, config, { run: (cmd, args) => { calls.push([cmd, ...args].join(' ')) }, isFree: async () => true })
    assert.ok(existsSync(path.join(root, '.env')))
    assert.deepEqual(calls, ['npm run build-types', 'npm -w ui run build'])
  })

  it('does not rebuild an existing UI build and skips build-types when the repo has none', async () => {
    const root = makeRepo({})
    mkdirSync(path.join(root, 'ui/dist'))
    writeFileSync(path.join(root, 'ui/dist/index.html'), '<html>real</html>')
    const calls: string[] = []
    await setup(root, config, { run: (cmd, args) => { calls.push(cmd) }, isFree: async () => true })
    assert.deepEqual(calls, [])
    assert.equal(readFileSync(path.join(root, 'ui/dist/index.html'), 'utf8'), '<html>real</html>')
  })

  it('builds no UI in a repo without a ui workspace', async () => {
    const root = makeRepo({}, false)
    const calls: string[] = []
    await setup(root, config, { run: (cmd, args) => { calls.push(cmd) }, isFree: async () => true })
    assert.deepEqual(calls, [])
  })

  it('runs the repo-specific setup commands before build-types', async () => {
    const root = makeRepo({ 'build-types': 'df-build-types api/types' })
    const calls: string[] = []
    await setup(root, { ...config, setup: ['npm -w parquet-writer run build'] }, { run: (cmd, args) => { calls.push([cmd, ...args].join(' ')) }, isFree: async () => true })
    assert.deepEqual(calls, ['bash -c npm -w parquet-writer run build', 'npm run build-types', 'npm -w ui run build'])
  })
})
