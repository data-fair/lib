import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { createPrefixRegexp } from './site.js'

describe('site management util function', () => {
  it('manage site path stripping', async () => {
    assert.ok(!'/other-service'.match(createPrefixRegexp('service')))
    assert.ok(!'/service-other'.match(createPrefixRegexp('service')))
    assert.equal('/service'.match(createPrefixRegexp('service'))?.[1], '')
    assert.equal('/service/'.match(createPrefixRegexp('service'))?.[1], '')
    assert.equal('/site/service'.match(createPrefixRegexp('service'))?.[1], '/site')
    assert.equal('/site/service/api'.match(createPrefixRegexp('service'))?.[1], '/site')
  })
})
