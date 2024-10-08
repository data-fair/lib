import type { Account } from '@data-fair/lib-common-types/session/index.js'
import type { ProcessingContext, LogFunctions } from '@data-fair/lib-common-types/processings.js'
import type { AxiosInstance } from 'axios'
import chalk from 'chalk'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import axios from 'axios'
import { DataFairWsClient } from '@data-fair/lib-node/ws-client.js'
import draftlog from 'draftlog'

export interface ProcessingTestConfig {
  dataFairAPIKey: string
  dataFairUrl: string
  adminMode: boolean
  account: Account
};

export interface ProcessingTestContext extends ProcessingContext {
  cleanup: () => Promise<void>
  log: Required<ProcessingContext['log']>
}

draftlog.into(console).addLineListener(process.stdin)
dayjs.extend(localizedFormat)

const tasksDraftLog: { [key: string]: any } = {}

function denseInspect (arg: any): string {
  if (arg === undefined) return ''
  if (typeof arg === 'object') {
    try {
      const str = JSON.stringify(arg)
      if (str.length < 200) return str
    } catch (err) {
      // nothing to do, maybe circular object, etc
    }
  }
  return arg
}

function prepareLog (debug?: boolean, testDebug?: boolean): LogFunctions {
  return {
    step: async (msg) => console.log(chalk.blueBright.bold.underline(`[${dayjs().format('LTS')}] ${msg}`)),
    error: async (msg, extra) => console.log(chalk.red.bold(`[${dayjs().format('LTS')}] ${msg}`), denseInspect(extra)),
    warning: async (msg, extra) => console.log(chalk.red(`[${dayjs().format('LTS')}] ${msg}`), denseInspect(extra)),
    info: async (msg, extra) => console.log(chalk.blueBright(`[${dayjs().format('LTS')}] ${msg}`), denseInspect(extra)),
    debug: async (msg, extra) => {
      if (debug) console.log(`[${dayjs().format('LTS')}][debug] ${msg}`, denseInspect(extra))
    },
    task: async (name) => {
      tasksDraftLog[name] = console.draft()
      tasksDraftLog[name](chalk.yellow(name))
    },
    progress: async (taskName: string, progress: number, total: number) => {
      const msg = `[${dayjs().format('LTS')}][task] ${taskName} - ${progress} / ${total}`
      if (progress === 0) tasksDraftLog[taskName](chalk.yellow(msg))
      else if (progress >= total) tasksDraftLog[taskName](chalk.greenBright(msg))
      else tasksDraftLog[taskName](chalk.greenBright.bold(msg))
    },
    testInfo: (msg, extra) => console.log(chalk.yellowBright.bold(`[${dayjs().format('LTS')}][test] - ${msg}`), denseInspect(extra)),
    testDebug: (msg, extra) => testDebug && console.log(chalk.yellowBright(`[${dayjs().format('LTS')}][test][debug] - ${msg}`), denseInspect(extra))
  }
}

function axiosInstance (config: ProcessingTestConfig): AxiosInstance {
  const headers = { 'x-apiKey': config.dataFairAPIKey }
  const axiosInstance = axios.create({
    // this is necessary to prevent excessive memory usage during large file uploads, see https://github.com/axios/axios/issues/1045
    maxRedirects: 0
  })
  // apply default base url and send api key when relevant
  axiosInstance.interceptors.request.use(cfg => {
    if (cfg.url && !/^https?:\/\//i.test(cfg.url)) {
      if (cfg.url.startsWith('/')) cfg.url = config.dataFairUrl + cfg.url
      else cfg.url = config.dataFairUrl + '/' + cfg.url
    }
    if (cfg.url && cfg.url.startsWith(config.dataFairUrl)) Object.assign(cfg.headers, headers)
    return cfg
  }, error => Promise.reject(error))
  // customize axios errors for shorter stack traces when a request fails
  axiosInstance.interceptors.response.use(response => response, error => {
    if (!error.response) return Promise.reject(error)
    delete error.response.request
    const headers: any = {}
    if (error.response.headers.location) headers.location = error.response.headers.location
    error.response.headers = headers
    error.response.config = { method: error.response.config.method, url: error.response.config.url, data: error.response.config.data }
    if (error.response.config.data && error.response.config.data._writableState) delete error.response.config.data
    if (error.response.data && error.response.data._readableState) delete error.response.data
    return Promise.reject(error.response)
  })
  return axiosInstance
}

function wsInstance (config: ProcessingTestConfig, log: LogFunctions): DataFairWsClient {
  return new DataFairWsClient({
    url: config.dataFairUrl,
    apiKey: config.dataFairAPIKey,
    log,
    adminMode: config.adminMode,
    account: config.account
  })
}

export function context (initialContext: any, config: ProcessingTestConfig, debug?: boolean, testDebug?: boolean): ProcessingTestContext {
  let createdDataset: { id: string }

  const log = prepareLog(debug, testDebug)

  const processingContext: ProcessingTestContext = {
    ...initialContext,
    processingConfig: initialContext.processingConfig || {},
    pluginConfig: initialContext.pluginConfig || {},
    log,
    axios: axiosInstance(config),
    ws: wsInstance(config, log),
    sendMail: async () => {},
    patchConfig: async () => {},
    cleanup: async () => {}
  }
  processingContext.sendMail = async (mail: string) => processingContext.log.testInfo('send email', mail)
  processingContext.patchConfig = async (patch: { datasetMode: string; dataset: any; }) => {
    processingContext.log.testInfo('received config patch', patch)
    if (patch.datasetMode === 'update' && patch.dataset) createdDataset = patch.dataset
    Object.assign(processingContext.processingConfig, patch)
  }
  processingContext.cleanup = async () => {
    processingContext.ws.close()
    if (createdDataset) {
      processingContext.log.testInfo('delete test dataset', createdDataset)
      await processingContext.axios.delete('api/v1/datasets/' + createdDataset.id)
    }
  }
  return processingContext
}

export const testsUtils = { context }
export default testsUtils
