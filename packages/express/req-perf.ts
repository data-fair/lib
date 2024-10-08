import type { Request, Response, NextFunction } from 'express'
import { Histogram } from 'prom-client'
import Debug from 'debug'

const debugReq = Debug('df:observe:req')

const reqStepHistogram = new Histogram({
  name: 'df_req_step_seconds',
  help: 'Duration in seconds of steps in API requests',
  buckets: [0.03, 0.1, 1, 10, 60],
  labelNames: ['routeName', 'step']
})

const reqObserveKey = Symbol('reqObserveKey')

export const reqPerfMiddleware = (req: Request, res: Response, next: NextFunction) => {
  reqPerfWrap(req, res)
  next()
}

export const reqPerfWrap = (req: Request, res: Response) => {
  const start = Date.now()
  // @ts-ignore
  req[reqObserveKey] = { start, step: start }
  res.on('finish', () => {
    exports.reqStep(req, 'finish')
    exports.reqStep(req, 'total')
  })
}

export const reqPerfRouteName = (req: Request, routeName: string) => {
  (req as unknown as any)[reqObserveKey].routeName = routeName
}

export const reqPerfStep = (req: Request, stepName: string) => {
  const reqObserve: { start: number, step: number, routeName?: string } = (req as unknown as any)[reqObserveKey]

  if (!reqObserve) {
    console.warn('reqStep was called on a request that was not initialized for observation')
    return
  }

  if (!reqObserve.routeName) {
    reqObserve.routeName = req.route?.path
  }
  if (!reqObserve.routeName) {
    console.warn('reqStep was called on a request without a route name')
    return
  }

  const now = Date.now()
  const duration = now - (stepName === 'total' ? reqObserve.start : reqObserve.step)
  reqStepHistogram.labels(reqObserve.routeName, stepName).observe(duration / 1000)
  debugReq('request', req.method, req.url, stepName, duration, 'ms')
  if (duration > 1000 && stepName !== 'total' && stepName !== 'finish') {
    console.log('request', req.method, req.url, stepName, duration, 'ms')
  }
  reqObserve.step = now
}
