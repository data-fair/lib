import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { defineScopes, globalScopes, oauth2SecurityScheme } from './scopes.js'
import { hasScope, scopeCovers } from './session/index.js'

const l = (fr: string, en: string) => ({ fr, en })

const vocabulary = defineScopes({
  notifications: {
    tiers: ['read', 'write'],
    descriptions: { umbrella: l('Tout sur les notifications', 'All notifications'), read: l('Lire', 'Read'), write: l('Écrire', 'Write') }
  },
  webhooks: {
    tiers: ['read', 'admin'],
    descriptions: { umbrella: l('Tout sur les webhooks', 'All webhooks'), read: l('Lire', 'Read'), admin: l('Gérer', 'Manage') }
  },
  events: {
    tiers: ['read'],
    descriptions: { umbrella: l('Tout sur les événements', 'All events'), read: l('Lire', 'Read') }
  }
})

describe('scope vocabulary', () => {
  it('lists the declared tiers at or above the tier, the umbrella, then the global tier scopes', () => {
    assert.deepEqual(vocabulary.acceptedScopes('notifications', 'read'), ['notifications:read', 'notifications:write', 'notifications', 'all:read', 'all:write', 'all:admin'])
    assert.deepEqual(vocabulary.acceptedScopes('notifications', 'write'), ['notifications:write', 'notifications', 'all:write', 'all:admin'])
    assert.deepEqual(vocabulary.acceptedScopes('webhooks', 'read'), ['webhooks:read', 'webhooks:admin', 'webhooks', 'all:read', 'all:write', 'all:admin'])
    assert.deepEqual(vocabulary.acceptedScopes('webhooks', 'admin'), ['webhooks:admin', 'webhooks', 'all:admin'])
    assert.deepEqual(vocabulary.acceptedScopes('events', 'read'), ['events:read', 'events', 'all:read', 'all:write', 'all:admin'])
  })

  it('refuses a tier the family does not declare', () => {
    assert.throws(() => vocabulary.acceptedScopes('webhooks', 'write'), /webhooks has no write tier/)
  })

  it('lists every scope that reaches a family, for a coarse gate', () => {
    assert.deepEqual(vocabulary.familyScopes('webhooks'), ['webhooks', 'webhooks:read', 'webhooks:admin', 'all:read', 'all:write', 'all:admin'])
  })

  it('a global tier scope does not reach a higher tier', () => {
    const state = (scopes: string[]) => ({ lang: 'fr', scopes })
    assert.ok(hasScope(state(['all:write']), vocabulary.acceptedScopes('notifications', 'write')))
    assert.ok(!hasScope(state(['all:write']), vocabulary.acceptedScopes('webhooks', 'admin')))
    assert.ok(hasScope(state(['all:admin']), vocabulary.acceptedScopes('webhooks', 'admin')))
    // the bare "all" name is the umbrella of the global tier scopes, as for any resource
    assert.ok(scopeCovers(['all'], 'all:admin'))
  })

  it('describes the family scopes and the global tier scopes in both locales', () => {
    const fr = vocabulary.scopeDescriptions('fr')
    assert.deepEqual(Object.keys(fr), [
      'notifications', 'notifications:read', 'notifications:write',
      'webhooks', 'webhooks:read', 'webhooks:admin',
      'events', 'events:read',
      'all:read', 'all:write', 'all:admin'
    ])
    assert.equal(fr['webhooks:admin'], 'Gérer')
    assert.equal(fr['all:read'], globalScopes['all:read'].fr)
    assert.equal(vocabulary.scopeDescriptions('en')['all:read'], globalScopes['all:read'].en)
  })

  it('lists what each global tier scope includes, lower tiers included', () => {
    assert.deepEqual(vocabulary.scopeIncludes, {
      'all:read': ['notifications:read', 'webhooks:read', 'events:read'],
      'all:write': ['notifications:read', 'webhooks:read', 'events:read', 'notifications:write'],
      'all:admin': ['notifications:read', 'webhooks:read', 'events:read', 'notifications:write', 'webhooks:admin']
    })
  })

  it('refuses a declared tier without description and an invalid family name', () => {
    assert.throws(() => defineScopes({ webhooks: { tiers: ['read', 'admin'], descriptions: { umbrella: l('a', 'a'), read: l('b', 'b') } } }), /webhooks:admin has no description/)
    assert.throws(() => defineScopes({ Webhooks: { tiers: ['read'], descriptions: { umbrella: l('a', 'a'), read: l('b', 'b') } } }), /invalid scope family/)
    assert.throws(() => defineScopes({ all: { tiers: ['read'], descriptions: { umbrella: l('a', 'a'), read: l('b', 'b') } } }), /reserved/)
  })
})

describe('oauth2 security scheme', () => {
  it('points to the token exchange of simple-directory and declares the vocabulary', () => {
    const scheme = oauth2SecurityScheme(vocabulary, { directoryUrl: 'http://localhost/simple-directory', locale: 'en' })
    assert.equal(scheme.type, 'oauth2')
    assert.equal(scheme.flows.clientCredentials.tokenUrl, 'http://localhost/simple-directory/api/auth/nhi-token')
    assert.deepEqual(scheme.flows.clientCredentials.scopes, vocabulary.scopeDescriptions('en'))
    assert.deepEqual(scheme['x-scopeIncludes'], vocabulary.scopeIncludes)
    assert.match(scheme.description, /without a scope claim/)
    assert.match(oauth2SecurityScheme(vocabulary, { directoryUrl: 'http://x', locale: 'fr' }).description, /sans claim de scope/)
  })
})
