import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { spawnSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const script = (name: string) => path.join(import.meta.dirname, name)
const run = (name: string, args: string[]) => spawnSync('bash', [script(name), ...args], { cwd: mkdtempSync(path.join(tmpdir(), 'wt-')), encoding: 'utf8' })

describe('worktree scripts', () => {
  for (const name of ['worktree.sh', 'worktree-delete.sh']) {
    it(`${name} rejects a branch name with a slash`, () => {
      const res = run(name, ['feat/x'])
      assert.equal(res.status, 1)
      assert.match(res.stderr, /invalid branch name "feat\/x".*no "\/"/)
    })

    it(`${name} rejects a branch name longer than 60 characters`, () => {
      const res = run(name, ['a'.repeat(61)])
      assert.equal(res.status, 1)
      assert.match(res.stderr, /invalid branch name/)
    })
  }
})
