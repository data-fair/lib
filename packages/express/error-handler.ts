import type { ErrorRequestHandler } from 'express'
import log from '@data-fair/lib-node/log.js'
import debugModule from 'debug'

const debug = debugModule('http-errors')

// the url comes from the client and can be logged for anonymous requests, keep log lines bounded
const maxUrlLength = 1000

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // let the default error handler manage closing the connection
  if (res.headersSent) { next(err); return }

  let status = err.status || err.statusCode || 500

  // we prevent transmitting error code from an axios error
  // usually a 401 for example means a badly configured secret and should be returned as a 500 to the user
  if (err.name === 'AxiosRequestError') status = 500

  // a mongodb conflict on an index should usually be returned as a 409
  if (err.name === 'MongoServerError' && err.code === 11000) status = 409

  // originalUrl because req.url is relative to the mount path, and no query string as it can carry secrets
  const url = req.originalUrl.split('?')[0]
  const reqFields = { method: req.method, url: url.length > maxUrlLength ? url.slice(0, maxUrlLength) + '…' : url }

  if (status >= 500) {
    log.error('failure while serving http request', { code: 'http', err, ...reqFields })
  }
  if (status === 403) {
    log.warn(err.message || 'forbidden request', { code: 'forbidden-req', ...reqFields })
  }
  if (status === 401) {
    log.warn(err.message || 'unauthorized request', { code: 'unauthorized-req', ...reqFields })
  }
  res.set('Cache-Control', 'no-cache')
  res.set('Expires', '-1')
  res.status(status)
  res.type('text/plain')

  debug('express error handler', status, err)

  if (err.expose === true) {
    // deliberate error whose message was explicitly marked as safe and useful for the client,
    // send it whatever the status and environment
    res.send(err.message)
  } else if (process.env.NODE_ENV === 'production') {
    if (status < 500) res.send(err.message)
    else res.send() // server errors are mostly unplanned and could contain confidential information, only return error code
  } else {
    res.send(status + ' - ' + err.stack + '\n')
  }
}

export default errorHandler
