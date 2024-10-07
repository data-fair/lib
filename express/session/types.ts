import { type IncomingMessage } from 'node:http'
import { type SessionState } from '../../shared/session/index.js'
import { type Request } from 'express'

export type ReqSession = Request & { session?: SessionState }

export type IncomingMessageSession = IncomingMessage & { session?: SessionState }
