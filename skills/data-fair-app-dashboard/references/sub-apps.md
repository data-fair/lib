# Sub-applications: capabilities, required keys, traps

Versions below are the ones observed on opendata.koumoul.com on 2026-10-02
(`GET /data-fair/api/v1/base-applications?size=200`). Base-apps move: re-read their metas
and published schema for the version you embed, and treat every "trap" as "verify it is
still true", not as a permanent fact.

## Which visualisation for which question

| The reader wants… | Base-app (title on the portal) | Notes |
|---|---|---|
| Key figures, shares, rates | `metrics` 1.6 (Indicateurs clés) | Several datasets per instance; cross-dataset ratios; auto height |
| Bars, lines, pies, pyramid | `app-charts` 1.4 (Graphiques) | The workhorse; fixed height |
| Evolution over time | `app-charts` (line) or `data-fair-series` 1.0 | Needs a real time series (≥ 3 vintages) |
| Map with several layers | `atelier-carto` 1.8 (Carte multicouche) | Fixed height 700 |
| Choropleth by territory | `infos-territoires` 1.2 (Carte choroplèthe) | Under a commune filter it shows one polygon: filter at the level above |
| Hierarchy (NAF sectors…) | `app-treemap` 1.3, `sunburst` 1.0 | |
| Flows between categories | `sankey` 1.6 | See traps |
| Proportions grid | `data-fair-proportions` 1.2 (gaufre) | See traps |
| Directory with search + detail card | `list-details` (Liste et fiches), `app-catalog` 1.7 | Auto height |
| Dense or aggregated table | `data-fair-table` 1.0 (Tableau agrégé), `app-table` 1.0, or a `tablePreview` element | `tablePreview` is native and always filtered |
| Agenda | `app-calendar` 1.3 | See traps |
| Ranking over time, animated | `bar-chart-race` 1.0 | |
| Multi-criteria profile | `data-fair-radar` 1.0 | No filter-concepts: use with `ignoreFilters` only |

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

**sankey 1.5, data-fair-proportions 1.2** declared `df:filter-concepts: true` and ignored
`_c_*`: the Sankey showed 28 M workers (France) for Vannes (20,636). `sankey` 1.5 did not
resolve `x-labels` either (nodes read `5`, `GU`). Rebuilt in `app-charts`:
`pie`/`aggsBased` for shares, `multi-bar`/`aggsBased` with `groupBy` + `groupsField` for
category × category. Re-test `sankey` 1.6 on the network before using it.

**app-charts**
- `staticFilters[].field` is `{key, label}` in 1.4 (it was a string in 1.3).
- Shares weighted correctly: the `divider` of type `column` (sum of A / sum of B).
  Wide Insee files (one column per category): `aggsBased` charts with
  `aggsBasedCategories` / `aggsBasedLabels` instead of reshaping the dataset.
- `colorOrder` accepts only `{type: 'palette', name: 'Set2', offset: 0, seriesOrder: []}` or
  `manual`; `{type: 'theme'}` silently paints every series grey `#828282`.
- 1.3 sorted numeric aggregations lexicographically (`10` before `2`); 1.2 did not. Check
  the order of any numeric axis that is not 4-digit years.
- `labelsMaxWidth` is in characters; out of range it has no effect.

**metrics 1.6**
- One instance can hold several datasets; each indicator picks its own
  (`value.numerator.dataset`). `value.divider: {type: 'metric', …}` with its own dataset
  gives a **cross-dataset ratio** (creation rate per 1,000 inhabitants = Side.total /
  population.total × 1000).
- `divider.metric.value` is a single field: no `a / (b + c)` (unemployment rate).
- `value.divider` defaults to `{type: 'const'}` in the form only: write it explicitly
  (`{type: 'const'}` = divide by 1) or the card renders blank.
- Value types in the 1.6 schema: `nbValues` (line count), `nbDistinctValues`, and
  `avg`, `sum`, `min`, `max` on a field. No median, percentile, stdDev (400 on the API).
- `timeField` turns a figure into an evolution (chip / sparkline): needs ≥ 2 vintages.

**atelier-carto 1.8**
- `datasets` is required **in addition to** `layers`, with `bbox`, `finalizedAt` and
  `slug` per entry. Empty `datasets` = no request, map never starts, no console error.
- If the filters return no feature, the map stays dead (no recenter).
- Satellite toggle invisible in dark theme.
- `staticFilters[].field` is `{key}`.

**app-treemap 1.3**: without explicit `maxBoxes` (30) and `animationDelay` (8) it renders
a strip of overlapping text, HTTP 200, no error. `field` shape `{key, label}`.

**list-details**: not listed by the anonymous `GET /base-applications` on
opendata.koumoul.com (authenticated listing, or reuse an existing app's base-app). The "Vignettes denses" rendering crashed in production on 1.6. In the
detail card `render.type: 'all'` dumps every column; use `custom` with one
`fields-values` per field (several fields in one element are concatenated without a
separator), and the native `map-view` element for the position.

**app-calendar 1.3**: opens on the current month (archives look empty); `df:overflow:
true` collapses it when embedded with an auto height (give it a fixed height); "n more"
jumps month instead of expanding the day; 1.3.0 never received its configuration (use a
later patch).

**infos-territoires / choropleths**: its divider takes no filter: on a multi-vintage
dataset, filter the vintage in the layer or it sums every census. A choropleth under a
commune filter has one polygon. Filter at the département and colour the communes inside, or use a map without
the filter.

**Reusing an existing application**: allowed and encouraged (a public "pyramide des âges"
on another department works as-is), as long as it is **public** and its height is set
from its `df:overflow`.
