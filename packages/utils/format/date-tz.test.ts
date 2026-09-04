import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { explicitOffsetMinutes, dateTimeInOwnTimeZone } from '@data-fair/lib-utils/format/date-tz.js'

describe('explicitOffsetMinutes', () => {
  it('reads a positive offset', () => {
    assert.equal(explicitOffsetMinutes('2024-01-15T10:00:00+01:00'), 60)
  })
  it('reads a negative offset', () => {
    assert.equal(explicitOffsetMinutes('2024-01-15T10:00:00-03:00'), -180)
  })
  it('reads an offset without a colon', () => {
    assert.equal(explicitOffsetMinutes('2024-01-15T10:00:00+0530'), 330)
  })
  it('returns null for a UTC-stored value', () => {
    assert.equal(explicitOffsetMinutes('2024-01-15T10:00:00Z'), null)
  })
  it('returns null for an offset-less value', () => {
    assert.equal(explicitOffsetMinutes('2024-01-15T10:00:00'), null)
  })
  it('returns null for a non-string', () => {
    assert.equal(explicitOffsetMinutes(42), null)
  })
})

describe('dateTimeInOwnTimeZone', () => {
  it('renders the value in the timezone it carries, not the runtime one', () => {
    // 10:00+01:00 stays 10:00 whatever TZ the test process runs in
    assert.equal(dateTimeInOwnTimeZone('2024-01-15T10:00:00+01:00').format('HH:mm'), '10:00')
  })
  it('renders a +05:30 value in its own zone', () => {
    assert.equal(dateTimeInOwnTimeZone('2024-06-15T08:45:00+05:30').format('HH:mm'), '08:45')
  })
})
