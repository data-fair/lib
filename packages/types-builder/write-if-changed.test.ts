import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { mkdtempSync, readFileSync, writeFileSync, statSync, readdirSync, existsSync, watch } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { writeIfChanged, removeUnlisted } from './write-if-changed.js'

describe('writeIfChanged', () => {
  it('writes a new file and reports it', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wic-'))
    assert.equal(writeIfChanged(path.join(dir, 'a.js'), 'x'), true)
    assert.equal(readFileSync(path.join(dir, 'a.js'), 'utf8'), 'x')
  })

  it('does not touch a file whose content is identical', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wic-'))
    const file = path.join(dir, 'a.js')
    writeFileSync(file, 'x')
    const before = statSync(file).mtimeMs
    assert.equal(writeIfChanged(file, 'x'), false)
    assert.equal(statSync(file).mtimeMs, before)
  })

  it('replaces a changed file without leaving a temp file and without a moment where it is missing', async () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wic-'))
    const file = path.join(dir, 'index.js')
    writeFileSync(file, 'old')
    let missing = false
    const watcher = watch(dir, () => { if (!existsSync(file)) missing = true })
    writeIfChanged(file, 'new')
    await new Promise(resolve => setTimeout(resolve, 50))
    watcher.close()
    assert.equal(missing, false)
    assert.equal(readFileSync(file, 'utf8'), 'new')
    assert.deepEqual(readdirSync(dir), ['index.js'])
  })
})

describe('removeUnlisted', () => {
  it('removes files not written by this run', () => {
    const dir = mkdtempSync(path.join(tmpdir(), 'wic-'))
    writeFileSync(path.join(dir, 'keep.js'), '')
    writeFileSync(path.join(dir, 'compiled-layout-de.js'), '')
    writeFileSync(path.join(dir, 'index.js.tmp'), '')
    removeUnlisted(dir, new Set(['keep.js']))
    assert.deepEqual(readdirSync(dir), ['keep.js'])
  })
})
