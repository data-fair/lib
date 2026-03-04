import type { AxiosInstance } from 'axios'
import type { DataFairWsClient } from '@data-fair/lib-node/ws-client.js'

/**
 * Function to prepare a processing (trigger when the config is updated).
 * It can be used to:
 * - throw additional errors to validate the config
 * - remove secrets from the config and store them in the secrets object
 */
export type PrepareFunction<TProcessingConfig = any> = (
  context: {
    processingConfig: TProcessingConfig
    secrets: Record<string, string>
  }
) => Promise<{
  processingConfig?: TProcessingConfig,
  secrets?: Record<string, string>
}>

/**
 * Function to execute the processing (triggered when the processing is started).
 * This is the main function of the plugin where the business logic is implemented.
 *
 * @returns An object with a optional deleteOnComplete property to indicate that the last run should be deleted after completion.
 */
export type RunFunction<TProcessingConfig = any, TPluginConfig = any> = (
  context: ProcessingContext<TProcessingConfig, TPluginConfig>
) => Promise<void | { deleteOnComplete?: boolean }>

/**
 * Processing context.
 */
export interface ProcessingContext<TProcessingConfig = any, TPluginConfig = any> {
  processingConfig: TProcessingConfig
  pluginConfig: TPluginConfig
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
