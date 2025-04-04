// build axios instances with sessions on a simple-directory instance
// WARNING: use for integration testing only

import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { Agent } from 'node:http'
import { axiosBuilder, axiosInstance } from './axios.js'
import { CookieJar } from 'tough-cookie'

export interface AxiosAuthOptions {
  email: string
  password: string
  org?: string
  dep?: string
  adminMode?: boolean
  directoryUrl?: string
  axiosOpts?: any
  orgStorage?: boolean
  globalCookies?: boolean
}

export type AxiosAuthInstance = AxiosInstance & {
  cookieJar: CookieJar,
  setOrg: (org: string, dep?: string) => void
}

const getConfigUrl = (config: InternalAxiosRequestConfig) => {
  if (!config.url) throw new Error('url is required')
  return new URL((config.baseURL && config.url?.startsWith('/')) ? (config.baseURL + config.url) : config.url)
}
export async function axiosAuth (opts: AxiosAuthOptions): Promise<AxiosAuthInstance> {
  const body: any = { email: opts.email, password: opts.password }
  if (opts.org) body.org = opts.org
  if (opts.dep) body.dep = opts.dep
  if (opts.adminMode) body.adminMode = opts.adminMode
  if (opts.orgStorage) body.orgStorage = opts.orgStorage
  const axiosOpts = {
    httpAgent: new Agent({ keepAlive: false }),
    maxRedirects: 0,
    ...opts.axiosOpts
  }
  const directoryUrl = opts.directoryUrl ?? 'http://localhost:8080'
  let callbackUrl = (await axiosInstance.post(directoryUrl + '/api/auth/password', body, { params: { redirect: directoryUrl }, maxRedirects: 0 })).data
  if (callbackUrl.startsWith(directoryUrl + '/simple-directory')) {
    callbackUrl = callbackUrl.replace(directoryUrl + '/simple-directory', directoryUrl)
  }

  const cookieJar = new CookieJar()
  const sdOrigin = new URL(directoryUrl).origin
  try {
    await axiosInstance.get(callbackUrl, { maxRedirects: 0 })
  } catch (err: any) {
    if (err.status !== 302) throw err
    const redirectUrl = new URL(err.headers.location)
    const redirectError = redirectUrl.searchParams.get('error')
    if (redirectError) throw new Error(redirectError)
    for (const cookie of err.headers['set-cookie'] ?? []) cookieJar.setCookieSync(cookie, sdOrigin)
  }
  const ax = axiosBuilder(axiosOpts, (ax) => {
    ax.interceptors.request.use((config) => {
      const url = getConfigUrl(config)
      // if opts.globalCookies is true the cookie jar is used to store cookies shared accross all domains
      // this behavior is useful for testing purposes if serves are not on the same domain
      if (!opts.globalCookies || url.origin === sdOrigin) {
        config.headers.Cookie = cookieJar.getCookiesSync(url.href)
      } else {
        config.headers.Cookie = cookieJar.getCookiesSync(sdOrigin)
      }
      return config
    })
    ax.interceptors.response.use((res) => {
      const origin = opts.globalCookies ? sdOrigin : getConfigUrl(res.config).origin
      for (const cookie of res.headers['set-cookie'] ?? []) cookieJar.setCookieSync(cookie, origin)
      return res
    }, async (error) => {
      const res = error.response as AxiosResponse | undefined
      if (res) {
        const origin = opts.globalCookies ? sdOrigin : getConfigUrl(res.config).origin
        for (const cookie of res.headers['set-cookie'] ?? []) cookieJar.setCookieSync(cookie, origin)
      }
      return Promise.reject(error)
    })
  }) as AxiosAuthInstance
  ax.cookieJar = cookieJar
  ax.setOrg = (org: string, dep?: string) => {
    cookieJar.setCookieSync(`id_token_org=${org}`, sdOrigin)
    cookieJar.setCookieSync(`id_token_dep=${dep ?? ''}`, sdOrigin)
  }

  return ax
}

export default axiosAuth
