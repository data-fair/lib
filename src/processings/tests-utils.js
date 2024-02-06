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
 * @returns {import('./processings-types.ts').LogFunctions} Log functions.
 */
export const log = (debug, testDebug) => {
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
 * @typedef {object} config
 * @property {string} dataFairAPIKey - DataFair API key.
 * @property {string} dataFairUrl - DataFair URL.
 * @property {boolean} adminMode - Admin mode.
 * @property {import('../shared/session/index.js').Account} account - Account.
 */

/**
 * Create an Axios instance.
 * @param {config} config - Configuration.
 * @returns {import('./processings-types.ts').AxiosInstance} Axios instance.
 */
export const axiosInstance = (config) => {
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
 * @param {config} config - Configuration.
 * @param {object} log - Log functions.
 * @returns {object} WebSocket instance.
 */
export const wsInstance = (config, log) => {
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
 * @param {config} config - Configuration.
 * @param {boolean} debug - Enable debug logging.
 * @param {boolean} testDebug - Enable test debug logging.
 * @returns {import('./processings-types.ts').Context} Context instance.
 */
export const context = (initialContext, config, debug, testDebug) => {
  /** @type {{ id: string; }} */
  let createdDataset

  /** @type {import('./processings-types.ts').Context} */
  const context = {
    ...initialContext,
    processingConfig: initialContext.processingConfig || {},
    pluginConfig: initialContext.pluginConfig || {},
    log: log(debug, testDebug),
    axios: axiosInstance(config),
    ws: wsInstance(config, log),
    sendMail: async () => {},
    patchConfig: async () => {},
    cleanup: async () => {}
  }
  context.sendMail = async (/** @type {string} */ mail) => context.log.testInfo('send email', mail)
  context.patchConfig = async (/** @type {{ datasetMode: string; dataset: any; }} */ patch) => {
    context.log.testInfo('received config patch', patch)
    if (patch.datasetMode === 'update' && patch.dataset) createdDataset = patch.dataset
    Object.assign(context.processingConfig, patch)
  }
  context.cleanup = async () => {
    if (context.ws._ws) context.ws._ws.terminate()
    if (createdDataset) {
      context.log.testInfo('delete test dataset', createdDataset)
      await context.axios.delete('api/v1/datasets/' + createdDataset.id)
    }
  }
  return context
}

export default context
