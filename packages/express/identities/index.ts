// Define a few routes to be used to synchronize data with the users/organizations directory
// Useful both for functionalities and help respect GDPR rules

import type { PostIdentityReq } from './types/post-req/index.js'
import type { DeleteIdentityReq } from './types/delete-req/index.js'
import { Router } from 'express'
import { asyncHandler, assertReqInternal, httpError } from '@data-fair/lib-express'
import * as postReq from './types/post-req/index.js'
import * as deleteReq from './types/delete-req/index.js'

export function createIdentitiesRouter (
  secretKey: string | null | undefined,
  onUpdate: (identityUpdate: PostIdentityReq['params'] & PostIdentityReq['body']) => Promise<void>,
  onDelete: (identityDelete: DeleteIdentityReq['params']) => Promise<void>
): Router {
  const router = Router()

  router.use((req, res, next) => {
    assertReqInternal(req)
    if (!req.query.key || secretKey !== req.query.key) throw httpError(401, 'Bad secret key')
    next()
  })

  // notify a name change or initialization
  router.post('/:type/:id', asyncHandler(async (req, res) => {
    const { params, body } = postReq.returnValid(req)
    await onUpdate?.({
      ...params,
      ...body
    })
    res.send()
  }))

  // Remove resources owned, permissions and anonymize created and updated
  router.delete('/:type/:id', asyncHandler(async (req, res) => {
    const { params } = deleteReq.returnValid(req)
    await onDelete?.(params)
    res.send()
  }))

  // Ask for a report of every piece of data in the service related to an identity
  router.get('/:type/:id/report', asyncHandler(async (req, res) => {
    // TODO
    res.send()
  }))

  return router
}
