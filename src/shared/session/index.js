/**
 * @typedef {import('./types.js').SessionStateAuthenticated} SessionStateAuthenticated
 * @typedef {import('./state/index.js').SessionState} SessionState
 */

import { ValidationError } from '../../types/validation.js'

export class UnauthenticatedError extends Error {
  /** @type {number} */
  status

  /** @param {string} [message] */
  constructor (message) {
    super(message ?? 'missing authentication')
    this.name = 'UnauthenticatedError'
    this.status = 401
  }
}

export class PermissionError extends Error {
  /** @type {number} */
  status

  /** @param {string} [message] */
  constructor (message) {
    super(message ?? 'missing permission')
    this.name = 'PermissionError'
    this.status = 403
  }
}

/** @type {(sessionState: SessionState) => sessionState is SessionStateAuthenticated} */
export const isAuthenticated = (sessionState) => {
  return !!sessionState.user
}

// eslint-disable-next-line jsdoc/valid-types
/** @type {(sessionState: SessionState) => asserts sessionState is SessionStateAuthenticated} */
export const assertAuthenticated = (sessionState) => {
  if (!isAuthenticated(sessionState)) throw new UnauthenticatedError()
}

// eslint-disable-next-line jsdoc/valid-types
/** @type {(sessionState: SessionState) => asserts sessionState is SessionStateAuthenticated} */
export const assertAdminMode = (sessionState) => {
  assertAuthenticated(sessionState)
  // TODO: use sessionState.locale to internationalize error message
  if (!sessionState.user.adminMode) throw new PermissionError('super admin only')
}

/**
 * @param {import('../account/types.js').AccountKeys} userAccount
 * @param {import('../account/types.js').AccountKeys} resourceAccount
 * @returns {boolean}
 */
const matchAccount = (userAccount, resourceAccount) => {
  if (userAccount.type !== resourceAccount.type) return false
  if (userAccount.id !== resourceAccount.id) return false
  if (userAccount.department && userAccount.department !== resourceAccount.department) return false
  return true
}

/**
 * @param {import('./state/types.js').SessionState} sessionState
 * @param {import('../account/types.js').AccountKeys} account
 * @param {boolean} [onlyActiveAccount]
 * @returns {string | null}
 */
export const getAccountRole = (sessionState, account, onlyActiveAccount = true) => {
  if (!isAuthenticated(sessionState)) return null
  if (sessionState.user.adminMode) return 'admin'
  if (onlyActiveAccount) {
    if (matchAccount(sessionState.account, account)) return sessionState.accountRole
  } else {
    if (account.type === 'user' && sessionState.user.id === account.id) return 'admin'
    for (const org of sessionState.user.organizations) {
      if (matchAccount({ type: 'organization', id: org.id, department: org.department }, account)) return org.role
    }
  }
  return null
}

/**
 * @param {import('./state/types.js').SessionState} sessionState
 * @param {import('../account/types.js').AccountKeys} account
 * @param {string} role
 * @param {boolean} [onlyActiveAccount]
 */
export const assertAccountRole = (sessionState, account, role, onlyActiveAccount = true) => {
  const accountRole = getAccountRole(sessionState, account, onlyActiveAccount)
  if (accountRole !== role) throw new PermissionError(`requires ${role} role`)
}

/** @type {(type: string) => type is "user" | "organization"} */
export const isValidAccountType = (type) => {
  return ['user', 'organization'].includes(type)
}

// eslint-disable-next-line jsdoc/valid-types
/** @type {(type: string) => asserts type is "user" | "organization"} */
export const assertValidAccountType = (type) => {
  if (!isValidAccountType(type)) throw new ValidationError('invalid account type')
}
