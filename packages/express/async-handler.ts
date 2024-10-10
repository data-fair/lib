// small route wrapper for better use of async/await with express
// DEPRECATED, use express 5 async support
import { type RequestHandler } from 'express'

export default (handler: (req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void | import('express').Response>) => {
  return ((req, res, next) => handler(req, res, next).catch(next)) as RequestHandler
}
