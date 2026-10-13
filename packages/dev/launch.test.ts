import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { launchPlan } from './launch.js'

describe('launchPlan', () => {
  it('creates a missing session with the layout', () => {
    assert.deepEqual(launchPlan('absent', 'portals', []), { deleteFirst: false, args: ['--session', 'portals', '--new-session-with-layout', '.zellij.kdl'] })
  })

  it('deletes an EXITED session before creating it again', () => {
    assert.equal(launchPlan('exited', 'portals', []).deleteFirst, true)
  })

  it('attaches to a running session and never kills it', () => {
    const plan = launchPlan('running', 'portals', [])
    assert.deepEqual(plan, { deleteFirst: false, args: ['attach', 'portals'] })
  })

  it('warns that --services is ignored when attaching to a running session', () => {
    assert.match(launchPlan('running', 'portals', ['agents']).warning ?? '', /df-dev up agents/)
  })
})
