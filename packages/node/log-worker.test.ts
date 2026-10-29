import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { Worker } from 'node:worker_threads'
import { getLogContext, withLogContext } from './log.js'

describe('log context in worker threads', () => {
  it('is propagated through the task payload', async () => {
    const line = await withLogContext({ datasetId: 'w1' }, () => new Promise<string>((resolve, reject) => {
      const worker = new Worker(new URL('./test-fixtures/log-worker.js', import.meta.url), { workerData: { logContext: getLogContext() } })
      worker.once('message', resolve)
      worker.once('error', reject)
    }))
    assert.equal(JSON.parse(line).datasetId, 'w1')
    assert.equal(JSON.parse(line).msg, 'in worker')
  })
})
