import type { AxiosInstance } from 'axios'
import type { DataFairWsClient } from '@data-fair/lib-node/ws-client.js'

/**
 * Processing context.
 */
export interface ProcessingContext<TProcesssingConfig = any> {
  processingConfig: TProcesssingConfig
  pluginConfig: any
  secrets?: Record<string, string>
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
 * Function to prepare a processing (trigger when the config is updated).
 * It can be used to:
 * - throw additional errors to validate the config
 * - remove secrets from the config and store them in the secrets object
 */
export type PrepareFunction<TProcesssingConfig = any> = (
  context: {
    processingConfig: TProcesssingConfig
    secrets: Record<string, string>
  }
) => Promise<{
  processingConfig?: TProcesssingConfig,
  secrets?: Record<string, string>
}>

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
  testInfo?: (msg: any, extra?: any) => void
  testDebug?: (msg: any, extra?: any) => void
}
