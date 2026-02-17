// build axios instances with sessions on a simple-directory instance
// WARNING: use for integration testing only

import { Agent } from 'node:http'
import { CookieJar } from 'tough-cookie'
import { axiosInstance } from './axios.js'
import { axiosWithCookies, type AxiosWithCookiesInstance } from './axios-with-cookies.js'

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

export type AxiosAuthInstance = AxiosWithCookiesInstance & {
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

  const sdOrigin = new URL(directoryUrl).origin
  const cookieJar = new CookieJar()
  try {
    await axiosInstance.get(callbackUrl, { maxRedirects: 0 })
  } catch (err: any) {
    if (err.status !== 302) throw err
    const redirectUrl = new URL(err.headers.location)
    const redirectError = redirectUrl.searchParams.get('error')
    if (redirectError) throw new Error(redirectError)
    for (const cookie of err.headers['set-cookie'] ?? []) cookieJar.setCookieSync(cookie, sdOrigin)
  }

  const ax = axiosWithCookies({
    axiosOpts,
    cookiesOrigin: sdOrigin,
    globalCookies: opts.globalCookies,
    cookieJar
  }) as AxiosAuthInstance

  ax.setOrg = (org: string, dep?: string) => {
    ax.cookieJar.setCookieSync(`id_token_org=${org}`, sdOrigin)
    ax.cookieJar.setCookieSync(`id_token_dep=${dep ?? ''}`, sdOrigin)
  }

  return ax
}

export default axiosAuth
