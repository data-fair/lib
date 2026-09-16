import { describe, it } from 'node:test'
import assert from 'node:assert'
import { formatDepartmentLabel } from './owner.js'

describe('formatDepartmentLabel', () => {
  it('returns undefined without a department', () => {
    assert.strictEqual(formatDepartmentLabel('fr', undefined, undefined), undefined)
    assert.strictEqual(formatDepartmentLabel('fr', '', 'Direction'), undefined)
  })

  it('returns the department name when known', () => {
    assert.strictEqual(formatDepartmentLabel('fr', 'head', 'Direction'), 'Direction')
  })

  it('labels a deleted department with its id, in the requested language', () => {
    assert.strictEqual(formatDepartmentLabel('fr', 'head', undefined), 'Ancien département (head)')
    assert.strictEqual(formatDepartmentLabel('en', 'head', undefined), 'Former department (head)')
  })

  it('falls back on english for an unknown language', () => {
    assert.strictEqual(formatDepartmentLabel('de', 'head'), 'Former department (head)')
  })
})
