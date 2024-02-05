/**
 * Processing context.
 */
export interface Context {
  processingConfig: object
  pluginConfig: object
  log: LogFunctions
  axios: AxiosInstance
  ws: WsInstance
  sendMail: (mail: string) => Promise<void>
  patchConfig: (patch: { datasetMode: string, dataset: any }) => Promise<void>
  cleanup: () => Promise<void>
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

/**
 * Axios instance.
 */
export interface AxiosInstance {
  request: (config: any) => Promise<any>
  get: (url: string, config?: any) => Promise<any>
  delete: (url: string, config?: any) => Promise<any>
  head: (url: string, config?: any) => Promise<any>
  post: (url: string, data?: any, config?: any) => Promise<any>
  put: (url: string, data?: any, config?: any) => Promise<any>
  patch: (url: string, data?: any, config?: any) => Promise<any>
}

/**
 * WebSocket instance.
 */
export interface WsInstance {
  _ws?: { terminate: () => void }
}
