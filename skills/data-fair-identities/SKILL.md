---
name: data-fair-identities
description: >
  Use when a data-fair service must react to the identity webhooks emitted by
  simple-directory: mounting or auditing an identities router (`/api/identities`,
  `createIdentitiesRouter`, `SECRET_IDENTITIES`), propagating a user, organization
  or department rename, cleaning up after an identity is deleted (GDPR), handling
  organization partners, or writing the integration test of that router. Also use
  it when a service stores owner / created / updated / sender / recipient names
  and you need to know what must follow a rename or a deletion.
---

# Identity webhooks in data-fair services

Simple-directory is the source of truth for users and organizations. Every other
service stores copies of identity data (names on owners, permissions, senders…)
and must keep them in sync and delete them when the identity disappears. This is
done through webhooks received by `createIdentitiesRouter` from
`@data-fair/lib-express/identities/index.js`.

The router only validates the requests. **The effect is the service's
responsibility**, and this skill describes the effect a service is expected to
produce.

## The contract

Simple-directory calls three routes on every service listed in its
`IDENTITIES_WEBHOOKS` configuration (`[{ base, key }]`), with the shared secret
in the `x-secret-key` header (or `?key=` for older emitters).

| Route | When simple-directory calls it | Body |
| --- | --- | --- |
| `POST /:type/:id` | creation, rename, membership change, department or partner change | `{ name, organizations?, departments?, partners? }` |
| `DELETE /:type/:id` | the identity is deleted (user deleted, organization deleted, service account removed) | — |
| `GET /:type/:id/report` | never, reserved (the lib answers 501) | — |

`type` is `user` or `organization`. The `POST` body is the **current, complete
state** of the identity, not a diff:

- user: `organizations: [{ id, name?, role, department? }]` — every membership,
  one entry per (organization, department, role)
- organization: `departments: [{ id, name }]` and `partners: [{ id, name }]`
  (established partnerships only, pending invitations are not sent)

A service reconciles what it stores against these lists: a department missing
from `departments` was deleted, an organization missing from `partners` is no
longer a partner. Nothing else will tell it.

Schemas and generated types live next to the router:
`packages/express/identities/types/{post-req,delete-req}/schema.ts`. The
emitter (simple-directory `api/src/webhooks/service.ts`) uses the same types.

## Mounting the router

```ts
// api/src/identities/router.ts
import { createIdentitiesRouter } from '@data-fair/lib-express/identities/index.js'
import config from '#config'
import mongo from '#mongo'

export default createIdentitiesRouter(
  config.secretKeys.identities,
  async (identity) => { /* onUpdate: rename */ },
  async (identity) => { /* onDelete: cleanup */ }
)

// api/src/app.ts
app.use('/api/identities', identitiesRouter)
```

Configuration, following the fleet convention:

```js
// config/default.*         secretKeys: { identities: undefined }
// config/custom-environment-variables.*   secretKeys: { identities: 'SECRET_IDENTITIES' }
```

The router refuses everything when the secret is undefined (a missing
`SECRET_IDENTITIES` in a deployment shows up as 401s in simple-directory, never
as an open door). Do not reimplement the guard: a hand-written
`if (config.secretKeys.identities && key !== …)` lets everything through when
the secret is missing.

## What `onUpdate` must do

Walk every collection of the service and ask, for each field holding an identity
reference, "does it carry a name?". Every copy of the name follows:

| Stored reference | Filter | Update |
| --- | --- | --- |
| `owner` | `{ 'owner.type': type, 'owner.id': id }` | `owner.name` |
| department of an owner | `{ …, 'owner.department': dep.id }` for each `departments[]` entry | `owner.departmentName` |
| `permissions[]` entries | `{ permissions: { $elemMatch: { type, id } } }` | the matching `permissions[].name` |
| `sender` / `recipient` (events) | `{ 'sender.type': type, 'sender.id': id }`, `{ 'recipient.id': id }` (users only) | `sender.name`, `recipient.name` |
| `created` / `updated` / `createdBy` / `updatedBy` | `{ 'created.id': id }` | only if the service still stores a name there (see below) |

Then the reconciliations, only when the list is present in the body (an older
simple-directory does not send `partners`):

- **user memberships** — anything private to an organization the user left must
  go (events removes the private subscriptions whose sender is no longer one of
  the user's organizations).
- **partners** (services granting permissions to other organizations) — a
  permission `{ type: 'organization', id: X }` on a resource of organization `A`
  with `X` ∉ `A.partners` and `X ≠ A` is removed: the partnership ended.
- **departments** — a resource whose `owner.department` is not in `departments`
  belongs to a deleted department: keep the id (the organization admins still
  reach the resource) but `$unset` `owner.departmentName`, on every collection
  where it is renamed. The UI then labels it "Former department ({id})"
  (`useDisplayOwner()` from `@data-fair/lib-vue/owner.js` for text labels;
  `owner-avatar` from `@data-fair/lib-vuetify` ≥ 2.5.0 does it by itself).

```ts
if (identity.departments) {
  for (const department of identity.departments) { /* rename owner.departmentName */ }
  await collection.updateMany(
    { 'owner.type': type, 'owner.id': id, 'owner.department': { $exists: true, $nin: identity.departments.map(d => d.id) } },
    { $unset: { 'owner.departmentName': 1 } }
  )
}
```

## What `onDelete` must do

Three categories, in this order:

1. **Owned** — everything with `owner = identity` is deleted, including what
   hangs off it: files on disk, search indexes, secondary collections (runs of a
   processing, publications of a catalog, notifications of a subscription…).
2. **Referencing** — permissions granted to the identity, subscriptions where it
   is sender or recipient, push subscriptions, API keys: removed from the
   documents of other owners.
3. **Traceability** — `created` / `updated` / originator fields on documents the
   identity does not own (typically: a user who created resources of their
   organization, then leaves) are kept for the audit trail but must not hold the
   name any more (the id alone is pseudonymized data, acceptable for a limited
   retention). Deleting the owned documents does not cover this case.

Prefer not storing names in `created` / `updated` at all (data-fair stores
`{ id }` only since PR #484): a rename has nothing to do and a deletion has
nothing to anonymize.

Both hooks are awaited by the router: **`await` every write**. A `deleteMany`
without `await` lets the router answer 200 before the data is gone, and turns a
failure into an unhandled rejection instead of an error response that
simple-directory can see.

## Integration test

One `identities.api.spec.ts` per service, calling the router the way
simple-directory does (`SECRET_IDENTITIES` is set in the test env):

```ts
const axIdentities = axios({ headers: { 'x-secret-key': 'SECRET_IDENTITIES' }, baseURL: devBaseURL })

// rename: create a resource, rename its owner, its department, a user with a permission
await axIdentities.post('/api/identities/user/test-user1', { name: 'New name' })
await axIdentities.post('/api/identities/organization/test1', { name: 'New org', departments: [{ id: 'dep1', name: 'New dep' }] })
// → every name read back through the service API has followed

// delete: create resources for the identity and references to it elsewhere
await axIdentities.delete('/api/identities/user/test-user1')
// → nothing owned remains, no reference remains, checked immediately (no polling)
```

The delete test must assert right after the webhook response: it is what proves
that the hooks are awaited.

## Common mistakes

| Mistake | Consequence |
| --- | --- |
| Reading `type`/`id` from `req.query` in a hand-written router | the filter is empty, the whole collection is affected |
| Permissive guard when the secret is unset | any caller can delete every resource |
| Missing `await` on a `deleteMany` | 200 returned before deletion, silent failures |
| Renaming `owner.name` but not `permissions[].name` or `departmentName` | stale names in lists and filters |
| Renaming the remaining departments but keeping the name of a missing one | a deleted department keeps showing under its old name |
| Deleting the main document but not what hangs off it | orphans (runs, publications, files, indexes) |
| Storing `created.name` / `updated.name` | a deleted user's name survives on other owners' resources |
| Reimplementing the router instead of using the lib | the two services that did (data-fair, taxman) were the two with defects |

## Checklist before opening the PR

- [ ] `createIdentitiesRouter` from the lib, mounted on `/api/identities`, secret from `SECRET_IDENTITIES`
- [ ] every collection reviewed: owner, department, permissions, sender/recipient, created/updated
- [ ] `onUpdate` reconciles memberships, partners and departments when the lists are present
- [ ] `onDelete` covers owned, referencing and traceability data, all awaited
- [ ] `identities.api.spec.ts` with a rename case and a delete case asserting immediately
