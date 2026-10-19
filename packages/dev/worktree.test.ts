import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

const script = (name: string) => path.join(import.meta.dirname, name)
// git and the scripts must only see the throwaway repositories: a git hook (pre-push runs the tests)
// exports GIT_DIR and friends, which would point every command below at the real repository
const isolatedEnv = {
  ...Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_'))),
  GIT_AUTHOR_NAME: 't',
  GIT_AUTHOR_EMAIL: 't@t',
  GIT_COMMITTER_NAME: 't',
  GIT_COMMITTER_EMAIL: 't@t',
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_CEILING_DIRECTORIES: tmpdir()
}
const run = (name: string, args: string[], cwd = mkdtempSync(path.join(tmpdir(), 'wt-'))) => spawnSync('bash', [script(name), ...args], { cwd, encoding: 'utf8', env: isolatedEnv })

const git = (cwd: string, ...args: string[]) => {
  const res = spawnSync('git', args, { cwd, encoding: 'utf8', env: isolatedEnv })
  assert.equal(res.status, 0, `git ${args.join(' ')}: ${res.stderr}`)
  return res.stdout.trim()
}
// a main checkout <tmp>/<repo> cloned from a bare origin, on master with one commit
const checkout = (repo = 'portals') => {
  const tmp = mkdtempSync(path.join(tmpdir(), 'wt-repo-'))
  git(tmp, 'init', '-q', '--bare', '-b', 'master', 'origin.git')
  git(tmp, 'clone', '-q', path.join(tmp, 'origin.git'), repo)
  const root = path.join(tmp, repo)
  // never commit anywhere but in the throwaway clone
  assert.equal(git(root, 'rev-parse', '--show-toplevel'), realpathSync(root))
  writeFileSync(path.join(root, 'README.md'), 'x\n')
  git(root, 'add', '.')
  git(root, 'commit', '-q', '-m', 'init')
  git(root, 'push', '-q', 'origin', 'master')
  return { tmp, root }
}

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

  it('worktree.sh refuses a branch that makes the zellij session name too long for this repository', () => {
    const { root } = checkout('simple-directory')
    const res = run('worktree.sh', ['a'.repeat(50)], root)
    assert.equal(res.status, 1)
    assert.match(res.stderr, /zellij session .* must fit in 60 characters, so at most 43 characters/)
  })

  for (const name of ['worktree.sh', 'worktree-delete.sh']) {
    it(`${name} refuses to run from a subfolder of the repository`, () => {
      const { root } = checkout()
      mkdirSync(path.join(root, 'api'))
      const res = run(name, ['feat-x'], path.join(root, 'api'))
      assert.equal(res.status, 1)
      assert.match(res.stderr, /from the root of the repository/)
    })

    it(`${name} refuses to run from a linked worktree`, () => {
      const { tmp, root } = checkout()
      git(root, 'worktree', 'add', '-q', '-b', 'feat-a', path.join(tmp, 'portals_feat-a'))
      const res = run(name, ['feat-x'], path.join(tmp, 'portals_feat-a'))
      assert.equal(res.status, 1)
      assert.match(res.stderr, /from the main checkout, not from a worktree/)
    })
  }

  it('worktree.sh puts the local changes back when the setup fails after stashing them', () => {
    const { tmp, root } = checkout()
    git(root, 'checkout', '-q', '-b', 'feat-x')
    writeFileSync(path.join(root, 'README.md'), 'work in progress\n')
    writeFileSync(path.join(root, 'notes.txt'), 'untracked\n')
    // master is checked out by another worktree: switching the main checkout back to it fails
    git(root, 'worktree', 'add', '-q', path.join(tmp, 'portals_other'), 'master')
    const res = run('worktree.sh', ['feat-x'], root)
    assert.notEqual(res.status, 0)
    assert.match(res.stderr, /your local changes are back in/)
    assert.equal(git(root, 'branch', '--show-current'), 'feat-x')
    assert.equal(readFileSync(path.join(root, 'README.md'), 'utf8'), 'work in progress\n')
    assert.equal(readFileSync(path.join(root, 'notes.txt'), 'utf8'), 'untracked\n')
    assert.equal(git(root, 'stash', 'list'), '')
  })
})
