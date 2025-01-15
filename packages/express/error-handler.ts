import type { ErrorRequestHandler } from 'express'
import { internalError } from '@data-fair/lib-node/observer.js'
import eventsLog from './events-log.js'
import debugModule from 'debug'

const debug = debugModule('http-errors')

const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // let the default error handler manage closing the connection
  if (res.headersSent) { next(err); return }

  let status = err.status || err.statusCode || 500

  // we prevent transmitting error code from an axios error
  // usually a 401 for example means a badly configured secret and should be returned as a 500 to the user
  if (err.name === 'AxiosRequestError') status = 500

  // a mongodb conflict on an index should usually be returned as a 409
  if (err.name === 'MongoServerError' && err.code === 11000) status = 409

  if (status >= 500) {
    internalError('http', 'failure while serving http request', err)
  }
  if (status === 403) {
    eventsLog.warn('forbidden-req', err.message, { req })
  }
  if (status === 401) {
    eventsLog.warn('unauthorized-req', err.message, { req })
  }
  res.set('Cache-Control', 'no-cache')
  res.set('Expires', '-1')
  res.status(status)
  res.type('text/plain')

  debug('express error handler', status, err)

  if (process.env.NODE_ENV === 'production') {
    if (status < 500) res.send(err.message)
    else res.send() // server errors are mostly unplanned and could contain confidential information, only return error code
  } else {
    res.send(status + ' - ' + err.stack + '\n')
  }
}

export default errorHandler
