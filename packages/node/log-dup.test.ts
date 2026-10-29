import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { Counter, register } from 'prom-client'

describe('log counters registration', () => {
  it('reuses counters already registered by another copy of the module', async () => {
    // as registered by an older lib-express events-log or a second copy of lib-node
    const existing = new Counter({ name: 'df_events_log', help: 'older copy', labelNames: ['level', 'code', 'host'] })
    const { eventsLogCounter } = await import('./log.js')
    assert.equal(eventsLogCounter, register.getSingleMetric('df_events_log'))
    assert.equal(eventsLogCounter, existing)
  })
})
