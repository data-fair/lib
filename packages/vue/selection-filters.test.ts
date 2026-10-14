import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  parseSelectionValues,
  findSelectionFilters,
  selectionExcludeKeys,
  selectionMarkerKey,
  selectionMarkerValue
} from './selection-filters.js'
import { getConceptFilters } from './concept-filters.js'

describe('parseSelectionValues', () => {
  it('reads a single value, a bare list, a quoted list and a JSON array', () => {
    assert.deepStrictEqual(parseSelectionValues('86222'), ['86222'])
    assert.deepStrictEqual(parseSelectionValues('A,B'), ['A', 'B'])
    assert.deepStrictEqual(parseSelectionValues('"A","B"'), ['A', 'B'])
    assert.deepStrictEqual(parseSelectionValues('["A","B"]'), ['A', 'B'])
  })
})

describe('findSelectionFilters', () => {
  it('returns a marked concept filter, operator kept', () => {
    const filters = findSelectionFilters({ _c_codeCommune_in: '86222', _s_codeCommune: 'page_x' })
    assert.strictEqual(filters.length, 1)
    assert.deepStrictEqual(filters[0], {
      filterKey: '_c_codeCommune_in',
      baseKey: '_c_codeCommune',
      operator: 'in',
      conceptId: 'codeCommune',
      value: '86222',
      source: 'page_x'
    })
  })

  it('ignores a concept filter with no marker', () => {
    assert.deepStrictEqual(findSelectionFilters({ _c_codeCommune_in: '86222' }), [])
  })

  it('ignores a marker on a concept that is not selectable', () => {
    assert.deepStrictEqual(
      findSelectionFilters({ _c_q: 'poitiers', _s_q: 'page_x', _c_geo_distance: '2,48,1000', _s_geo_distance: 'page_x' }),
      []
    )
  })

  it('ignores a marker with no matching filter', () => {
    assert.deepStrictEqual(findSelectionFilters({ _s_codeCommune: 'page_x' }), [])
  })

  it('returns a marked dataset filter, dataset prefix removed', () => {
    const filters = findSelectionFilters({ _d_ds1_categorie_eq: 'A', _s_ds1_categorie: 'app_table' }, 'ds1')
    assert.strictEqual(filters.length, 1)
    assert.strictEqual(filters[0].fieldKey, 'categorie')
    assert.strictEqual(filters[0].operator, 'eq')
  })

  it('ignores a dataset filter of another dataset', () => {
    assert.deepStrictEqual(
      findSelectionFilters({ _d_ds2_categorie_eq: 'A', _s_ds2_categorie: 'app_table' }, 'ds1'),
      []
    )
  })

  it('returns both bounds of a range sharing one marker', () => {
    const filters = findSelectionFilters({ _d_ds1_annee_gte: '2020', _d_ds1_annee_lte: '2022', _s_ds1_annee: 'app_a' }, 'ds1')
    assert.deepStrictEqual(filters.map((f) => f.operator), ['gte', 'lte'])
  })
})

describe('selectionExcludeKeys', () => {
  it('excludes the marked filter and ignores the marker itself', () => {
    assert.deepStrictEqual(
      selectionExcludeKeys({ _c_codeCommune_in: '86222', _s_codeCommune: 'page_x', _c_q: 'poitiers' }),
      ['_c_codeCommune_in']
    )
  })

  it('keeps a concept filter with no marker', () => {
    assert.deepStrictEqual(selectionExcludeKeys({ _c_codeCommune_in: '86222', _c_q: 'poitiers' }), [])
  })
})

describe('getConceptFilters', () => {
  it('drops marked filters, dataset prefix removed from the others', () => {
    assert.deepStrictEqual(
      getConceptFilters({
        _c_codeCommune_in: '86222',
        _s_codeCommune: 'app_a',
        _d_ds1__id_eq: 'l1',
        _s_ds1__id: 'app_a',
        _d_ds1_categorie_eq: 'A',
        _c_q: 'poitiers'
      }, 'ds1'),
      { categorie_eq: 'A', _c_q: 'poitiers' }
    )
  })
})

describe('selectionMarkerKey', () => {
  it('drops the operator and the concept prefix', () => {
    assert.strictEqual(selectionMarkerKey('_c_codeCommune_in'), '_s_codeCommune')
    assert.strictEqual(selectionMarkerKey('_c_q'), '_s_q')
  })

  it('drops the operator and the dataset prefix, double underscore kept', () => {
    assert.strictEqual(selectionMarkerKey('_d_ds1_categorie_eq'), '_s_ds1_categorie')
    assert.strictEqual(selectionMarkerKey('_d_ds1__id_eq'), '_s_ds1__id')
  })
})

describe('selectionMarkerValue', () => {
  it('prefixes the application id and stays undefined without one', () => {
    assert.strictEqual(selectionMarkerValue('abc123'), 'app_abc123')
    assert.strictEqual(selectionMarkerValue(undefined), undefined)
  })
})
