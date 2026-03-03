---
name: data-fair-session
description: "How to use the @data-fair/lib session management system in services that consume sessions (not login/account management). Use this skill whenever the task involves reading user identity, checking permissions, protecting routes, accessing account/organization info, or implementing authorization logic in a data-fair service -- both on the Express/Node backend and in Vue frontend components. Also use it when the user mentions session middleware, account roles, admin mode, or organization switching in a data-fair context."
---

# data-fair Session Management -- Consumer Guide

This skill covers how services **consume** sessions produced by Simple Directory (the identity provider). It does NOT cover login flows or account management -- only how a service reads, verifies, and uses session data for authentication and authorization.

## Architecture Overview

Sessions are **stateless JWT cookies** set by Simple Directory. Consuming services never store sessions -- they verify and read them on every request. The JWT is split across two cookies for security: `id_token` (readable by JavaScript, contains header+payload) and `id_token_sign` (httpOnly, contains the signature).

Additional cookies carry context: `id_token_org` (active organization), `id_token_dep` (active department), `id_token_role` (switched role), `i18n_lang` (language).

## Key Types

```ts
// The central session object -- always present, even for anonymous users
interface SessionState {
  user?: User                          // present if authenticated
  organization?: OrganizationMembership // active org (if user switched to one)
  account?: Account                    // derived: who is currently acting
  accountRole?: string                 // role in the active account
  lang: string                         // always present, defaults to 'fr'
}

// Authenticated variant -- user, account, accountRole guaranteed non-null
type SessionStateAuthenticated = SessionState & Required<Pick<SessionState, 'user' | 'account' | 'accountRole'>>

// The polymorphic "owner" of a resource
interface Account {
  type: 'user' | 'organization'
  id: string
  name: string
  department?: string
  departmentName?: string
}

// Minimal key for matching ownership (used in permission checks)
type AccountKeys = Pick<Account, 'type' | 'id' | 'department'>
```

The `account` field is the key abstraction: it normalizes "who is currently acting" regardless of whether it's a personal user or an organization. Resources are owned by an `Account`; permission checks compare the session's `account` against the resource's `owner`.

The `user.adminMode` flag indicates a platform super-admin in admin mode -- it bypasses all permission checks.

## Express Backend

### Package: `@data-fair/lib-express`

Import paths:
```ts
import { session } from '@data-fair/lib-express/session.js'
// or the default export:
import session from '@data-fair/lib-express/session.js'

// Sync accessors and helpers (also re-exported from session.js):
import {
  reqSession,
  reqSessionAuthenticated,
  reqAdminMode,
  reqUser,
  reqUserAuthenticated,
  setReqUser,
  setReqSession,
  assertAccountRole,
  assertAdminMode,
  getAccountRole,
  isAuthenticated,
} from '@data-fair/lib-express/session.js'
```

### Initialization (at server startup)

```ts
import { session } from '@data-fair/lib-express/session.js'

// Point to Simple Directory's internal URL for JWKS key fetching
session.init(config.privateDirectoryUrl)
// Typically: 'http://simple-directory:8080' in Docker
```

### Middleware (applied to routes)

```ts
import { session } from '@data-fair/lib-express/session.js'

// Parse session on all API routes (anonymous access allowed)
app.use('/api', session.middleware())

// Require authentication
app.use('/api/private', session.middleware({ required: true }))

// Require super-admin
app.use('/api/admin', session.middleware({ adminOnly: true }))
```

The middleware parses cookies, verifies the JWT via JWKS, and caches the result on the request object. It also blocks non-GET requests for `pseudoSession` tokens (limited API key sessions).

### Reading Session in Route Handlers

After middleware has run, use the **sync accessors**:

```ts
app.get('/api/data', (req, res) => {
  const s = reqSession(req)              // SessionState (may be anonymous)
  if (s.user) { /* authenticated */ }
})

app.post('/api/data', (req, res) => {
  const s = reqSessionAuthenticated(req) // throws 401 if not logged in
  // s.user, s.account, s.accountRole are guaranteed present
})

app.delete('/api/admin/thing', (req, res) => {
  const s = reqAdminMode(req)            // throws 401/403 if not super-admin
})
```

### Permission Checking

The permission model is **account-based ownership**. Resources have an `owner: Account` field. Check access with:

```ts
import { reqSessionAuthenticated, assertAccountRole, assertAdminMode } from '@data-fair/lib-express/session.js'

// Check the user has 'admin' role on the resource's owner account
app.put('/api/resources/:id', async (req, res) => {
  const session = reqSessionAuthenticated(req)
  const resource = await db.findById(req.params.id)
  assertAccountRole(session, resource.owner, 'admin')
  // proceed with update...
})

// Accept multiple roles
assertAccountRole(session, resource.owner, ['admin', 'contrib'])

// Super-admin-only operations
assertAdminMode(session)

// Non-throwing check (returns role string or null)
const role = getAccountRole(session, resource.owner)
if (role === 'admin') { /* can edit */ }
```

`getAccountRole` resolution order:
1. Not authenticated -> `null`
2. `user.adminMode` -> `'admin'` (super-admin bypass)
3. Target is `type:'user'` matching `user.id` -> `'admin'` (self-ownership)
4. Match against `session.account` -> `session.accountRole`
5. Otherwise -> `null`

Options for `getAccountRole` / `assertAccountRole`:
- `allAccounts: true` -- check all user's org memberships, not just the currently active one
- `acceptDepAsRoot: true` -- users in the root org (no department) can access department-scoped resources

### Filtering Lists by Ownership

A common pattern for listing resources scoped to the current account:

```ts
app.get('/api/resources', async (req, res) => {
  const session = reqSessionAuthenticated(req)
  const query: any = {}

  if (req.query.showAll === 'true') {
    // Only super-admins can see all resources
    assertAdminMode(session)
  } else {
    // Scope to current account
    query['owner.type'] = session.account.type
    query['owner.id'] = session.account.id
    if (session.account.department) {
      query['owner.department'] = session.account.department
    }
  }

  const results = await db.find(query)
  res.json(results)
})
```

### Default Owner on Resource Creation

When creating a resource, default the owner to the session's active account:

```ts
app.post('/api/resources', async (req, res) => {
  const session = reqSessionAuthenticated(req)
  const resource = {
    ...req.body,
    owner: req.body.owner ?? session.account
  }
  // Verify user has permission on the specified owner
  assertAccountRole(session, resource.owner, 'admin')
  await db.insert(resource)
})
```

### Ownership Transfer

When changing a resource's owner, check permission on both old and new:

```ts
if (patch.owner) {
  assertAccountRole(session, resource.owner, 'admin')  // can remove from old
  assertAccountRole(session, patch.owner, 'admin')     // can assign to new
}
```

### Synthetic Sessions (API Keys, Internal Calls)

Use `setReqUser` or `setReqSession` to create a pseudo-session from an API key or service-to-service call, bypassing normal cookie parsing:

```ts
import { setReqUser } from '@data-fair/lib-express/session.js'

// Create a session from an API key lookup
app.use(async (req, res, next) => {
  const apiKey = req.headers['x-api-key']
  if (apiKey) {
    const keyRecord = await db.apiKeys.findOne({ key: apiKey })
    setReqUser(req, keyRecord.user, 'fr', keyRecord.account, keyRecord.role)
  }
  next()
})
```

### Passing Session to Service Layer

Thread the session state as a parameter to service functions rather than relying on request context:

```ts
// router.ts
const session = reqSessionAuthenticated(req)
await updateResource(session, req.params.id, req.body)

// service.ts
export async function updateResource(
  sessionState: SessionStateAuthenticated,
  id: string,
  body: any
) {
  const resource = await db.findById(id)
  assertAccountRole(sessionState, resource.owner, 'admin')
  // ...
}
```

## Vue Frontend

### Package: `@data-fair/lib-vue`

Import paths:
```ts
import { createSession, useSession, useSessionAuthenticated, getAccountRole } from '@data-fair/lib-vue/session.js'
import type { Session, SessionAuthenticated, SiteInfo, Account } from '@data-fair/lib-vue/session.js'
```

### Setup -- Plain Vue SPA

```ts
// main.ts
import { createSession } from '@data-fair/lib-vue/session.js'

const session = await createSession({
  // All options are optional, these are the defaults:
  // directoryUrl: '/simple-directory',
  // sitePath: '',
  // defaultLang: 'fr',
})

const i18n = createI18n({ locale: session.state.lang })

createApp(App)
  .use(session)    // provides session via Vue's provide/inject
  .use(i18n)
  .mount('#app')
```

### Setup -- Nuxt 3 SSR

Server-side (Nitro plugin):
```ts
// server/plugins/session.ts
import { SessionHandler } from '@data-fair/lib-node/session.js'

export const session = new SessionHandler()

export default defineNitroPlugin(async () => {
  const config = useRuntimeConfig()
  session.initJWKS(config.privateDirectoryUrl)
})
```

Client-side (Nuxt plugin):
```ts
// plugins/session.ts
import { createSession } from '@data-fair/lib-vue/session.js'

export default defineNuxtPlugin(async (app) => {
  app.vueApp.use(await createSession({
    req: app.ssrContext?.event.node.req,  // pass request for SSR cookie reading
    route: useRoute(),
  }))
})
```

Auto-imports in `nuxt.config.ts`:
```ts
imports: {
  presets: [{
    from: '@data-fair/lib-vue/session.js',
    imports: ['useSession', 'useSessionAuthenticated']
  }]
}
```

### Using Session in Components

**`useSession()`** -- returns `Session` with possibly-undefined `user`. Use for public-facing pages:

```vue
<script setup>
const session = useSession()
</script>

<template>
  <div v-if="session.user.value">
    Logged in as {{ session.user.value.name }}
    <button @click="session.logout()">Logout</button>
  </div>
  <div v-else>
    <button @click="session.login()">Login</button>
  </div>
</template>
```

**`useSessionAuthenticated()`** -- returns `SessionAuthenticated` where `user`, `account`, `accountRole` are guaranteed. Use for protected pages (throws if not logged in):

```vue
<script setup>
const session = useSessionAuthenticated()

// Access current account
const accountType = session.state.account.type  // 'user' | 'organization'
const accountId = session.state.account.id
const role = session.state.accountRole           // 'admin' | 'contrib' | 'user'
</script>
```

### Client-Side Permission Checks

```vue
<script setup>
import { getAccountRole } from '@data-fair/lib-vue/session.js'

const session = useSessionAuthenticated()

// Check role for a specific resource owner
const canEdit = computed(() => {
  return getAccountRole(session.state, resource.value.owner) === 'admin'
})

// Super-admin check
const isSuperAdmin = computed(() => !!session.state.user?.adminMode)
</script>
```

### Organization Switching

```vue
<script setup>
const session = useSessionAuthenticated()

// List available accounts (personal + organizations)
const accounts = computed(() => {
  const items = [{ label: session.state.user.name, value: null }]
  for (const org of session.state.user.organizations) {
    items.push({
      label: org.department ? `${org.name} / ${org.departmentName}` : org.name,
      value: org.department ? `${org.id}:${org.department}` : org.id
    })
  }
  return items
})

function onSwitch(value: string | null) {
  if (!value) {
    session.switchOrganization(null)
  } else {
    const [org, dep] = value.split(':')
    session.switchOrganization(org, dep)
  }
}
</script>
```

### Session Properties Reference

The `Session` object returned by `useSession()`:

| Property | Type | Description |
|----------|------|-------------|
| `state` | `reactive(SessionState)` | The raw reactive state object |
| `user` | `ComputedRef<User \| undefined>` | Current user (null if anonymous) |
| `organization` | `ComputedRef` | Active organization membership |
| `account` | `ComputedRef<Account \| undefined>` | Active account (user or org) |
| `accountRole` | `ComputedRef<string \| undefined>` | Role in active account |
| `lang` | `ComputedRef<string>` | Current language |
| `theme` | `Ref<Theme>` | Current theme |
| `site` | `Ref<SiteInfo \| null>` | Site info (colors, auth mode) |

| Method | Description |
|--------|-------------|
| `login(redirect?)` | Navigate to Simple Directory login |
| `logout(redirect?)` | Delete auth cookies and redirect |
| `switchOrganization(orgId, dep?, role?)` | Switch active organization |
| `switchLang(lang)` | Change language (triggers page reload) |
| `keepalive()` | Refresh the JWT token |

Keepalive runs automatically every 10 minutes on non-iframe top windows. Changing `account`, `lang`, or `dark` triggers a full page reload to ensure data consistency.

## Common Patterns Summary

1. **Express init**: `session.init(directoryUrl)` at startup
2. **Express middleware**: `session.middleware()` on route groups
3. **Read session**: `reqSession(req)` or `reqSessionAuthenticated(req)` (sync, after middleware)
4. **Check permission**: `assertAccountRole(session, resource.owner, 'admin')`
5. **Super-admin gate**: `assertAdminMode(session)`
6. **List filtering**: scope queries to `session.account.{type, id, department}`
7. **Default owner**: `body.owner ?? session.account`
8. **Vue setup**: `createSession({})` as Vue plugin
9. **Vue access**: `useSession()` for public pages, `useSessionAuthenticated()` for protected pages
10. **Vue permission**: `getAccountRole(session.state, owner)` for conditional UI
