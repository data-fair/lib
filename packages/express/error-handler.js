import { internalError } from '../node/observer.js'
import eventsLog from './events-log.js'

/** @type {import('express').ErrorRequestHandler} */
export default function (err, req, res, next) {
  // let the default error handler manage closing the connection
  if (res.headersSent) { next(err); return }

  // we prevent transmitting error code from an axios error
  // usually a 401 for example means a badly configured secret and should be returned as a 500 to the user
  const status = err.name === 'AxiosRequestError' ? 500 : err.status || err.statusCode || 500
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
  if (process.env.NODE_ENV === 'production') {
    if (status < 500) res.send(err.message)
    else res.send(err.name || 'internal error')
  } else {
    res.send(err.stack + '\n')
  }
}
