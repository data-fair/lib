# Server-Side WS Examples

Real-world examples from the data-fair events and processings services.

## Events Service

### Server setup (`events/api/src/server.ts`)

```ts
import * as wsServer from '@data-fair/lib-express/ws-server.js'
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'

// Channel format: "user:{userId}:notifications"
await wsServer.start(server, mongo.db, async (channel, sessionState) => {
  const [ownerType, ownerId] = channel.split(':')
  if (!sessionState.user) return false
  if (sessionState.user.adminMode) return true
  return ownerType === 'user' && ownerId === sessionState.user.id
})
await wsEmitter.init(mongo.db)
```

### Emitting a notification (`events/api/src/notifications/service.ts`)

```ts
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'

// After inserting a notification into MongoDB:
await wsEmitter.emit(
  `user:${notification.recipient.id}:notifications`,
  notification
)
```

### Client subscription (`events/ui/src/pages/embed/notifications.vue`)

```ts
useWS('/events/api/')?.subscribe<Notification>(
  `user:${session.state.user.id}:notifications`,
  () => { fetchNotifications.execute() }
)
```

---

## Processings Service

### Server setup (`processings/api/src/server.ts`)

```ts
import * as wsServer from '@data-fair/lib-express/ws-server.js'
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'

// Channel format: "processings/{processingId}/..."
await wsServer.start(server, mongo.db, async (channel, sessionState) => {
  assertAuthenticated(sessionState)
  const processingId = channel.split('/')[1]
  const processing = await mongo.processings.findOne({ _id: processingId })
  if (!processing) return false
  return ['admin', 'exec', 'read'].includes(
    permissions.getUserResourceProfile(
      processing.owner, processing.permissions, sessionState
    ) ?? ''
  )
})
await wsEmitter.init(mongo.db)
```

### Emitting from a worker (`processings/worker/src/utils/runs.ts`)

```ts
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'

// Emit run status changes
await wsEmitter.emit(
  `processings/${processingId}/run-patch`,
  { _id: runId, patch: { status: 'running', startedAt: new Date().toISOString() } }
)

// Emit log entries (from task.ts)
await wsEmitter.emit(
  `processings/${processingId}/run-log`,
  { _id: runId, log: { type: 'info', msg: 'Processing started' } }
)

// Emit config patches applied by plugin
await wsEmitter.emit(
  `processings/${processingId}/patch-config`,
  { patch: configPatch }
)
```

### Worker init (`processings/worker/src/worker.ts`)

The worker process also needs to initialize the emitter:

```ts
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'

// In the worker's startup:
await wsEmitter.init(mongo.db)
```

### Client subscriptions (`processings/ui`)

**Run detail page** — subscribes to both log and patch channels:
```ts
const ws = useWS('/processings/api/')

ws?.subscribe(`processings/${id}/run-log`, (data) => {
  // Append log entry or update existing task progress
})
ws?.subscribe(`processings/${id}/run-patch`, (data) => {
  // Apply patch fields to the reactive run object
})
```

**Runs list** — subscribes only to patch to update status in the list:
```ts
const ws = useWS('/processings/api/')
const channel = computed(() => `processings/${props.processing._id}/run-patch`)

ws?.subscribe(channel.value, (data) => {
  // Find matching run in list and apply patch; refresh list if unknown run
})
```

**Processing config** — subscribes to config patches applied server-side:
```ts
const ws = useWS('/processings/api/')

ws?.subscribe(`processings/${processingId}/patch-config`, () => {
  // Re-fetch the entire processing to reflect server-side config changes
})
```

---

## Patterns Summary

| Aspect | Events | Processings |
|--------|--------|-------------|
| Channel scheme | `user:{id}:notifications` | `processings/{id}/{event-type}` |
| Auth strategy | Match user ID from channel | Load resource, check permission profile |
| Emitting process | API (notification service) | Worker + task child process + API (kill) |
| Sub-channels | Single per user | Multiple per resource (run-patch, run-log, patch-config) |
| Client reaction | Re-fetch list | Granular: apply patch / append log / re-fetch |
