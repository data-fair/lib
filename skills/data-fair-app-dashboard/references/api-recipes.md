# API recipes

All calls go to `https://<host>/data-fair/api/v1`. Authenticate with an API key
(`x-apiKey` header, scope applications read/write on the target account or department)
or with a browser session (same-origin `fetch` from the host, or the NHI proxy: see skill
`data-fair-browse`). Create in a sandbox department, `protected`, and publish only when
asked.

## Write cycle

```js
const API = 'https://opendata.koumoul.com/data-fair/api/v1'
const H = { 'content-type': 'application/json', 'x-apiKey': process.env.DF_KEY }
const bust = () => `?_=${Math.random().toString(36).slice(2)}` // config reads can come from cache
const call = async (method, path, body) => {
  const res = await fetch(API + path, { method, headers: H, body: body && JSON.stringify(body) })
  if (!res.ok) throw new Error(`${method} ${path} ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

// 1. A full dataset entry, as the form stores it (needed in datasets[] of the dashboard,
//    of metrics, atelier-carto, list-details…).
const datasetEntry = async (id) => {
  const d = await call('GET', `/datasets/${id}${bust()}`)
  const e = { id: d.id, href: `${API}/datasets/${d.id}`, title: d.title, slug: d.slug, schema: d.schema }
  for (const k of ['finalizedAt', 'bbox', 'timePeriod', 'count', 'attachmentsAsImage']) if (d[k] != null) e[k] = d[k]
  return e
}

// 2. Create an application on a base-app, then write its whole configuration.
const createApp = async (baseAppUrl, title, config, description) => {
  const app = await call('POST', '/applications', { url: baseAppUrl, title, description })
  await call('PUT', `/applications/${app.id}/config`, config)
  return app
}

// 3. The element that embeds an application in the dashboard.
const appElement = async (id, extra) => {
  const app = await call('GET', `/applications/${id}`)
  const b = await call('GET', `/applications/${id}/base-application`)
  return {
    type: 'application', source: 'external', ignoreFilters: false, valueMandatory: false, description: 'none',
    ...extra,
    application: { id, title: app.title, href: `${API}/applications/${id}`,
      baseApp: { id: b.id, url: b.url, meta: b.meta, datasetsFilters: b.datasetsFilters } }
  }
}

// 4. Make it public: PUT the full array (PATCH = 404). Public = an entry without type/id.
const makePublic = (id) => call('PUT', `/applications/${id}/permissions`, [{ classes: ['list', 'read'] }])

// 5. Re-read what was really stored, never the local copy.
const readConfig = (id) => call('GET', `/applications/${id}/config${bust()}`)
```

- `PATCH /applications/<id>` changes `title`, `description`, `slug` (400 if the slug is
  taken: pick another, do not retry).
- To change one key of a config: read with the cache-buster, modify, `PUT` the whole
  body, read again. Never write back a body read without the cache-buster.
- Before deleting an application, check that no dashboard references it
  (`config.applications` of every dashboard of the account).
- `config.applications` of the dashboard: `[{id, title}]` of every `application`
  element, nested `column` children included.

## Discovery

| Need | Call |
|---|---|
| Base-apps installed and their metas | `GET /base-applications?size=200&select=title,url,meta,version` |
| Published config schema of a base-app | `GET <baseApp.url>config-schema.json` (or jsdelivr `@<major.minor>/dist/config-schema.json`) |
| Applications already built on a dataset | `GET /applications?dataset=<id>&size=100&select=title,url,visibility` |
| Datasets matching a theme | `GET /datasets?q=<words>&size=50&select=title,count,timePeriod` (try accent and no-accent spellings) |
| Concepts of a dataset | `GET /datasets/<id>` → `schema[].x-concept.id` (`codeCommune`, `codeEPCI`, `codeDepartement`, `codeRegion`, `startDate`, `endDate`…); test one with `lines?size=0&_c_<id>_in=<code>` and read `meta.hints` |
| Distinct values (vintages, modalities) | `GET /datasets/<id>/values/<field>?size=100` |
| Check a number | `GET /datasets/<id>/metric_agg?field=<f>&metric=sum&codeCommune_eq=<code>` (or the field's own filter) |

## Verification snippets

Anonymous rendering: open `https://<host>/data-fair/app/<dashboard-id>` (by id) in a
private context. In the network panel, every `/datasets/<id>/lines|values_agg|metric_agg`
request of every iframe must carry the territory filter. With a browser MCP, list the
requests and grep them:

```js
// in the dashboard page, after selecting a territory
performance.getEntriesByType('resource').map(r => r.name)
  .filter(u => /\/datasets\/[^/]+\/(lines|values_agg|metric_agg|geo_agg)/.test(u))
  .map(u => ({ url: u.split('?')[0].split('/datasets/')[1], filtered: /codeCommune|_c_|_eq=|_in=/.test(decodeURIComponent(u)) }))
```

(Iframes have their own performance timeline: run it inside each frame, or use the
browser MCP's network listing, which covers all frames.)
