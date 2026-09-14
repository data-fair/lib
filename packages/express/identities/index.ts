// Define a few routes to be used to synchronize data with the users/organizations directory
// Useful both for functionalities and help respect GDPR rules

import type { PostIdentityReq } from './types/post-req/index.js'
import type { DeleteIdentityReq } from './types/delete-req/index.js'
import { Router } from 'express'
import { assertReqInternalSecret } from '@data-fair/lib-express'
import * as postReq from './types/post-req/index.js'
import * as deleteReq from './types/delete-req/index.js'

export type IdentityUpdate = PostIdentityReq['params'] & PostIdentityReq['body']
export type IdentityDelete = DeleteIdentityReq['params']

/**
 * Router receiving the identity webhooks emitted by simple-directory, to be mounted on /api/identities.
 *
 * Simple-directory calls it with the shared secret (`x-secret-key` header or `key` query parameter) on every
 * change of a user or an organization. The routes only validate the request, the effect is implemented by the service:
 *
 * - `POST /:type/:id` → `onUpdate` with the current state of the identity (creation, rename, memberships,
 *   departments, partners). Every stored copy of the identity name must follow: owner, permissions, sender,
 *   recipient... and `departmentName` for the departments listed. The lists are complete, a service
 *   reconciles what it stores against them (a partner missing from `partners` is no longer a partner).
 * - `DELETE /:type/:id` → `onDelete`. Everything owned by the identity is deleted, everything referencing it
 *   (permissions, subscriptions...) is removed, and what must be kept for traceability is anonymized.
 * - `GET /:type/:id/report` → not implemented (501), reserved for an inventory of the data held about an identity.
 *
 * Both hooks must be awaited to completion before responding: simple-directory relies on the response status.
 */
export function createIdentitiesRouter (
  secretKey: string | null | undefined,
  onUpdate: (identityUpdate: IdentityUpdate) => Promise<void>,
  onDelete: (identityDelete: IdentityDelete) => Promise<void>
): Router {
  const router = Router()

  router.use((req, res, next) => {
    assertReqInternalSecret(req, secretKey ?? '')
    next()
  })

  // notify a name change or initialization
  router.post('/:type/:id', async (req, res) => {
    const { params, body } = postReq.returnValid(req)
    await onUpdate({
      ...params,
      ...body
    })
    res.send()
  })

  // Remove resources owned, permissions and anonymize created and updated
  router.delete('/:type/:id', async (req, res) => {
    const { params } = deleteReq.returnValid(req)
    await onDelete({ ...params })
    res.send()
  })

  // Ask for a report of every piece of data in the service related to an identity
  router.get('/:type/:id/report', (req, res) => {
    res.status(501).send('Not implemented')
  })

  return router
}
