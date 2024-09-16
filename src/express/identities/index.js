// Define a few routes to be used to synchronize data with the users/organizations directory
// Useful both for functionalities and help respect GDPR rules

import express from 'express'
import { asyncHandler, assertReqInternal, httpError } from '@data-fair/lib/express/index.js'
import * as postReq from './types/post-req/index.js'
import * as deleteReq from './types/delete-req/index.js'

/**
 * @param {string | null | undefined} secretKey
 * @param {(identityUpdate: import('./types/post-req/index.js').PostIdentityReq['params'] & import('./types/post-req/index.js').PostIdentityReq['body']) => Promise<void>} [onUpdate]
 * @param {(identityUpdate: import('./types/delete-req/index.js').DeleteIdentityReq['params'] & import('./types/delete-req/index.js').DeleteIdentityReq['body']) => Promise<void>} [onDelete]
 * @returns {import('express').Router}
 */
export const createIdentitiesRouter = (secretKey, onUpdate, onDelete) => {
  const router = express.Router()

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
    const { params, body } = deleteReq.returnValid(req)
    await onDelete?.({ ...params, ...body })
    res.send()
  }))

  // Ask for a report of every piece of data in the service related to an identity
  router.get('/:type/:id/report', asyncHandler(async (req, res) => {
    // TODO
    res.send()
  }))

  return router
}
