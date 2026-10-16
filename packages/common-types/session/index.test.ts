import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { scopeRegexp, parseScope, scopeCovers, hasScope, assertScope } from './index.js'

describe('scope helpers', () => {
  it('accepts resource:class and bare resource names only', () => {
    for (const s of ['datasets', 'datasets:read', 'datasets:readAdvanced', 'remote-services:admin']) {
      assert.ok(scopeRegexp.test(s), s)
    }
    for (const s of ['Datasets:read', 'datasets:', ':read', 'datasets:read:more', 'a b', '', 'datasets:*']) {
      assert.ok(!scopeRegexp.test(s), s)
    }
  })

  it('parses a space-delimited claim', () => {
    assert.equal(parseScope(undefined), undefined)
    assert.deepEqual(parseScope(''), [])
    assert.deepEqual(parseScope('datasets:read  organizations:read'), ['datasets:read', 'organizations:read'])
  })

  it('matches exactly or through the bare resource umbrella, never by prefix', () => {
    assert.ok(scopeCovers(['datasets:read'], 'datasets:read'))
    assert.ok(scopeCovers(['datasets'], 'datasets:readAdvanced'))
    assert.ok(!scopeCovers(['datasets:read'], 'datasets:readAdvanced'))
    assert.ok(!scopeCovers(['datasets:read'], 'datasets'))
    assert.ok(!scopeCovers(['data'], 'datasets:read'))
  })

  it('treats a session without scopes as unrestricted', () => {
    assert.ok(hasScope({ lang: 'fr' }, 'datasets:admin'))
    assert.ok(!hasScope({ lang: 'fr', scopes: [] }, 'datasets:read'))
    assert.ok(hasScope({ lang: 'fr', scopes: ['datasets:write'] }, ['datasets:read', 'datasets:write']))
  })

  it('assertScope throws a 403 naming the accepted scopes', () => {
    assert.throws(() => assertScope({ lang: 'fr', scopes: ['organizations:read'] }, ['datasets:read', 'datasets']),
      (err: any) => err.status === 403 && err.message.includes('datasets:read datasets'))
    assertScope({ lang: 'fr', scopes: ['datasets'] }, 'datasets:read')
  })
})
