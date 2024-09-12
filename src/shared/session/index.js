/**
 * @typedef {import('./types.js').SessionStateAuthenticated} SessionStateAuthenticated
 * @typedef {import('./.type/index.js').SessionState} SessionState
 */

import { httpError } from '@data-fair/lib/http-errors.js'

export * from './.type/index.js'

/** @type {(sessionState: SessionState) => sessionState is SessionStateAuthenticated} */
export const isAuthenticated = (sessionState) => {
  return !!sessionState.user
}

/** @type {(sessionState: SessionState) => asserts sessionState is SessionStateAuthenticated} */
export const assertAuthenticated = (sessionState) => {
  if (!isAuthenticated(sessionState)) throw httpError(401)
}

/** @type {(sessionState: SessionState) => asserts sessionState is SessionStateAuthenticated} */
export const assertAdminMode = (sessionState) => {
  assertAuthenticated(sessionState)
  // TODO: use sessionState.locale to internationalize error message
  if (!sessionState.user.adminMode) throw httpError(403, 'super admin only')
}

/**
 * @param {import('../account/index.js').AccountKeys} userAccount
 * @param {import('../account/index.js').AccountKeys} resourceAccount
 * @returns {boolean}
 */
const matchAccount = (userAccount, resourceAccount) => {
  if (userAccount.type !== resourceAccount.type) return false
  if (userAccount.id !== resourceAccount.id) return false
  if (userAccount.department && userAccount.department !== resourceAccount.department) return false
  return true
}

/**
 * @param {SessionState} sessionState
 * @param {import('../account/index.js').AccountKeys} account
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
 * @param {SessionState} sessionState
 * @param {import('../account/index.js').AccountKeys} account
 * @param {string} role
 * @param {boolean} [onlyActiveAccount]
 */
export const assertAccountRole = (sessionState, account, role, onlyActiveAccount = true) => {
  const accountRole = getAccountRole(sessionState, account, onlyActiveAccount)
  if (accountRole !== role) throw httpError(403, `requires ${role} role`)
}

/** @type {(type: string) => type is "user" | "organization"} */
export const isValidAccountType = (type) => {
  return ['user', 'organization'].includes(type)
}

/** @type {(type: string) => asserts type is "user" | "organization"} */
export const assertValidAccountType = (type) => {
  if (!isValidAccountType(type)) throw httpError(400, 'invalid account type')
}
