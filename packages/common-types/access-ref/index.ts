import { type AccessRef } from './.type/index.js'
import { type SessionStateAuthenticated } from '../session/index.js'

export * from './.type/index.js'

/**
 * Check if the current session matches an access ref.
 */
export const matchAccessRef = (session: SessionStateAuthenticated, accessRef: AccessRef): boolean => {
  // Check by user, not active account
  if (accessRef.type === 'user') {
    if (accessRef.id) return session.user.id === accessRef.id
    if (accessRef.email) return session.user.email === accessRef.email
    return false
  }

  // Check by active account
  if (accessRef.type === 'organization') {
    if (session.account.type !== 'organization') return false
    if (session.account.id !== accessRef.id) return false

    // Check department: '*' matches all, specific dept must match
    if (
      accessRef.department &&
      accessRef.department !== '*' &&
      session.account.department !== accessRef.department
    ) return false

    // Check roles: empty array matches all, non-empty must include current role
    if (
      accessRef.roles &&
      accessRef.roles.length > 0 &&
      !accessRef.roles.includes(session.accountRole)
    ) return false

    return true
  }

  return false
}

/**
 * Returns conditions to spread into a MongoDB $elemMatch for permissions array.
 *
 * @example
 *   { permissions: { $elemMatch: { ...mongoFilterAccessRef(session), operation: 'read' } } }
 */
export const mongoFilterAccessRef = (session: SessionStateAuthenticated): Record<string, any> => {
  const userFilter: Record<'$or', Record<string, any>[]> = {
    $or: [
      { 'access.type': 'user', 'access.id': session.user.id },
      { 'access.type': 'user', 'access.email': session.user.email }
    ]
  }

  if (session.account.type === 'user') return userFilter

  const baseOrgFilter: Record<string, any> = {
    'access.type': 'organization',
    'access.id': session.account.id,
    $or: [
      { 'access.roles': { $size: 0 } },
      { 'access.roles': { $in: [session.accountRole] } }
    ]
  }
  if (session.account.department) baseOrgFilter['access.department'] = { $in: ['*', session.account.department] }
  else baseOrgFilter['access.department'] = { $in: ['-', '*'] }

  userFilter.$or.push(baseOrgFilter)
  return userFilter
}
