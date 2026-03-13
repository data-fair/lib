import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { SessionHandler } from './session.js'

describe('SessionHandler.readStateFromCookie', () => {
  it('should return default session with no cookies', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie(undefined)
    assert.equal(state.lang, 'fr')
    assert.equal(state.user, undefined)
    assert.equal(state.dark, undefined)
  })

  it('should parse dark mode cookie', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie('theme_dark=true')
    assert.equal(state.dark, true)
  })

  it('should parse i18n_lang cookie', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie('i18n_lang=en')
    assert.equal(state.lang, 'en')
  })

  it('should use defaultLang when no i18n_lang cookie', async () => {
    const handler = new SessionHandler()
    handler.defaultLang = 'de'
    const state = await handler.readStateFromCookie('')
    assert.equal(state.lang, 'de')
  })

  it('should return early when no id_token', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie('i18n_lang=en; theme_dark=1')
    assert.equal(state.lang, 'en')
    assert.equal(state.dark, true)
    assert.equal(state.user, undefined)
  })

  it('should return early when no id_token_sign and not onlyDecode', async () => {
    const handler = new SessionHandler()
    const state = await handler.readStateFromCookie('id_token=header.payload')
    assert.equal(state.user, undefined)
  })
})
