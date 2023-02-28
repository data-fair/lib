// build axios instances with sessions on a simple-directory instance
// used for integration testing

import { builder, instance } from './axios'

interface AxiosAuthOpts {
  email: string
  password: string
  org?: string
  dep?: string
  adminMode?: boolean
  directoryUrl?: string
  axiosOpts?: any
}

module.exports.axiosAuth = async (opts: AxiosAuthOpts) => {
  const body: any = { email: opts.email, password: opts.password }
  if (opts.org) body.org = opts.org
  if (opts.dep) body.org = opts.dep
  if (opts.adminMode) body.adminMode = opts.adminMode
  const axiosOpts = opts.axiosOpts ?? {}
  const directoryUrl = opts.directoryUrl ?? 'http://localhost:8080'
  let callbackUrl = (await instance.post(directoryUrl + '/api/auth/password', body, { params: { redirect: directoryUrl }, maxRedirects: 0 })).data
  if (callbackUrl.startsWith(directoryUrl + '/simple-directory')) {
    callbackUrl = callbackUrl.replace(directoryUrl + '/simple-directory', directoryUrl)
  }
  try {
    await instance.get(callbackUrl, { maxRedirects: 0 })
  } catch (err: any) {
    if (err.status !== 302) throw err
    axiosOpts.headers = axiosOpts.headers || {}
    axiosOpts.headers.Cookie = err.headers['set-cookie'].map((s: string) => s.split(';')[0]).join(';')
  }
  return builder(axiosOpts)
}
