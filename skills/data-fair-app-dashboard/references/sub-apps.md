# Sub-applications: capabilities, required keys, traps

Versions below are the ones observed on opendata.koumoul.com on 2026-10-02
(`GET /data-fair/api/v1/base-applications?size=200`). Base-apps move: re-read their metas
and published schema for the version you embed, and treat every "trap" as "verify it is
still true", not as a permanent fact. Each trap names the version it was read on (code
or published schema).

These traps hold for a configuration written today. How a configuration written for an
older version breaks when its application moves to a newer one is in the
`data-fair-app-upgrades` skill (`references/breaking-changes.md`).

## Which visualisation for which question

| The reader wants… | Base-app (title on the portal) | Notes |
|---|---|---|
| Key figures, shares, rates | `metrics` 1.6 (Indicateurs clés) | Several datasets per instance; cross-dataset ratios; auto height |
| Bars, lines, pies, pyramid | `app-charts` 1.4 (Graphiques) | The workhorse; fixed height |
| Evolution over time | `app-charts` (line) or `data-fair-series` 1.0 | Needs a real time series (≥ 3 vintages) |
| Map with several layers | `atelier-carto` 1.8 (Carte multicouche) | Fixed height 700 |
| Points, lines, polygons with filters and a detail card | `carto-explore` 1.0 (Cartographie) | Classified colours (`equals` / `quantiles` / manual), ColorBrewer palettes |
| Choropleth by territory | `infos-territoires` 1.2 (Carte choroplèthe) | Under a commune filter it shows one polygon: filter at the level above |
| Hierarchy (NAF sectors…) | `app-treemap` 1.3, `sunburst` 1.0 | |
| Flows between categories | `sankey` 1.6 | Follows the filter since 1.6 |
| Proportions grid | `data-fair-proportions` 1.2 (gaufre) | Follows the filter |
| Directory with search + detail card, one entity's card | `app-catalog` 1.7 (Catalogue, « Liste et fiches »; published as `list-details` up to 1.6) | Auto height |
| Dense or aggregated table | `data-fair-table` 1.0 (Tableau agrégé), `app-table` 1.0, or a `tablePreview` element | `tablePreview` is native and always filtered |
| Agenda | `app-calendar` 1.3 | See traps |
| Ranking over time, animated | `bar-chart-race` 1.0 | |
| Multi-criteria profile | `data-fair-radar` 1.0 | No filter-concepts: use with `ignoreFilters` only |
| Public contributions with moderation | `contribs` 1.1 (`app-contribs`, Saisie collaborative) | |
| Add-only form | `app-form` 1.0 (Formulaire de saisie), or a `form` element | No filter-concepts |
| Document kiosk (folders, versions) | `app-documents` 1.0 (GED) | No filter-concepts |
| Transit network, real time | `app-gtfs-map` 1.0 (Carte temps réel GTFS) | |

For anything not listed, the base-app catalogue of the portal is authoritative. A
dashboard can also embed another dashboard (`app-dashboards`) as one block.

## Metas that decide whether a block follows the filter

| Meta | Meaning for the dashboard |
|---|---|
| `df:filter-concepts: true` | The app reads `_c_*` keys: it can follow a filter on another dataset sharing the concept |
| `df:sync-state: true` | The app keeps its state in its URL; needed for the d-frame to pass filters |
| `df:overflow: true` | The app reports its own height: use row height `-1`. `false`: fixed height in px |

Not declaring `df:filter-concepts` (radar, networks, games) means the block never follows
the territory filter. Declaring it is **not proof** that it does (below).

## Known traps by app

### app-charts 1.4

Read on 1.4.13.

- `staticFilters[].field` is a column key (string) in 1.3 and 1.4; only 1.4.5 and 1.4.6
  wanted `{key, label}`. The runtime accepts both, the config form rejects the object.
- `divider` is `{type: 'none' | 'groupCount' | 'totalCount' | 'column'}`; shares weighted
  correctly: `column` with `field` + `metric` (sum of A / sum of B per group). A numeric
  `"divider": 1` left by 1.2 configs is read as no divider.
  Wide Insee files (one column per category): `aggsBased` charts with
  `aggsBasedCategories` / `aggsBasedLabels` instead of reshaping the dataset.
- `aggSortBy: 'value'` sorts the aggregated value **before** the `divider`: a ranking of
  rates comes out in the order of the numerators. Pre-compute the rate in the dataset, or
  use `metrics`.
- `aggSortBy: 'label'` sorts the displayed labels (`valueLabels` since 1.4.6, else the
  dataset `x-labels`, else the raw value) in natural order, numbers as numbers. An order
  that is neither (age bands "Moins de 15 ans", "15-29 ans"…) needs labels that sort.
- `colorOrder` accepts only `{type: 'palette', name: 'Set2', offset: 0, seriesOrder: []}` or
  `manual`; `{type: 'theme'}` silently paints every series grey `#828282`.
- A single-colour series is `color: {type: 'custom', hexValue: '#…'}` or
  `{type: 'theme', strValue: 'primary'}`; the `metrics` shape `{type: 'manual', value}`
  is not read and the series loses its colour.
- `objectifFields` (since 1.4.11, `aggsBasedLabels` charts only) draws one dashed line per
  target column at the **average** of that column: a constant target, not a yearly
  trajectory. A trajectory is a series of its own.
- No axis bound key (no `xAxisMax`): a projection up to a horizon needs the horizon rows in
  the dataset.
- Histogram: `groupBy: {type: 'number', field, interval}`; each bar is labelled by the lower
  bound of its class: give the interval in the title or the description.
- Predefined filters go in `staticFilters` (sent as `_in`, `_nin`… parameters); a `qsFilter`
  key is not read.
- `disableDynamicStack: true` hides the "Empiler" toggle of `multi-bar` / `multi-line`;
  `stacked: true` sets the default.
- 1.3 sorted numeric aggregations lexicographically (`10` before `2`); 1.2 did not. Check
  the order of any numeric axis that is not 4-digit years.
- `labelsMaxWidth` is in characters; out of range it has no effect.

### metrics 1.6

Read on 1.6.11 (repository `app-indicators`).

- One instance can hold several datasets; each indicator picks its own
  (`value.numerator.dataset`). `value.divider: {type: 'metric', …}` with its own dataset
  gives a **cross-dataset ratio** (creation rate per 1,000 inhabitants = Side.total /
  population.total × 1000).
- `divider.metric.value` is a single field: no `a / (b + c)` (unemployment rate). The
  divider is `metric` or `const` only: a difference A − B (balance, net) is pre-computed
  in the dataset.
- `value.divider` defaults to `{type: 'const'}` in the form only: write it explicitly
  (`{type: 'const'}` = divide by 1) or the card renders blank.
- Value types in the 1.6 schema: `nbValues` (line count), `value` (one column of the first
  row), `nbDistinctValues`, `duplicateValuesRatio`, and `avg`, `sum`, `min`, `max` on a
  field. No median, percentile, stdDev (400 on the API).
- `value` reads the first row in `sortField` order, `sortOrder` defaulting to `asc` in the
  form only: write `sortOrder: 'desc'` on the year column for the latest vintage, or the
  card shows the oldest.
- `timeField` turns a figure into an evolution (chip / sparkline): needs ≥ 2 vintages.
- `value.numerator.evolutionNegative: true` when a rise is bad (unemployment, poverty):
  without it a rise shows green. Only read with a `timeField`.
- The sparkline takes the colour of `value.color` (the `sparkline` block sets fill, height,
  line width and, with `fill: false`, a gradient). On a card filled by the global `color`,
  a `value.color` of the same colour hides figure and line: use a contrasting
  `{type: 'manual', value: '#FFFFFF'}`.
- `label.size` / `value.size` take five tokens (`body-large`, `title-large`,
  `headline-small` default, `headline-medium`, `display-small`), no arbitrary size.

### atelier-carto 1.8

Read on 1.8.9 (repository `app-multilayer-map`).

- `datasets` is required **in addition to** `layers`: entries `{ href, id, title }` plus optional
  `schema`, `bbox`, `attachmentsAsImage` (`additionalProperties: false`: `slug` or `finalizedAt`
  are refused); `layers[].dataset` takes only `{ href, id, title }`. Empty `datasets` = no request,
  map never starts, no console error.
- `staticFilters[].field` is `{key}`.
- Leave `category` / `subcategory` empty on layers: the legend's category node has no layer
  ids, a click on it throws and layer toggling stops working.
- Every layer needs its own `uuid` (map layers are named `layer_<uuid>`): a layer copied by
  API with the same uuid collides ("already exists" in the console) and is not drawn. The
  form's copy regenerates it.
- Without `center {lon, lat}` + `zoom`, the map boots on the datasets' bbox. A national
  bbox includes overseas territories: the view opens on the Atlantic and layers with a
  `minZoom` show "Niveau de zoom insuffisant"; with no `bbox` at all, the whole world. Set them (metropolitan France ≈ lon 2.5,
  lat 46.6, zoom 5); `useDataBbox` only refits at boot when a data filter is active.
- If the filters return no feature, the map stays dead (no recenter).
- Satellite toggle invisible in dark theme.

### infos-territoires 1.2

Read on 1.2.8 (repository `app-choropleth-map`).

- Join: the `joinColumn` of the contours dataset (stored with its `x-concept`) is matched,
  by exact string, against the field of the indicator dataset that carries **the same
  concept**. Codes must be written alike on both sides (leading zeros `01`, `2A` / `2B`).
  An indicator dataset without that concept, or whose stored `schema` lacks it, leaves the
  map uncoloured with no error.
- Initial view: `center` + `zoom` when all three values are set, else the `bbox` of the
  contours dataset (whole France, overseas included). Set them for a stable view.
- Click to a page: `directLinkAccess: true` with an empty `linkTemplate` opens the contours
  dataset's column with the Web page concept (`https://schema.org/WebPage`); a
  `linkTemplate` (URI template on the feature properties) takes precedence.
- Its divider takes no filter: on a multi-vintage dataset, filter the vintage in the layer or
  it sums every census.
- Under a commune filter it shows one polygon. Filter at the département and colour the
  communes inside, or use a map without the filter.

### app-catalog 1.7

Read on 1.7.5. Published as `list-details` up to 1.6, which the anonymous
`GET /base-applications` of opendata.koumoul.com does not list.

- An `image` element on the attachment (`source: {type: 'links', field: 'attachmentPath'}`,
  `aspectRatio`, `display: 'contain'` to fit without cropping) shows the file only when the
  dataset has "attachments as images" (`attachmentsAsImage`) on; otherwise the raw relative
  path is used and the image is broken.
- In the detail card `render.type: 'all'` dumps every column; use `custom` with one
  `fields-values` per field (several fields in one element are concatenated without a
  separator), and the native `map-view` element for the position.
- The "Vignettes denses" rendering (`list-item`) crashed in production on 1.6.

### app-treemap 1.3

Without explicit `maxBoxes` (30) and `animationDelay` (8) it renders a strip of
overlapping text, HTTP 200, no error. `field` shape `{key, label}`. Tiles show the
dataset `x-labels` only since 1.3.9.

### sankey, data-fair-proportions

`sankey` 1.5 and early `data-fair-proportions` 1.2 builds declared
`df:filter-concepts: true` and ignored `_c_*`: the Sankey showed 28 M workers (France) for
Vannes (20,636), and `sankey` 1.5 did not resolve `x-labels` either. Fixed: `sankey` 1.6
and the `data-fair-proportions` 1.2 served today send `_c_*` and the static filters, and
`sankey` shows labels (network check on production, 2026-11). `data-fair-proportions` 1.0
and 1.1 are untested: upgrade an application still on them before embedding it. One icon
per value (`colors[].icon`, falling back on `display.icon`) needs `data-fair-proportions`
≥ 1.2.6.

### data-fair-table 1.0

Read on 1.0.6. Cells show the aggregated number as returned, without rounding: a sum can
display floating-point noise (`1234.5600000001`). Round in the dataset when it shows.

### app-calendar 1.3

Opens on the current month (archives look empty); `df:overflow: true` collapses it when
embedded with an auto height (give it a fixed height); "n more" jumps month instead of
expanding the day; 1.3.0 never received its configuration (use a later patch).

### contribs 1.1 (app-contribs)

Read on 1.1.1. `datasets[0]` is the target dataset, `datasets[1]` the contributions
dataset: its stored `schema` must hold `_owner`, `_ownerName`, `operation`, `target_id`,
`payload`, `attachmentPath` and `status`, or it is not used as the moderation queue. A
contribution goes `submitted` → `accepted` / `refused`; `deleteModeratedContribs: true`
deletes it once moderated instead of keeping it (personal data).

### app-form 1.0

Read on 1.0.2. Only creates lines (`POST /lines`), never edits: use `contribs` for
moderated changes. `df:filter-concepts: false`: embed with `ignoreFilters: true`.

### app-documents 1.0

Read on 1.0.2. Folders and file revisions stored as attachments of a dataset that has an
attachment column (concept `attachment`); folder navigation only, no search box.
`df:filter-concepts: false`: embed with `ignoreFilters: true`.

### app-gtfs-map 1.0

Read on 1.0.5. The source is the metadata dataset of a GTFS processing (type `metaOnly`,
at least 3 `relatedDatasets`); the form then appends the shapes, stops and stop-times
datasets to `datasets`. By API, write all four: an application shared by key only opens
the datasets listed in its `config.datasets`. The GTFS-RT feed is found in the metadata
dataset's `remoteFile` attachments.

**Reusing an existing application**: allowed and encouraged, as long as it is **public**,
its France total has been checked (a reused age pyramid without the commune-level filter
counted Paris / Lyon / Marseille twice) and its height is set from its `df:overflow`.
