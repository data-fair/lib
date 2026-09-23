import { test } from 'node:test'
import assert from 'node:assert/strict'
import eventSchema from './schema.js'

test('event schema declares delivery channels', () => {
  const channels = eventSchema.properties.channels
  assert.equal(channels.type, 'array')
  assert.deepEqual(channels.items.enum, ['events', 'notifications', 'webhooks'])
  assert.equal(channels.uniqueItems, true)
})

test('event schema declares webhook coalescing', () => {
  assert.equal(eventSchema.properties.coalesce.type, 'boolean')
})
