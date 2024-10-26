// build axios instances with sessions on a simple-directory instance
// used for integration testing

import type { AxiosInstance, AxiosResponse } from 'axios'
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
}

export type AxiosAuthInstance = AxiosInstance & {
  cookieJar: CookieJar,
  setOrg: (org: string, dep?: string) => void
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
  const origin = new URL(directoryUrl).origin
  try {
    await axiosInstance.get(callbackUrl, { maxRedirects: 0 })
  } catch (err: any) {
    if (err.status !== 302) throw err
    const redirectUrl = new URL(err.headers.location)
    const redirectError = redirectUrl.searchParams.get('error')
    if (redirectError) throw new Error(redirectError)
    for (const cookie of err.headers['set-cookie']) cookieJar.setCookie(cookie, origin)
  }
  const ax = axiosBuilder(axiosOpts, (ax) => {
    ax.interceptors.request.use(async (config) => {
      config.headers.Cookie = await cookieJar.getCookies(origin)
      return config
    })
    ax.interceptors.response.use(async (res) => {
      for (const cookie of res.headers['set-cookie'] ?? []) cookieJar.setCookie(cookie, origin)
      return res
    }, async (error) => {
      const res = error.response as AxiosResponse | undefined
      if (res) {
        for (const cookie of res.headers['set-cookie'] ?? []) cookieJar.setCookie(cookie, origin)
      }
      return Promise.reject(error)
    })
  }) as AxiosAuthInstance
  ax.cookieJar = cookieJar
  ax.setOrg = (org: string, dep?: string) => {
    cookieJar.setCookie(`id_token_org=${org}`, origin)
    cookieJar.setCookie(`id_token_dep=${dep ?? ''}`, origin)
  }

  return ax
}

export default axiosAuth
