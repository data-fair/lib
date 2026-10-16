import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  parseSelectionValues,
  findTargetFilters,
  targetExcludeKeys
} from './selection.js'

describe('parseSelectionValues', () => {
  it('splits the supported formats', () => {
    assert.deepStrictEqual(parseSelectionValues('86222'), ['86222'])
    assert.deepStrictEqual(parseSelectionValues('A,B'), ['A', 'B'])
    assert.deepStrictEqual(parseSelectionValues('"A","B"'), ['A', 'B'])
    assert.deepStrictEqual(parseSelectionValues('["A","B"]'), ['A', 'B'])
  })
})

describe('findTargetFilters', () => {
  it('reads a concept key targeting the declared concept', () => {
    const filters = findTargetFilters(
      { _c_codeCommune_in: '86222' },
      { conceptId: 'codeCommune' }
    )
    assert.deepStrictEqual(filters, [{
      filterKey: '_c_codeCommune_in',
      baseKey: '_c_codeCommune',
      operator: 'in',
      conceptId: 'codeCommune',
      value: '86222'
    }])
  })

  it('ignores a concept the visualization does not declare', () => {
    assert.deepStrictEqual(findTargetFilters({ _c_codeCommune_in: '86222' }, { conceptId: 'codeDepartement' }), [])
  })

  it('reads a range sharing the declared field', () => {
    const filters = findTargetFilters(
      { _d_ds1_annee_gte: '2020', _d_ds1_annee_lte: '2022', _d_ds1_ville_eq: 'Lyon' },
      { datasetId: 'ds1', fieldKey: 'annee' }
    )
    assert.deepStrictEqual(filters.map((f) => f.operator), ['gte', 'lte'])
  })

  it('reads another dataset field only if it is declared', () => {
    const params = { _d_ds1_categorie_eq: 'A' }
    assert.strictEqual(findTargetFilters(params, { datasetId: 'ds1', fieldKey: 'categorie' }).length, 1)
    assert.strictEqual(findTargetFilters(params, { datasetId: 'ds2', fieldKey: 'categorie' }).length, 0)
    assert.strictEqual(findTargetFilters(params, { datasetId: 'ds1', fieldKey: 'ville' }).length, 0)
  })

  it('accepts several declared fields (multilayer map)', () => {
    const params = { _d_ds1_annee_eq: '2020', _c_codeCommune_in: '86222', _d_ds1_ville_eq: 'Lyon' }
    const filters = findTargetFilters(params, [
      { datasetId: 'ds1', fieldKey: 'annee' },
      { conceptId: 'codeCommune' }
    ])
    assert.deepStrictEqual(filters.map((f) => f.filterKey), ['_d_ds1_annee_eq', '_c_codeCommune_in'])
  })
})

describe('targetExcludeKeys', () => {
  it('returns the keys to remove from API requests', () => {
    assert.deepStrictEqual(
      targetExcludeKeys({ _c_codeCommune_in: '86222', _c_q: 'poitiers' }, { conceptId: 'codeCommune' }),
      ['_c_codeCommune_in']
    )
  })
})
