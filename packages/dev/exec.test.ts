import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { realExec } from './exec.js'

describe('realExec', () => {
  it('reads outputs larger than 1 MiB (a full pane scrollback)', () => {
    const out = realExec('node', ['-e', "process.stdout.write('x'.repeat(3 * 1024 * 1024))"])
    assert.equal(out.length, 3 * 1024 * 1024)
  })
})
