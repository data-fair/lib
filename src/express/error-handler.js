import { internalError } from '../node/prometheus.js'
import { logGlobalReqEvent } from './events-log.js'

/** @type {import('express').ErrorRequestHandler} */
export default function (err, req, res, next) {
  // let the default error handler manage closing the connection
  if (res.headersSent) { next(err); return }

  const status = err.status || err.statusCode || 500
  if (status >= 500) {
    internalError('http', 'failure while serving http request', err)
  }
  if (status === 403) {
    logGlobalReqEvent(req, 'forbidden', err.message)
  }
  if (status === 401) {
    logGlobalReqEvent(req, 'unauthorized', err.message)
  }
  res.set('Cache-Control', 'no-cache')
  res.set('Expires', '-1')
  res.status(status)
  if (process.env.NODE_ENV === 'production') {
    if (status < 500) res.send(err.message)
    else res.send(err.name || 'internal error')
  } else {
    res.send(err.stack)
  }
}
