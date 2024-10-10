// prepare an axios instance with improved error management and some performance tuning for nodejs usage

import type { InternalAxiosRequestConfig, AxiosInstance } from 'axios'
import axios from 'axios'
import { httpAgent, httpsAgent } from './http-agents.js'

const { stackTraceLimit } = Error

class AxiosRequestError extends Error {
  constructor () {
    super()
    this.name = 'AxiosRequestError'
  }
}

const requestInterceptor = (config: InternalAxiosRequestConfig) => {
  // better stack traces
  // see https://github.com/axios/axios/issues/2387#issuecomment-652242713
  Error.stackTraceLimit = 0
  const errorContext = new AxiosRequestError()
  Error.stackTraceLimit = stackTraceLimit
  Error.captureStackTrace(errorContext, requestInterceptor)
  // @ts-ignore
  config.errorContext = errorContext
  return config
}

export function axiosBuilder (opts: object = {}): AxiosInstance {
  const ax = axios.create({
    httpAgent,
    httpsAgent,
    ...opts
  })

  ax.interceptors.request.use(requestInterceptor)

  // shorter stack traces
  ax.interceptors.response.use(response => response, error => {
    if (!error.response) {
      if (error.config?.errorContext?.stack) error.stack += '\nRequest context:\n' + error.config?.errorContext?.stack
      return Promise.reject(error)
    }

    delete error.response.request
    error.response.config = { method: error.response.config.method, url: error.response.config.url, data: error.response.config.data }
    if (error.response.config.data && error.response.config.data._writableState) delete error.response.config.data
    if (error.response.data && error.response.data._readableState) delete error.response.data
    let messageText = error.response.statusText
    if (error.response.data) {
      messageText = typeof error.response.data === 'string' ? error.response.data : JSON.stringify(error.response.data)
    }
    error.response.message = `${error.response.status} - ${messageText}`
    Object.assign(error.config.errorContext, error.response)
    return Promise.reject(error.config.errorContext)
  })
  return ax
}

export const axiosInstance = axiosBuilder()

export default axiosInstance
