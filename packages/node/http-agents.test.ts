import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

describe('http agents', () => {
  it('should not keep a process alive just by being imported', async () => {
    const modulePath = fileURLToPath(new URL('./http-agents.ts', import.meta.url))
    try {
      await execFileAsync(
        process.execPath,
        ['--experimental-strip-types', '--input-type=module', '--eval', `import ${JSON.stringify(modulePath)}`],
        { timeout: 10000 }
      )
    } catch (err) {
      assert.fail(`importing http-agents did not exit on its own (${(err as Error).message}), a module level timer is probably missing an unref()`)
    }
  })
})
