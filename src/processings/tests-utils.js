import chalk from 'chalk'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat.js'
import axios from 'axios'
import { DataFairWsClient } from '../node/ws.js'
import draftlog from 'draftlog'

draftlog.into(console).addLineListener(process.stdin)
dayjs.extend(localizedFormat)

/**
 * @type {{[key: string]: any}}
 */
const tasksDraftLog = {}

/**
 * Inspect an object in a dense way.
 * @param {any} arg - Object to inspect.
 * @returns {string} Inspected object.
 */
const denseInspect = (arg) => {
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

/**
 * Create log functions.
 * @param {boolean} debug - Enable debug logging.
 * @param {boolean} testDebug - Enable test debug logging.
 * @returns {import('./tests-utils-types.js').LogTestFunctions} Log functions.
 */
const prepareLog = (debug, testDebug) => {
  return {
    step: (msg) => console.log(chalk.blueBright.bold.underline(`[${dayjs().format('LTS')}] ${msg}`)),
    error: (msg, extra) => console.log(chalk.red.bold(`[${dayjs().format('LTS')}] ${msg}`), denseInspect(extra)),
    warning: (msg, extra) => console.log(chalk.red(`[${dayjs().format('LTS')}] ${msg}`), denseInspect(extra)),
    info: (msg, extra) => console.log(chalk.blueBright(`[${dayjs().format('LTS')}] ${msg}`), denseInspect(extra)),
    debug: (msg, extra) => debug && console.log(`[${dayjs().format('LTS')}][debug] ${msg}`, denseInspect(extra)),
    task: (name) => {
      tasksDraftLog[name] = console.draft()
      tasksDraftLog[name](chalk.yellow(name))
    },
    progress: (taskName, /** @type {number} */ progress, /** @type {number} */ total) => {
      const msg = `[${dayjs().format('LTS')}][task] ${taskName} - ${progress} / ${total}`
      if (progress === 0) tasksDraftLog[taskName](chalk.yellow(msg))
      else if (progress >= total) tasksDraftLog[taskName](chalk.greenBright(msg))
      else tasksDraftLog[taskName](chalk.greenBright.bold(msg))
    },
    testInfo: (msg, extra) => console.log(chalk.yellowBright.bold(`[${dayjs().format('LTS')}][test] - ${msg}`), denseInspect(extra)),
    testDebug: (msg, extra) => testDebug && console.log(chalk.yellowBright(`[${dayjs().format('LTS')}][test][debug] - ${msg}`), denseInspect(extra))
  }
}

/**
 * Create an Axios instance.
 * @param {import('./tests-utils-types.ts').ProcessingTestConfig} config - Configuration.
 * @returns {import('axios').AxiosInstance} Axios instance.
 */
const axiosInstance = (config) => {
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
    const headers = {}
    if (error.response.headers.location) headers.location = error.response.headers.location
    error.response.headers = headers
    error.response.config = { method: error.response.config.method, url: error.response.config.url, data: error.response.config.data }
    if (error.response.config.data && error.response.config.data._writableState) delete error.response.config.data
    if (error.response.data && error.response.data._readableState) delete error.response.data
    return Promise.reject(error.response)
  })
  return axiosInstance
}

/**
 * Create a WebSocket instance.
 * @param {import('./tests-utils-types.ts').ProcessingTestConfig} config - Configuration.
 * @param {import('./tests-utils-types.js').LogTestFunctions} log Log functions.
 * @returns {DataFairWsClient} WebSocket instance.
 */
const wsInstance = (config, log) => {
  return new DataFairWsClient({
    url: config.dataFairUrl,
    apiKey: config.dataFairAPIKey,
    log,
    adminMode: config.adminMode,
    account: config.account
  })
}

/**
 * Create a context instance.
 * @param {any} initialContext - Initial context.
 * @param {import('./tests-utils-types.ts').ProcessingTestConfig} config - Configuration.
 * @param {boolean} debug - Enable debug logging.
 * @param {boolean} testDebug - Enable test debug logging.
 * @returns {import('./tests-utils-types.js').ProcessingTestContext} Context instance.
 */
export const context = (initialContext, config, debug, testDebug) => {
  /** @type {{ id: string; }} */
  let createdDataset

  const log = prepareLog(debug, testDebug)

  /** @type {import('./tests-utils-types.js').ProcessingTestContext} */
  const processingContext = {
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
  processingContext.sendMail = async (/** @type {string} */ mail) => processingContext.log.testInfo('send email', mail)
  processingContext.patchConfig = async (/** @type {{ datasetMode: string; dataset: any; }} */ patch) => {
    processingContext.log.testInfo('received config patch', patch)
    if (patch.datasetMode === 'update' && patch.dataset) createdDataset = patch.dataset
    Object.assign(processingContext.processingConfig, patch)
  }
  processingContext.cleanup = async () => {
    if (processingContext.ws._ws) processingContext.ws.close()
    if (createdDataset) {
      processingContext.log.testInfo('delete test dataset', createdDataset)
      await processingContext.axios.delete('api/v1/datasets/' + createdDataset.id)
    }
  }
  return processingContext
}

export const testsUtils = { context }
export default testsUtils
