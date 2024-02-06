import type { AxiosInstance } from 'axios'
import type { DataFairWsClient } from '../node/ws.js'

/**
 * Processing context.
 */
export interface ProcessingContext {
  processingConfig: object
  pluginConfig: object
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
  step: (msg: string) => void
  error: (msg: string, extra: any) => void
  warning: (msg: string, extra: any) => void
  info: (msg: string, extra: any) => void
  debug: (msg: string, extra: any) => void
  task: (name: string) => void
  progress: (taskName: string, progress: number, total: number) => void
  testInfo: (msg: any, extra: any) => void
  testDebug: (msg: any, extra: any) => void
}
