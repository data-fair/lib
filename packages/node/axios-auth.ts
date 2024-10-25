// build axios instances with sessions on a simple-directory instance
// used for integration testing

import type { AxiosInstance } from 'axios'
import { Agent } from 'node:http'
import { axiosBuilder, axiosInstance } from './axios.js'

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

export async function axiosAuth (opts: AxiosAuthOptions): Promise<AxiosInstance> {
  const body: any = { email: opts.email, password: opts.password }
  if (opts.org) body.org = opts.org
  if (opts.dep) body.dep = opts.dep
  if (opts.adminMode) body.adminMode = opts.adminMode
  if (opts.orgStorage) body.orgStorage = opts.orgStorage
  const axiosOpts = {
    httpAgent: new Agent({ keepAlive: false }),
    ...opts.axiosOpts
  }
  const directoryUrl = opts.directoryUrl ?? 'http://localhost:8080'
  let callbackUrl = (await axiosInstance.post(directoryUrl + '/api/auth/password', body, { params: { redirect: directoryUrl }, maxRedirects: 0 })).data
  if (callbackUrl.startsWith(directoryUrl + '/simple-directory')) {
    callbackUrl = callbackUrl.replace(directoryUrl + '/simple-directory', directoryUrl)
  }
  try {
    await axiosInstance.get(callbackUrl, { maxRedirects: 0 })
  } catch (err: any) {
    if (err.status !== 302) throw err
    axiosOpts.headers = axiosOpts.headers ?? {}
    axiosOpts.headers.common = axiosOpts.headers.common ?? {}
    axiosOpts.headers.common.Cookie = err.headers['set-cookie'].map((s: string) => s.split(';')[0]).join(';')
  }
  return axiosBuilder(axiosOpts)
}

export default axiosAuth
