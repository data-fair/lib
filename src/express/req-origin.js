// similar to https://www.npmjs.com/package/original-url without the path part
// but it is important for us to have tight control over this as it can have some safety implications

/**
 * @param {import('express').Request} req
 */
export const reqOrigin = (req) => {
  // always use the host standard header sent by http client
  // it is considered safe as it is used by the reverse proxy to perform the routing
  const host = req.get('host')

  // WARNING: in case of multiple layers of reverse proxies the host header might be changed
  // in this case x-forwarded-host would be more suited, but to use it we have to be sure that is was defined
  // by the reverse proxy, not by the client

  // detect a situation where host and x-forwarded-host do not match
  const forwardedHost = req.get('x-forwarded-host')
  if (forwardedHost && forwardedHost !== host) {
    throw new Error(`host header "${host}" does not match x-forwarded-host header "${forwardedHost}"`)
  }

  // other infos are not as critical as host, we do our best with those almost standard headers to build a full origin
  const proto = req.get('x-forwarded-proto') ?? req.get('x-forwarded-scheme') ?? req.get('x-scheme') ?? 'http'
  const origin = `${proto}://${host}`
  const port = req.get('x-forwarded-port')
  if (port && !(port === '443' && proto === 'https') && !(port === '80' && proto === 'http')) {
    return origin + ':' + port
  } else {
    return origin
  }
}

export default reqOrigin
