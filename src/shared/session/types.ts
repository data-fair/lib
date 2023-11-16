import { type SessionState } from './.type/index.js'

export type SessionStateAuthenticated = SessionState & Required<Pick<SessionState, 'user' | 'account' | 'accountRole'>>
