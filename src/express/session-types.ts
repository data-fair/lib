import { type SessionState } from '../types/session-state/types.js'
import { type Request } from 'express'

export type ReqSession = Request & { session?: SessionState }

export type SessionStateWithAuth = SessionState & Required<Pick<SessionState, 'user' | 'account' | 'accountRole'>>
