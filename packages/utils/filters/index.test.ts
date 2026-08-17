import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { filter2params, filters2params, filter2qs, filters2qs } from '@data-fair/lib-utils/filters/index.js'

const field = { key: 'foo', label: 'Foo' }

describe('filter2params', () => {
  it('maps "in" to _in with comma-separated values', () => {
    assert.deepEqual(filter2params({ type: 'in', field, values: ['a', 'b'] }), { foo_in: 'a,b' })
  })

  it('maps "out" to _nin with comma-separated values', () => {
    assert.deepEqual(filter2params({ type: 'out', field, values: ['a', 'b'] }), { foo_nin: 'a,b' })
  })

  it('maps "interval" to _gte/_lte when both bounds are set', () => {
    assert.deepEqual(filter2params({ type: 'interval', field, minValue: '0', maxValue: '10' }), { foo_gte: '0', foo_lte: '10' })
  })

  it('maps "interval" to _gte only when max is missing', () => {
    assert.deepEqual(filter2params({ type: 'interval', field, minValue: '0' }), { foo_gte: '0' })
  })

  it('maps "interval" to _lte only when min is missing', () => {
    assert.deepEqual(filter2params({ type: 'interval', field, maxValue: '10' }), { foo_lte: '10' })
  })

  it('returns empty params for an interval without bounds', () => {
    assert.deepEqual(filter2params({ type: 'interval', field }), {})
  })

  it('maps "starts" to _starts', () => {
    assert.deepEqual(filter2params({ type: 'starts', field, value: 'foo' }), { foo_starts: 'foo' })
  })

  it('maps "exists" to _exists with a space value (UI convention)', () => {
    assert.deepEqual(filter2params({ type: 'exists', field }), { foo_exists: ' ' })
  })

  it('maps "notExists" to _nexists with a space value (UI convention)', () => {
    assert.deepEqual(filter2params({ type: 'notExists', field }), { foo_nexists: ' ' })
  })

  it('returns null for "in" without values', () => {
    assert.equal(filter2params({ type: 'in', field, values: [] }), null)
  })

  it('returns null for "in" with null values', () => {
    assert.equal(filter2params({ type: 'in', field, values: null as any }), null)
  })

  it('returns null for "starts" with an empty value', () => {
    assert.equal(filter2params({ type: 'starts', field, value: '' }), null)
  })

  it('returns null for a raw string filter', () => {
    assert.equal(filter2params('foo:bar' as any), null)
  })

  it('returns null for an unknown filter type', () => {
    assert.equal(filter2params({ type: 'unknown', field } as any), null)
  })
})

describe('filters2params', () => {
  it('merges multiple filters into one flat object', () => {
    const params = filters2params([
      { type: 'in', field, values: ['a'] },
      { type: 'interval', field: { key: 'bar', label: 'Bar' }, minValue: '1', maxValue: '5' },
      { type: 'exists', field: { key: 'baz', label: 'Baz' } }
    ])
    assert.deepEqual(params, { foo_in: 'a', bar_gte: '1', bar_lte: '5', baz_exists: ' ' })
  })

  it('ignores empty and non-convertible filters', () => {
    const params = filters2params([
      { type: 'in', field, values: [] },
      null as any,
      undefined as any,
      { type: 'out', field: { key: 'bar', label: 'Bar' }, values: ['x'] }
    ])
    assert.deepEqual(params, { bar_nin: 'x' })
  })

  it('returns an empty object when there is no filter', () => {
    assert.deepEqual(filters2params([]), {})
    assert.deepEqual(filters2params(), {})
  })
})

describe('filter2qs (deprecated but kept for backward compatibility)', () => {
  it('maps "exists" to key:*', () => {
    assert.equal(filter2qs({ type: 'exists', field }), 'foo:*')
  })

  it('maps "notExists" to NOT key:*', () => {
    assert.equal(filter2qs({ type: 'notExists', field }), 'NOT foo:*')
  })

  it('still maps "in", "out", "interval" and "starts"', () => {
    assert.equal(filter2qs({ type: 'in', field, values: ['a'] }), 'foo:("a")')
    assert.equal(filter2qs({ type: 'out', field, values: ['a'] }), 'NOT foo:("a")')
    assert.equal(filter2qs({ type: 'interval', field, minValue: '1', maxValue: '5' }), 'foo:[1 TO 5]')
    assert.equal(filter2qs({ type: 'starts', field, value: 'a' }), 'foo:a*')
  })

  it('filters2qs joins filters with AND', () => {
    assert.equal(
      filters2qs([
        { type: 'in', field, values: ['a'] },
        { type: 'exists', field: { key: 'bar', label: 'Bar' } }
      ]),
      '(foo:("a")) AND (bar:*)'
    )
  })
})
