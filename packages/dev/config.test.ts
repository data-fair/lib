/* eslint-disable no-template-curly-in-string -- ${VAR} placeholders are the dev/dev.json syntax */
import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { findRoot, readDevConfig, interpolate, readEnvFile } from './config.js'

const makeRepo = (devJson: object) => {
  const root = mkdtempSync(path.join(tmpdir(), 'df-dev-'))
  mkdirSync(path.join(root, 'dev'))
  mkdirSync(path.join(root, 'api'))
  writeFileSync(path.join(root, 'dev/dev.json'), JSON.stringify(devJson))
  return root
}

describe('config', () => {
  it('finds the repo root from a sub-directory', () => {
    const root = makeRepo({})
    assert.equal(findRoot(path.join(root, 'api')), root)
  })

  it('fails clearly outside a repo using the convention', () => {
    assert.throws(() => findRoot(tmpdir()), /dev\/dev\.json not found/)
  })

  it('fills defaults for missing sections', () => {
    const root = makeRepo({ ports: ['NGINX_PORT'] })
    assert.deepEqual(readDevConfig(root), { ports: ['NGINX_PORT'], panes: {}, url: undefined, setup: [], optional: {} })
  })

  it('interpolates variables', () => {
    assert.equal(interpolate('http://localhost:${DEV_API_PORT}/api/ping', { DEV_API_PORT: '21000' }), 'http://localhost:21000/api/ping')
  })

  it('names a variable missing from .env and suggests regenerating it', () => {
    assert.throws(() => interpolate('http://localhost:${DEV_PORTAL_PORT}/', {}), /DEV_PORTAL_PORT.*df-dev init-env --force/)
  })

  it('reads .env, ignoring comments and blank lines', () => {
    const root = makeRepo({})
    writeFileSync(path.join(root, '.env'), '# comment\nA=1\n\nB=x=y\n')
    assert.deepEqual(readEnvFile(root), { A: '1', B: 'x=y' })
  })

  it('parses .env like dotenv (quotes, inline comments)', () => {
    const root = makeRepo({})
    writeFileSync(path.join(root, '.env'), 'A="a b"\nB=x # note\nC=\'single\'\n')
    assert.deepEqual(readEnvFile(root), { A: 'a b', B: 'x', C: 'single' })
  })
})
