import { type SessionState, type Account } from './.type/index.js'
import { httpError } from '@data-fair/lib-utils/http-errors.js'

// same as account, but only the parts necessary in filters, etc
export type AccountKeys = Pick<Account, 'type' | 'id' | 'department'>

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

function matchAccount (userAccount: AccountKeys, resourceAccount: AccountKeys, acceptDepAsRoot = false): boolean {
  if (userAccount.type !== resourceAccount.type) return false
  if (userAccount.id !== resourceAccount.id) return false
  if (!acceptDepAsRoot) {
    if (userAccount.department && userAccount.department !== resourceAccount.department) return false
  }
  return true
}

type AssertRoleOptions = {
  allAccounts?: boolean,
  acceptDepAsRoot?: boolean
}

export function getAccountRole (sessionState: SessionState, account: AccountKeys, options: AssertRoleOptions = {}): string | null {
  if (!isAuthenticated(sessionState)) return null
  if (sessionState.user.adminMode) return 'admin'
  if (options.allAccounts) {
    if (account.type === 'user' && sessionState.user.id === account.id) return 'admin'
    for (const org of sessionState.user.organizations) {
      if (matchAccount({ type: 'organization', id: org.id, department: org.department }, account, options.acceptDepAsRoot)) return org.role
    }
  } else {
    if (matchAccount(sessionState.account, account, options.acceptDepAsRoot)) return sessionState.accountRole
  }
  return null
}

export function assertAccountRole (sessionState: SessionState, account: AccountKeys, roles: string | string[], options: AssertRoleOptions = {}) {
  if (typeof roles === 'string') roles = [roles]
  const accountRole = getAccountRole(sessionState, account, options)
  if (!accountRole || !roles.includes(accountRole)) throw httpError(403, `requires ${roles.join(', ')} role(s)`)
}

export function isValidAccountType (type: string): type is 'user' | 'organization' {
  return ['user', 'organization'].includes(type)
}

export function assertValidAccountType (type: string): asserts type is 'user' | 'organization' {
  if (!isValidAccountType(type)) throw httpError(400, 'invalid account type')
}
