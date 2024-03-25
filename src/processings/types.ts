import type { AxiosInstance } from 'axios'
import type { DataFairWsClient } from '../node/ws.js'

/**
 * Processing context.
 */
export interface ProcessingContext {
  processingConfig: any
  pluginConfig: any
  processingId: string
  dir: string
  tmpDir: string
  log: LogFunctions
  axios: AxiosInstance
  ws: DataFairWsClient
  sendMail: (mail: string) => Promise<void>
  patchConfig: (patch: { datasetMode: string, dataset: any }) => Promise<void>
}

/**
 * Log functions.
 */
export interface LogFunctions {
  step: (msg: string) => Promise<void>
  error: (msg: string, extra?: any) => Promise<void>
  warning: (msg: string, extra?: any) => Promise<void>
  info: (msg: string, extra?: any) => Promise<void>
  debug: (msg: string, extra?: any) => Promise<void>
  task: (name: string) => Promise<void>
  progress: (taskName: string, progress: number, total: number) => Promise<void>
  testInfo: (msg: any, extra?: any) => void
  testDebug: (msg: any, extra?: any) => void
}
