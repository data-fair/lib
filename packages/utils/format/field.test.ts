import type { Field } from '@data-fair/lib-common-types/application/index.js'
import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { formatFieldValue } from '@data-fair/lib-utils/format/field.js'

const f = (props: Partial<Field>): Field => ({ key: 'k', type: 'string', ...props } as Field)

describe('formatFieldValue — vide', () => {
  it('renders an empty string for null, undefined and ""', () => {
    assert.equal(formatFieldValue(f({}), null), '')
    assert.equal(formatFieldValue(f({}), undefined), '')
    assert.equal(formatFieldValue(f({}), ''), '')
  })
})

describe('formatFieldValue — x-labels', () => {
  const field = f({ 'x-labels': { A: 'Actif', I: 'Inactif' } })
  it('resolves a coded value', () => {
    assert.equal(formatFieldValue(field, 'A'), 'Actif')
  })
  it('falls back to the raw value when the code is unknown', () => {
    assert.equal(formatFieldValue(field, 'Z'), 'Z')
  })
  it('wins over number formatting', () => {
    const coded = f({ type: 'integer', 'x-labels': { 1000: 'Faible' } })
    assert.equal(formatFieldValue(coded, 1000), 'Faible')
  })
  it('looks the raw value up before the coerced one', () => {
    const padded = f({ type: 'integer', 'x-labels': { '01': 'Janvier' } })
    assert.equal(formatFieldValue(padded, '01'), 'Janvier')
  })
})

describe('formatFieldValue — booleens', () => {
  const field = f({ type: 'boolean' })
  it('renders Oui/Non in French', () => {
    assert.equal(formatFieldValue(field, true), 'Oui')
    assert.equal(formatFieldValue(field, false), 'Non')
  })
  it('renders Yes/No in English', () => {
    assert.equal(formatFieldValue(field, true, { locale: 'en' }), 'Yes')
    assert.equal(formatFieldValue(field, false, { locale: 'en' }), 'No')
  })
  it('coerces the stringified value a values_agg bucket or a URL param hands back', () => {
    assert.equal(formatFieldValue(field, 'true'), 'Oui')
    assert.equal(formatFieldValue(field, 'false'), 'Non')
  })
  it('leaves a string that is neither true nor false alone', () => {
    assert.equal(formatFieldValue(field, 'oui'), 'oui')
  })
})

describe('formatFieldValue — nombres', () => {
  it('groups according to the locale', () => {
    assert.equal(formatFieldValue(f({ type: 'integer' }), 1234), (1234).toLocaleString('fr'))
    assert.equal(formatFieldValue(f({ type: 'integer' }), 1234, { locale: 'en' }), '1,234')
  })
  it('coerces a numeric string coming back from a URL param', () => {
    assert.equal(formatFieldValue(f({ type: 'integer' }), '1234'), (1234).toLocaleString('fr'))
  })
  it('leaves a string-typed column alone — a year with its concept is a string', () => {
    assert.equal(formatFieldValue(f({ type: 'string' }), '2011'), '2011')
  })
})

describe('formatFieldValue — dates', () => {
  it('formats a date from its format, with no concept needed', () => {
    assert.equal(formatFieldValue(f({ format: 'date' }), '2024-01-15'), '15/01/2024')
  })
  it('formats a date-time in the timezone it carries', () => {
    const out = formatFieldValue(f({ format: 'date-time' }), '2024-01-15T10:00:00+01:00')
    assert.match(out, /^15\/01\/2024, 10h00$/)
  })
  it('still formats a column that only carries a date concept', () => {
    const field = f({ 'x-refersTo': 'http://schema.org/Date', format: 'date' })
    assert.equal(formatFieldValue(field, '2024-01-15'), '15/01/2024')
  })
})
