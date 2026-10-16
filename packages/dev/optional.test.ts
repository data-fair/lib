import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { absentConfig } from './optional.js'

const optional = {
  events: { privateEventsUrl: null },
  clamav: { clamav: { active: false } },
  agents: { privateAgentsUrl: null, agents: { chat: false } }
}

describe('absentConfig', () => {
  it('merges the overrides of the optional services that are not running', () => {
    assert.deepEqual(absentConfig(optional, ['mongodb', 'es', 'events']), {
      clamav: { active: false },
      privateAgentsUrl: null,
      agents: { chat: false }
    })
  })

  it('is empty when every optional service runs', () => {
    assert.deepEqual(absentConfig(optional, ['events', 'clamav', 'agents']), {})
  })

  it('deep-merges overrides that touch the same object', () => {
    assert.deepEqual(absentConfig({ a: { x: { one: 1 } }, b: { x: { two: 2 } } }, []), { x: { one: 1, two: 2 } })
  })
})
