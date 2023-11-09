import { type SessionState } from './state/types.js'

export type SessionStateAuthenticated = SessionState & Required<Pick<SessionState, 'user' | 'account' | 'accountRole'>>
