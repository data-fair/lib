import { type SessionState } from '../types/session-state/types.js'

// cf https://blog.logrocket.com/extend-express-request-object-typescript/
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    export interface Request {
      session: SessionState
    }
  }
}

export interface SessionOptions {
  directoryUrl?: string
}
