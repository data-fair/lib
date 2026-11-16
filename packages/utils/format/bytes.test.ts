import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { formatBytes } from '@data-fair/lib-utils/format/bytes.js'

describe('formatBytes', () => {
  it('writes French units by default', () => {
    assert.equal(formatBytes(1500), (1.5).toLocaleString('fr') + ' ko')
  })
  it('writes SI units in English', () => {
    assert.equal(formatBytes(1500, 'en'), '1.5 kB')
    assert.equal(formatBytes(25 * 1000 * 1000, 'en'), '25 MB')
  })
})
