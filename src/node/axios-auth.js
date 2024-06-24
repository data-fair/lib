// build axios instances with sessions on a simple-directory instance
// used for integration testing

import { Agent } from 'node:http'
import { axiosBuilder, axiosInstance } from './axios.js'

/**
 * @typedef {import('./axios-auth-types.js').AxiosAuthOpts} AxiosAuthOpts
 */

/**
 * @param {AxiosAuthOpts} opts
 * @returns {Promise<import('axios').AxiosInstance>}
 */
export const axiosAuth = async (opts) => {
  /** @type {any} */
  const body = { email: opts.email, password: opts.password }
  if (opts.org) body.org = opts.org
  if (opts.dep) body.dep = opts.dep
  if (opts.adminMode) body.adminMode = opts.adminMode
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
  } catch (/** @type {any} */err) {
    if (err.status !== 302) throw err
    axiosOpts.headers = axiosOpts.headers || {}
    axiosOpts.headers.Cookie = err.headers['set-cookie'].map((/** @type {string} */s) => s.split(';')[0]).join(';')
  }
  return axiosBuilder(axiosOpts)
}
export default axiosAuth
