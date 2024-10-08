import type { AccountKeys } from '../account/index.js'
import { type SessionState } from './.type/index.js'
import { httpError } from '@data-fair/lib-utils/http-errors.js'

export type SessionStateAuthenticated = SessionState & Required<Pick<SessionState, 'user' | 'account' | 'accountRole'>>

export * from './.type/index.js'

export function isAuthenticated (sessionState: SessionState): sessionState is SessionStateAuthenticated {
  return !!sessionState.user
}

export function assertAuthenticated (sessionState: SessionState): asserts sessionState is SessionStateAuthenticated {
  if (!isAuthenticated(sessionState)) throw httpError(401)
}

export function assertAdminMode (sessionState: SessionState): asserts sessionState is SessionStateAuthenticated {
  assertAuthenticated(sessionState)
  // TODO: use sessionState.locale to internationalize error message
  if (!sessionState.user.adminMode) throw httpError(403, 'super admin only')
}

function matchAccount (userAccount: AccountKeys, resourceAccount: AccountKeys): boolean {
  if (userAccount.type !== resourceAccount.type) return false
  if (userAccount.id !== resourceAccount.id) return false
  if (userAccount.department && userAccount.department !== resourceAccount.department) return false
  return true
}

export function getAccountRole (sessionState: SessionState, account: AccountKeys, onlyActiveAccount = true): string | null {
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

export function assertAccountRole (sessionState: SessionState, account: AccountKeys, role: string, onlyActiveAccount = true) {
  const accountRole = getAccountRole(sessionState, account, onlyActiveAccount)
  if (accountRole !== role) throw httpError(403, `requires ${role} role`)
}

export function isValidAccountType (type: string): type is 'user' | 'organization' {
  return ['user', 'organization'].includes(type)
}

export function assertValidAccountType (type: string): asserts type is 'user' | 'organization' {
  if (!isValidAccountType(type)) throw httpError(400, 'invalid account type')
}
