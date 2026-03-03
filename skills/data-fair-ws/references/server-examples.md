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

## Integration Testing with `WsClient`

### Processing plugin tests (`@data-fair/lib-processing-dev/tests-utils.ts`)

The processing-dev package uses `DataFairWsClient` to provide a WS client
in the test context. This is the canonical example of using ws-client for tests:

```ts
import { DataFairWsClient } from '@data-fair/lib-node/ws-client.js'

function wsInstance (config: ProcessingTestConfig, log: LogFunctions): DataFairWsClient {
  return new DataFairWsClient({
    url: config.dataFairUrl,
    apiKey: config.dataFairAPIKey,
    log,
    adminMode: config.adminMode,
    account: config.account
  })
}

// In the test context factory:
const processingContext = {
  ws: wsInstance(config, log),
  // ... other context fields
}

// Cleanup in afterAll:
processingContext.ws.close()
```

Processing plugins then use `ws.waitForJournal()` to wait for dataset indexing:

```ts
// Wait for the dataset to be fully indexed before asserting
await context.ws.waitForJournal(datasetId, 'finalize-end', 120000)
```

### Generic service integration test pattern

For testing any service's WS layer end-to-end:

```ts
import { WsClient } from '@data-fair/lib-node/ws-client.js'
import * as wsEmitter from '@data-fair/lib-node/ws-emitter.js'
import { describe, it, beforeAll, afterAll, expect } from 'vitest'

describe('websocket events', () => {
  let client: WsClient

  beforeAll(async () => {
    client = new WsClient({
      url: `http://localhost:${testPort}`,
      headers: { Cookie: authenticatedSessionCookie }
    })
  })

  afterAll(() => {
    client.close()
  })

  it('receives real-time updates on resource change', async () => {
    // 1. Start waiting BEFORE triggering the action
    const eventPromise = client.waitFor(
      'things/abc123/updates',
      (data) => data.status === 'completed',
      10000  // short timeout for tests
    )

    // 2. Trigger the server-side action that emits
    await axios.post(`http://localhost:${testPort}/api/things/abc123/process`)

    // 3. Await and assert the WS event
    const event = await eventPromise
    expect(event.status).toBe('completed')
  })

  it('rejects unauthorized channel subscriptions', async () => {
    const anonClient = new WsClient({
      url: `http://localhost:${testPort}`
    })
    try {
      await anonClient.subscribe('private/resource/updates')
      throw new Error('Expected subscribe to fail')
    } catch (err: any) {
      expect(err.message).toMatch(/Permission/)
    } finally {
      anonClient.close()
    }
  })

  it('can use apiKey authentication instead of cookies', async () => {
    const apiKeyClient = new WsClient({
      url: `http://localhost:${testPort}`,
      apiKey: testApiKey,
      adminMode: true,
      account: { type: 'organization', id: 'org1', name: 'Test Org' }
    })

    const eventPromise = apiKeyClient.waitFor(
      'org/org1/events',
      undefined,
      10000
    )

    await wsEmitter.emit('org/org1/events', { type: 'test' })

    const event = await eventPromise
    expect(event.type).toBe('test')

    apiKeyClient.close()
  })
})
```

**Key testing patterns:**
- Always `waitFor()` / `subscribe()` **before** the action that emits events.
- Use short timeouts (5–10s) in tests to fail fast on regressions.
- Pass `apiKey` + `adminMode` + `account` for API-key-based auth in tests
  (the server's `canSubscribe` receives these in the `message` parameter).
- Always `close()` clients in cleanup to prevent hanging test processes.

---

## Patterns Summary

| Aspect | Events | Processings | Integration Tests |
|--------|--------|-------------|-------------------|
| Channel scheme | `user:{id}:notifications` | `processings/{id}/{event-type}` | Service-specific |
| Auth strategy | Match user ID from channel | Load resource, check permission profile | apiKey + adminMode or cookies |
| Emitting process | API (notification service) | Worker + task child process + API (kill) | wsEmitter or API triggers |
| Sub-channels | Single per user | Multiple per resource (run-patch, run-log, patch-config) | As needed |
| Client type | `useWS` (Vue) | `useWS` (Vue) | `WsClient` / `DataFairWsClient` (Node.js) |
| Client reaction | Re-fetch list | Granular: apply patch / append log / re-fetch | Assert with `waitFor()` |
