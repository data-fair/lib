# The simple-directory side of identity webhooks

What simple-directory changes in its own database before calling the services,
and which of its actions sends which webhook. Paths are in the
`simple-directory` repository (`api/src/…`).

## Which action sends which webhook

| Action in simple-directory | Webhook |
| --- | --- |
| first email confirmation of a new account (login or token exchange) | `POST user` |
| invitation accepted | `POST user` |
| member removed from an organization (account kept) | `POST user` |
| role or department of a member changed | `POST user` |
| user patched, **only if the name changed** | `POST user` |
| service account (NHI) created or patched | `POST user` |
| user deleted, by any path below | `DELETE user` |
| organization created or patched (name, departments…) | `POST organization` |
| partnership accepted, created by a superadmin, or removed | `POST organization` (of the organization holding the partner list) |
| organization deleted | `DELETE organization` |

A user deletion sends nothing about the organizations they belonged to: the
membership lives on the user document. An organization deletion sends nothing
about the organizations that listed it as a partner: its own `DELETE` is what
services use to drop the permissions granted to it.

## Paths to a user deletion

| Trigger | Who | When |
| --- | --- | --- |
| `DELETE /api/users/:id` | a superadmin; a site admin for an account of their site; the user themself if `userSelfDelete` (default `false`) | immediate |
| planned deletion (`plannedDeletion` date on the user) | the user or a superadmin plans it, an email is sent, it can be cancelled | the cleanup task (`cleanup.cron`, daily at 5:00 by default) deletes users whose date is past |
| inactivity, if `cleanup.deleteInactive` (default `false`, `deleteInactiveDelay` 3 years) | cleanup task | a deletion is planned `plannedDeletionDelay` days later (14) with an email |
| offline OAuth token of a core identity provider refused (`invalid_grant`) | cleanup task | a deletion is planned the same way |
| removed from their last organization, if `onlyCreateInvited` (default `false`) | an organization admin | immediate |
| service account (NHI) deleted | an organization admin | immediate |

Each path deletes the user document, their OAuth tokens and grants and their
avatar, recomputes the member counts of their organizations, deletes their
limits, then sends `DELETE user`.

## Organization deletion

`DELETE /api/organizations/:id`, by a superadmin or an admin of the
organization, is **refused while it has more than one member**. Simple-directory
then removes it from every user's memberships and from the partner lists of
other organizations, deletes the document (departments included), its avatars
and its limits, then sends `DELETE organization`.

## Renames

A rename is an ordinary `PATCH` followed by the `POST` of the renamed identity
only. For an organization, simple-directory renames its own copies first: the
organization and department names in its members' memberships, its name in the
partner lists of other organizations. A user rename has no copy to update
inside simple-directory.
