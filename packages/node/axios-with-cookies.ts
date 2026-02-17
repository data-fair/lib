// build axios instances with cookie jar support

import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { axiosBuilder } from './axios.js'
import { CookieJar } from 'tough-cookie'

export interface AxiosWithCookiesOptions {
  axiosOpts?: any
  cookiesOrigin?: string
  globalCookies?: boolean
  cookieJar?: CookieJar
}

export type AxiosWithCookiesInstance = AxiosInstance & {
  cookieJar: CookieJar
}

const getConfigUrl = (config: InternalAxiosRequestConfig) => {
  if (!config.url) throw new Error('url is required')
  return new URL((config.baseURL && config.url?.startsWith('/')) ? (config.baseURL + config.url) : config.url)
}

export function axiosWithCookies (opts: AxiosWithCookiesOptions = {}): AxiosWithCookiesInstance {
  const cookieJar = opts.cookieJar ?? new CookieJar()
  const cookiesOrigin = opts.cookiesOrigin ?? ''

  const ax = axiosBuilder(opts.axiosOpts, (ax) => {
    ax.interceptors.request.use((config) => {
      const url = getConfigUrl(config)
      if (!opts.globalCookies || url.origin === cookiesOrigin) {
        config.headers.Cookie = cookieJar.getCookiesSync(url.href)
      } else {
        config.headers.Cookie = cookieJar.getCookiesSync(cookiesOrigin)
      }
      return config
    })
    ax.interceptors.response.use((res) => {
      const origin = opts.globalCookies ? cookiesOrigin : getConfigUrl(res.config).origin
      for (const cookie of res.headers['set-cookie'] ?? []) cookieJar.setCookieSync(cookie, origin)
      return res
    }, async (error) => {
      const res = error.response as AxiosResponse | undefined
      if (res) {
        const origin = opts.globalCookies ? cookiesOrigin : getConfigUrl(res.config).origin
        for (const cookie of res.headers['set-cookie'] ?? []) cookieJar.setCookieSync(cookie, origin)
      }
      return Promise.reject(error)
    })
  }) as AxiosWithCookiesInstance
  ax.cookieJar = cookieJar

  return ax
}

export default axiosWithCookies
