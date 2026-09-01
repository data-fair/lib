import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { matchAccessRef, mongoFilterAccessRef } from './index.js'
import type { SessionStateAuthenticated, User } from '../session/index.js'

const humanUser: User = {
  email: 'test@example.com',
  id: 'user1',
  name: 'Test User',
  organizations: [{ id: 'org1', name: 'Test Org', role: 'admin' }]
}

// non-human identity: service account. `email` is required on the User type (NHI tokens carry
// a synthetic non-deliverable email), so cast to represent the emailless runtime shape this
// guard defends against — an access ref must never match a session whose email is absent.
const nhiUser = {
  nhi: 1,
  id: 'svc1',
  name: 'Service Account',
  organizations: [{ id: 'org1', name: 'Test Org', role: 'admin' }]
} as unknown as User

const session = (user: User): SessionStateAuthenticated => ({
  user,
  lang: 'fr',
  account: { type: 'user', id: user.id, name: user.name },
  accountRole: 'admin'
})

describe('access ref matching', () => {
  it('should match a user by email', () => {
    assert.ok(matchAccessRef(session(humanUser), { type: 'user', email: 'test@example.com' } as any))
  })

  it('should not match an email access ref when the identity has no email', () => {
    assert.ok(!matchAccessRef(session(nhiUser), { type: 'user', email: 'test@example.com' } as any))
  })

  it('should not match an access ref whose email is absent', () => {
    assert.ok(!matchAccessRef(session(nhiUser), { type: 'user', email: undefined } as any))
  })
})

describe('access ref mongo filter', () => {
  it('should filter on both id and email for a human user', () => {
    const filter = mongoFilterAccessRef(session(humanUser))
    assert.deepEqual(filter.$or, [
      { 'access.type': 'user', 'access.id': 'user1' },
      { 'access.type': 'user', 'access.email': 'test@example.com' }
    ])
  })

  it('should not emit an unconstrained user branch when the identity has no email', () => {
    const filter = mongoFilterAccessRef(session(nhiUser))
    // an { 'access.type': 'user' } branch carrying an undefined email is dropped by the
    // mongo driver (ignoreUndefined: true) and would then match every user permission
    for (const branch of filter.$or) {
      assert.ok(
        !('access.email' in branch) || branch['access.email'] !== undefined,
        `branch would match all user permissions: ${JSON.stringify(branch)}`
      )
    }
    assert.deepEqual(filter.$or, [{ 'access.type': 'user', 'access.id': 'svc1' }])
  })
})
