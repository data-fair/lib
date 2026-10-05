# `DashboardConfig` reference (app-dashboards 1.0.11)

Source of truth: `src/config/index.ts` of `data-fair/app-dashboards` and the published
`https://cdn.jsdelivr.net/npm/@data-fair/app-dashboards@1.0/dist/config-schema.json`.
The `DASHBOARDS-AGENTS.md` file of that repository dates from 0.11 and is partly wrong
for 1.0 (markdown in `text`, filter channel of `application` elements).

## Anatomy

```text
DashboardConfig
├── title, titleStyle, description        description: plain text, line breaks collapsed
├── datasets[]                            [0] = root dataset, source of every dynamic filter
├── filters[]                             dynamic filters (selectors shown to the reader)
├── staticFilters[]                       hidden filters on the root dataset
├── periodFilter, addressFilter           global period (_c_date_match) / address (_c_geo_distance)
├── allowDuplicate                        comparison mode: two columns, independent filters
├── sectionsGroup                         accordion | tabs-tab | tabs-button | flow
├── sectionsTitleStyle
├── sections[]
│   ├── title, description, icon {name, svg, svgPath}
│   └── rows[] { height, elements[] }     height in px, -1 = auto
├── showSources                           action bar under each element (source links)
└── applications[]                        [{id, title}] of every embedded app (not in the schema: the form
                                          maintains it through set-config; mirror it when writing by API)
```

### Filters

```ts
interface DashboardFilter {
  labelField: string        // field shown in the selector
  values?: string[]         // field(s) holding the value actually filtered (the code)
  multipleValues?: boolean
  forceOneValue?: boolean   // false: the filter can stay empty (= no filtering)
  startValue?: string       // initial selection, matched on labelField
  showAllValues?: boolean   // list every value up front instead of search-as-you-type
  slider?: boolean          // numeric field rendered as a range slider
}
interface DashboardStaticFilter {
  type: 'in' | 'interval' | 'nin' | 'out' | 'starts' | 'exists' | 'notExists'  // nin = out (exclusion)
  field: string | { key: string }; values?: string[]; minValue?: string; maxValue?: string; value?: string
}
```

Dynamic filters take precedence over static filters on the same field (since 1.0.10).
Root static filters are sent to every element (concept key when the field has one).

### Elements

| `type` | Keys | Use |
|---|---|---|
| `application` | `application {id, title, href, baseApp {id, url, meta, datasetsFilters}}`, `source: 'root' \| 'external'`, `ignoreFilters`, `valueMandatory`, `mandatoryFilters[]`, `description: 'none' \| 'left' \| 'right' \| 'top' \| 'bottom'` | Any Data Fair application. `baseApp` is `GET /applications/<id>/base-application` reduced to those four keys |
| `tablePreview` | `source`, `dataset`, `fields[]`, `display: 'table' \| 'table-dense' \| 'list'`, `noInteractions`, `ignoreFilters`, `valueMandatory`, `mandatoryFilters[]` | The native dataset table, always filtered, with download |
| `text` | `content` | Plain text, line breaks kept, **no markdown** |
| `form` | `dataset`, `ignoreFilters` | Line-creation form on a REST dataset |
| `column` | `elements[]` | Stacks elements vertically in one cell (each child has its own `height`) |

Common keys: `title`, `width` (1 narrow, 2 medium, 3 wide; mix 1 + 2 on a row for 1/3 – 2/3),
`height` (inside a `column`).

- `source: 'external'` on an `application` whose dataset is not the root one: it still
  receives `_c_*` filters; it simply is not tied to the root dataset.
- `ignoreFilters: true`: no filter parameter at all is added to the element URL. Use it for
  national context blocks, and for apps without `df:filter-concepts`.
- `valueMandatory` + `mandatoryFilters: ['<labelField>', …]`: the block waits until
  **every** listed filter has a value instead of showing the whole country
  (portrait-only blocks). List one level only (the commune) unless all are needed.

## How filters reach the elements

| Element | URL | Filter keys sent |
|---|---|---|
| `application` | `/data-fair/app/<id>` | `_d_<rootId>_<field>_<op>` (comparison column prefix removed) **and** `_c_<concept>_<op>` for fields with a concept, plus `_c_date_match`, `_c_geo_distance` |
| `tablePreview`, `form` | `/data-fair/embed/dataset/<id>/table\|form` | `_d_<rootId>_<field>_<op>`, `_c_<concept>_<op>` mirrored for third-party datasets |

An application on another dataset follows only through `_c_*`, so it filters only if its
dataset carries the same concept **and** the app honours `_c_*`. The dashboard writes its
own state in its URL (`_d_<rootId>_*`, comparison columns prefixed), which is what makes
the link shareable and what a portals page in `syncParams: 'shared-filters'` relays.

## Where text renders how

| Place | Markdown | Line breaks |
|---|---|---|
| `config.description` | no | collapsed |
| `section.description` | no | collapsed |
| `text` element | no | kept |
| sub-application `description` (shown with `element.description`) | **yes** | yes |

So: one-sentence `config.description`; reading notes in a `text` element; method,
definitions and source links in each sub-application description, displayed with
`description: 'right'` (fixed-height rows) or `'bottom'`.

## Sections and layout

- `tabs-button` for 2–6 themes with short titles, `tabs-tab` when titles are long,
  `flow` for an editorial single page, `accordion` rarely (everything open is long).
- Give each section an MDI icon (`{name, svg, svgPath}`) and, in the first section, the
  key figures.
- Rows: several `width: 2` elements per row keep a tab within one or two screens;
  one `width: 3` element only for the map or a dominant chart.

## Complete example (multi-scale, comparison, method)

```jsonc
{
  "title": "Population et logement",
  "description": "Choisissez un territoire ; sans sélection, les chiffres portent sur la France.",
  "titleStyle": { "tag": "h1", "size": "h4", "center": false, "bold": true, "color": "primary", "line": { "position": "bottom-small", "color": "primary" } },
  "datasets": [ { "id": "<communes-ref-id>", "href": "https://<host>/data-fair/api/v1/datasets/<communes-ref-id>", "title": "Communes de France", "slug": "communes-de-france", "schema": [ /* full schema */ ], "finalizedAt": "<iso>", "bbox": [ -5.1, 41.3, 9.6, 51.1 ] } ],
  "filters": [
    { "labelField": "nom_region", "values": ["code_region"], "multipleValues": true, "forceOneValue": false, "showAllValues": true },
    { "labelField": "nom_departement", "values": ["code_departement"], "multipleValues": true, "forceOneValue": false, "showAllValues": true },
    { "labelField": "nom_epci", "values": ["code_epci"], "multipleValues": true, "forceOneValue": false, "showAllValues": false },
    { "labelField": "nom_commune", "values": ["code_commune"], "multipleValues": true, "forceOneValue": false, "showAllValues": false, "startValue": "Vannes" }
  ],
  "staticFilters": [],
  "periodFilter": false,
  "addressFilter": false,
  "allowDuplicate": true,
  "sectionsGroup": "tabs-button",
  "showSources": true,
  "sections": [
    { "title": "Vue d'ensemble", "icon": { "name": "view-dashboard", "svg": "<svg…>", "svgPath": "M…" },
      "rows": [
        { "height": -1, "elements": [ { "type": "application", "title": "Chiffres clés", "width": 3, "source": "external", "description": "none", "ignoreFilters": false, "valueMandatory": false, "application": { "id": "<metrics-id>", "title": "…", "href": "https://<host>/data-fair/api/v1/applications/<metrics-id>", "baseApp": { "id": "…", "url": "https://koumoul.com/apps/metrics/1.6/", "meta": { "df:overflow": "true", "df:filter-concepts": "true", "df:sync-state": "true" }, "datasetsFilters": [] } } } ] },
        { "height": 480, "elements": [
          { "type": "application", "title": "Comment évolue la population ?", "width": 2, "source": "external", "description": "right", "application": { /* app-charts line */ } },
          { "type": "application", "title": "Population en France (repère)", "width": 1, "source": "external", "ignoreFilters": true, "description": "none", "application": { /* same chart, national */ } }
        ] }
      ] },
    { "title": "Logement", "rows": [
      { "height": -1, "elements": [ { "type": "text", "content": "Les blocs suivants ne suivent que le filtre commune : au-dessus, ils affichent la France." } ] },
      { "height": 700, "elements": [ { "type": "application", "title": "Où sont les logements sociaux ?", "width": 3, "source": "external", "description": "none", "application": { /* atelier-carto */ } } ] }
    ] }
  ],
  "applications": [ { "id": "<metrics-id>", "title": "…" } /* every embedded app */ ]
}
```
