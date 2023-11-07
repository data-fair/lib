// small route wrapper for better use of async/await with express
/**
 * @param {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => Promise<void | import('express').Response>} handler
 * @returns {import('express').RequestHandler}
 */
export default handler => {
  return (req, res, next) => handler(req, res, next).catch(next)
}
