# Sending events and notifications to the events service

Every service that tells users what happened (data-fair, portals, catalogs, processings, simple-directory,
customers, agents…) sends it the same way. Model to copy: `catalogs/api/src/imports/service.ts`.

## The queue

- `import eventsQueue from '@data-fair/lib-node/events-queue.js'`, the shared singleton.
- Started once at server (and worker) startup, unconditionally:
  `await eventsQueue.start({ eventsUrl: config.privateEventsUrl, eventsSecret: config.secretKeys.events })`.
  Without the url the queue is inactive and `pushEvent` does nothing, so call sites never check the config and
  never use an optional queue (`eventsQueue?.pushEvent`).
- `await eventsQueue.stop()` on shutdown, so the last events are sent.
- `pushEvent(event, sessionState)`: pass the session when a user triggered it, the queue fills `originator`.
  A process with no user sets `originator: { internalProcess: { id, title } }` itself.

## Topic keys are a contract

A subscription or a webhook stores a topic key prefix, and events matches every prefix of an event's key
(`a:b:c` matches subscriptions on `a`, `a:b` and `a:b:c`). Users' subscriptions are in the events database,
so **an existing key is never renamed**, even when it does not follow the shape below (portals sends
`pages:page-create:<id>`): renaming needs an upgrade script on the events database and on every UI that
subscribes.

New keys: `<service>:<resource>-<action>[:<resource id>]`, the resource and action in kebab-case, the id last
so that a subscription can target one resource or all of them.

## One emitter per resource, texts next to it

Each resource that sends events has one function, in the module that owns the resource, that builds every
event of that resource. Its texts are written right there, English first, both languages always:

```ts
const importTitles = {
  create: (title: string) => ({ en: `The import of the resource ${title} was created`, fr: `L'import de la ressource ${title} a été créé` }),
  delete: (title: string) => ({ en: `The import of the resource ${title} was deleted`, fr: `L'import de la ressource ${title} a été supprimé` })
}

export const sendImportEvent = (imp: Import, action: keyof typeof importTitles, sessionState?: SessionStateAuthenticated) => {
  eventsQueue.pushEvent({
    title: importTitles[action](imp.remoteResource.title || imp.remoteResource.id),
    topic: { key: `catalogs:import-${action}:${imp._id}` },
    sender: imp.owner,
    resource: { type: 'import', id: imp._id, title: imp.remoteResource.title }
  }, sessionState)
}
```

- No key table, no `{title}` interpolation helper, no unit test comparing keys, and no type of our own for the
  `{ en, fr }` objects: a parameter that receives a title or a body is typed `PushEvent['title']` /
  `PushEvent['body']` (from `@data-fair/lib-node/events-queue.js`).
- No text table shared between modules or packages (`shared/event-texts.ts`): when the api and the worker send
  the same event, the emitter lives in the package that sends it, or in `shared/` as a whole emitter, never as
  a list of texts.
- `title` is short and names the resource; `body` gives the details (`{ en, fr }` too). A text that comes from
  elsewhere (a remote error message, a user comment) goes in `body` as is.
- `resource.title` is the resource's own title, never a sentence ("Associated processing: …"): it is not
  translated.
- `visibility: 'private'` unless the event is meant for the public subscribers of a public resource.

## Exceptions

data-fair and simple-directory translate their API with locale files (`i18n.__`, `__all`): their events take
their texts from those files, like the rest of their messages. Do not move them to inline texts.

## Notifications to one user

`pushNotification` sends a notification to its `recipient` without any subscription (simple-directory tells an
invited user that they joined an organization). events has no language for that user, so the service sends a
single text in the language of the request (`__(req, …)`), never `{ en, fr }`.

## Subscribing from a UI

The UI that opens the events subscribe embed passes the topic keys and their titles in the session language,
from the component's `<i18n>` block. These titles are labels of a subscription ("Import failure"), not the
event titles.
