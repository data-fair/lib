# How old configurations break, per application and version

One file on purpose: a campaign usually touches several applications at once, the same
handful of patterns comes back in every one of them (first section), and most per-app
sections are a few lines. Jump to the application with the index of `SKILL.md`.

How to read it:

- **Checked on** names the git tags whose `config-schema.json` were compared (repository
  path `public/config-schema.json`, `static/config-schema.json` before the Vite migration).
  A later patch can change a default or fix a bug: re-diff from the last tag named here.
- **Observed** marks what comes from comparing real upgraded applications side by side, not
  from the schema (rendering, runtime behaviour). Treat it as "check it is still true".
- `convert.py <name>` is the converter of `scripts/convert.py` that applies the transformation.
- Current-version traps (what a fresh configuration must contain, whatever its history) are
  in `data-fair-app-dashboard` → `references/sub-apps.md`. They are not repeated here.

## Patterns that come back across applications

1. **Field object → field key.** vjsf 2 schemas (`x-fromUrl` + `x-itemKey: 'key'` on a
   `type: 'object'`) stored the whole column object; json-layout schemas (`layout.getItems`
   on a `type: 'string'`) want the key. Symptom: "must be string", "references an unknown
   field {…}". Replace every such value by its `.key`, including inside arrays. Some apps keep
   `{ key, label }` objects for a few properties: follow the target schema, property by property.
2. **Dataset references with `additionalProperties: false`.** Data Fair enriches dataset
   references on read (`slug`, `finalizedAt`, `schema`, `bbox`…); PUT back as is, a strict
   schema refuses them (in the form: an error triangle without message). Keep only what the
   target schema lists. The opposite also exists: an app that *requires* the stored `schema`.
3. **A flag absent from a `oneOf` branch reads as `false`.** The runtime tests truthiness:
   an unset `enableCategory`-style switch selects the "without" branch.
4. **A new option whose default changes the rendering.** Diff the defaults, not only the keys:
   a configuration that relied on an implicit behaviour silently gets the new default.
5. **Settings moved between levels** (element → root, root → per-series): the old key stays
   in the configuration, unread, without error.
6. **Enum vocabulary renamed** (CSS class names, palette names): map by the form labels, and
   say that the rendering is close, not identical.
7. **Numeric scale changed** (1–10 → 0–100): the old value validates and renders wrong.
8. **`bbox` → `center` + `zoom`.** Several map apps dropped the initial bbox for an explicit
   view. `convert.py` computes a Mercator fit for an 800 × 800 px map; the right size is the
   map area of the embedding frame (a zoom computed for a 1000 px map opens ~0.3 level
   tighter). Without any view, maps fit their data or their contours: national data with
   overseas territories frames the Atlantic.
9. **Server-side sorting or colour assignment changed**: same series, other order, so palette
   colours move. Not a schema change: compare the renderings.
10. **Option removed without equivalent**: not a conversion, a reason not to upgrade
    (`SKILL.md`, rule 5). A key present with its default value (`false`, empty array) is not
    a use of the option.

## app-charts

Repository `app-charts`, npm `@data-fair/app-charts`, served from jsDelivr
`https://cdn.jsdelivr.net/npm/@data-fair/app-charts@<major.minor>/dist/`. The older
`@koumoul/data-fair-charts` 0.x has another configuration shape (no `chart` key): rebuild,
do not convert.

Checked on v1.1.15, v1.2.24, v1.3.9, v1.4.0, v1.4.13. `convert.py app-charts`.

**1.2 → 1.3** is the breaking step (`feat: schema is now vjsf3 & do not store fields as
object`); **1.3 → 1.4** reads 1.3 configurations unchanged.

- `dynamicFilters` (selector inside the chart) exists in 1.1 only, removed in 1.2: **do not
  upgrade** a chart that has one; filtering moved to the portal page or the dashboard.
- Every field object → key (pattern 1): `labelsField`, `groupsField`, `categoriesField`,
  `groupBy.field`, `valueCalc.field`, `valuesFields[]`, `valuesCalc[]`,
  `staticFilters[].field`.
- `sortBy` → `rowSortBy` (`rows*` data types) or `aggSortBy` (aggregations).
- `colors` → `colorOrder`: `{ type: 'palette', name, offset }`, or
  `{ type: 'manual', entries: [{ key, color }], defaultColor }` from the old `styles[]`.
- Root `divider: N` (number) → `multiplier: 1/N`; `divider: 1` dropped. In 1.4 `divider` is
  an object inside each data source (see sub-apps.md).
- Removed: `chart.categorizable`, `datasets[].slug` (pattern 2: 1.4 dataset references
  accept `href`, `title`, `id`, `schema`, `finalizedAt`).
- `groupBy.type: 'value'` wants `interval: ''`.
- Labels: 1.1/1.2 stored the field objects with their `x-labels`; 1.3+ reads labels from the
  live dataset schema (then `valueLabels`, added in 1.4.6). When the dataset lost its labels,
  keep the stored ones as root `valueLabels` (the converter does it).
- **y axis**: 1.1 drew stacked charts from 0 by itself; 1.4 sets `beginAtZero` only from
  `chart.yAxisStartsZero` (`useChartOptions.ts`). A stacked chart upgraded without it starts
  wherever Chart.js decides and the bottom layer looks smallest. Set
  `chart.yAxisStartsZero: true` when the original started at 0.
- Fixed in 1.4.3 (`fix: sort on labels`): sorting by label was numeric-wrong in 1.4.0–1.4.2.
  Target ≥ 1.4.3.
- Observed (1.1 → 1.4): numbers in French format; legend values take the column's labels
  (raw `Gold` becomes `Or`); series can come in another order, so palette colours swap (men
  and women on an age pyramid). When the meaning depends on the colour, pin a manual
  `colorOrder` with the old colours: `chroma.scale(name).mode('lch').colors(12)[offset + i]`
  (`seriesOrder` only applies to `categoriesField` series). Compare the stacked mode too
  (`Empiler` toggle, `?stacked=true`). Months named "août, avril…" sorted alphabetically in
  1.1 sort by label in 1.4: a seasonality curve changes shape with the same totals.
- A chart broken in production (unknown column, deleted dataset) is not an upgrade: repair the
  copy when the column was only renamed, report the rest.

## app-catalog (was list-details)

Repository `app-catalog`; package and deployment `list-details` up to 1.6, `app-catalog` from
1.7. Same lineage (same configuration).

Checked on v1.4.13, v1.6.5, v1.6.6, v1.7.0, v1.7.5. No converter: 1.4–1.6 configurations
validate against 1.7.5 unchanged.

- `details.previewAlwaysVisible` (detail shown beside the list) last exists in 1.6.5, removed
  in 1.6.6: **do not upgrade** a configuration with `previewAlwaysVisible: true`.
- Default palette `Accent` (≤ 1.6) → `Dark2` (1.7): changes every configuration that relied
  on the default.
- Observed (1.4–1.6 → 1.7): denser grid (more columns and cards per page, so the 10 000
  results pagination cap is reached on fewer pages); French date filters with labelled
  start / end fields; "1 résultat" singular; booleans "Non" instead of `false`; named links
  ("Page associée - Nouvelle fenêtre"); address radius field prefilled with 1; filters folded
  behind a chevron on cards; column labels instead of keys; Markdown links rendered.

## app-dashboards

Repository `app-dashboards`, npm `@data-fair/app-dashboards`, served from jsDelivr.

Checked on v0.3.8, v0.11.8, v1.0.12, v1.1.0, v1.1.3.

- **0.3 → 1.x: rebuild, not upgrade.** 0.3 has one selector at the root (`labelField`) and a
  `concept` per element; 1.x filters come from a root dataset (`filters`, `staticFilters`,
  `periodFilter`).
- **0.11 → 1.1**: configurations validate unchanged. Observed: blocks kept, more compact
  period selector, some rows get one more column.
- **1.0 → 1.1** (`feat(filters)!: remplacer propagation/ignoreFilters par syncParams`):
  `propagation` and `ignoreFilters` are no longer read; elements take `syncParams`
  (`shared-filters` default, `sandboxed`, `none`), and an element **always** receives the
  dashboard filters. `ignoreFilters: true` has no equivalent: **do not upgrade** such a
  dashboard. Without it the configuration passes unchanged.
- Sub-applications are fragments (`partOf`) referenced in `sections[].rows[].elements[]`:
  upgrade them on their own. A fragment promoted in place keeps its id, the dashboard keeps
  finding it.

## atelier-carto (app-multilayer-map)

Repository `app-multilayer-map`, deployment `atelier-carto`.

Checked on v1.2.18, v1.7.24, v1.8.0, v1.8.9. `convert.py atelier-carto`.

**≤ 1.7 → 1.8** (`feat: no more config with bbox, it's center & zoom`, TS + Vuetify 4 rewrite):

- `layers[].opacity` scale 1–10 (default 10) → 0–100 (default 100): a stored `10` renders at
  10 % without error. Multiply by 10.
- Root `bbox` → `center { lat, lon }` + `zoom` (pattern 8).
- Pattern 2: root `datasets[]` accept `href`, `title`, `id`, `schema`, `bbox`,
  `attachmentsAsImage`; `layers[].dataset` only `href`, `title`, `id`. The `slug` and
  `finalizedAt` added on read are refused.
- Label shape (`shapes.type: 'label'`): `radius` → `cornerRadius`, `scale` → `textSize`
  (same 8–24 range).
- `selectionColor` (default `#AA2222`) does not exist in 1.2. Observed: without it every
  layer style is rejected (`fill-color[2]: 'undefined'` in the console) and no layer renders;
  set it explicitly.
- `layers[].uuid` does not exist in 1.2: layers without one no longer answer clicks. Add one
  per layer (unique: map layers are named `layer_<uuid>`).
- `useDataBbox` (since 1.7) is honoured in 1.8 (fits the filtered data): `true` with national
  data frames the world. Prefer `false` with an explicit view.
- Observed: an `enum` colour without a `valuesColor` entry for every value shows no marker
  (the default marker image is never generated). `valuesColor` lives in `colors.enumOptions`.

## infos-territoires (app-choropleth-map)

Repository `app-choropleth-map`, deployment `infos-territoires` (« Carte choroplèthe »).

Checked on v1.1.45, v1.2.0, v1.2.8. `convert.py infos-territoires`.

- `indicators[].divider`: number (default 1) in 1.1 → object `{ type: 'none' | 'metric', … }`
  in 1.2. `1` → `{ type: 'none' }`; any other constant needs a hand decision.
- Root `bbox` → `center` + `zoom`; observed: 1.2 ignores `bbox` and fits the shapes.

## admin-divs-catchment (app-catchment-map)

Repository `app-catchment-map`, deployment `admin-divs-catchment`. Not the same application
as `admin-divs-levels` or `infos-territoires`, whatever the titles say.

Checked on v0.1.19, v1.0.0, v1.0.1. `convert.py admin-divs-catchment --contours <href>`.

- 1.0 draws contours from a Data Fair dataset served as vector tiles: set `contoursDataset`
  (with its `schema`, used to find the code column of the concept of `codeField`, e.g. a
  communes contours dataset for `codeCommune`). 0.1 used an implicit geo service.
- Root `bbox` → `center` + `zoom`; without a view 1.0 fits contours that include overseas
  territories.
- Observed: the rendering is less detailed than 0.1, and the interface poorer: show it to the
  owner before promoting.

## infos-parcelles (app-parcels-map)

Repository `app-parcels-map`, package `info-parcelles`, deployment `infos-parcelles`.

Checked on v2.5.8, v2.7.3, v2.8.0, v2.8.15, v2.10.0, v2.10.2 (no 2.9 tag). `convert.py infos-parcelles`.

- 3D view (`heightField`, `baseField`) removed in **2.8.0** (2022-07): **do not upgrade** a
  configuration that uses it.
- **2.8 → 2.10**: `initialBounds` → `center` + `zoom`; `datasets[].schema` is in the 2.10
  schema and read at run time (parcel id column from `config.datasets[0].schema`): store it
  (the converter fetches `<href>/schema`; re-PUTting a configuration read through the API
  also works, Data Fair enriches it on read).

## metrics (app-indicators)

Repository `app-indicators`, package `data-fair-metrics`, deployment `metrics`.

Checked on v1.3.11, v1.4.6, v1.5.1, v1.6.0, v1.6.11. `convert.py metrics`.

- **≤ 1.3 → 1.4**: `display`, `width`, `padding` move from each metric to the root.
- **1.5 → 1.6**: `label.size` / `value.size` Vuetify classes → Material 3 type scale, by form
  label: `h6` → `body-large` (très petit), `h5` → `title-large`, `h4` → `headline-small`
  (moyen, default), `h3` → `headline-medium`, `h2` → `display-small` (très grand). Close,
  not identical.
- The dataset reference of a metric is `metrics[].value.numerator.dataset` (1.5 and 1.6), not
  a `dataset` on the metric: a reference injected one level too high validates and fails at
  run time.

## periodic-series (app-periodic-series)

Repository `app-periodic-series`, deployment `periodic-series`.

Checked on v0.2.0, v1.0.0, v1.0.1. `convert.py periodic-series`.

**0.2 → 1.0** is a rewrite. 1.0 still renders a 0.2 configuration, wrongly:

- `filters` are dropped (1.0 reads `staticFilters`, field as `{ key, label }`);
- `categoryField` object is passed as a column name (pattern 1);
- the date column is only found through the `http://schema.org/Date` concept, where 0.2 also
  tried `endDate` then `startDate`: set `dateField` explicitly;
- `chart.period` → root `period`; `metric.valueField` (object) → `metric.field` (key).

Target ≥ 1.0.1. Observed on 1.0.0 and fixed in 1.0.1: the partial first week of a year drawn
at the end of the curve (vertical drop in December), month labels overlapping on narrow
charts, radar (`period: day`) wrong. Visible changes: autoplay, every cycle drawn and coloured
by value, 24 h radar dial.

## app-treemap

Repository and deployment `app-treemap`.

Checked on v0.3.4, v1.0.6, v1.1.4, v1.3.0, v1.3.9. `convert.py app-treemap`.

- Seeded `hash` colours (`color.type: 'hash'`) exist up to 0.3, removed in 1.0
  (`feat: can configure colors from categories with palette, no more seed color`). Closest:
  `{ type: 'computed', colorField: <first agg>, colors: { type: 'computed', name: <palette> } }`;
  colours change.
- **1.1 → 1.3**: `aggs[]` field objects → keys (pattern 1).

## data-fair-proportions (app-waffle-chart)

Repository `app-waffle-chart`, deployment `data-fair-proportions`.

Checked on v0.2.6, v0.3.3, v1.0.6, v1.1.3, v1.2.8.

- **0.2 → 0.3**: `valueField` object → key (pattern 1).
- **1.1 → 1.2**: a root `title` appears (1.1 had none). Observed on 1.2 (2026-10): the title
  shown before is lost and the legend shows raw codes instead of the column's `x-labels`.
  v1.2.8's code reads `x-labels` from the field: re-check on the served patch before
  deciding, and set `title` explicitly.

## timelines-chart (app-gantt-chart)

Repository `app-gantt-chart`, deployment `timelines-chart` (the publication path kept the old
name). Not the same application as the `app-timelines` repository.

Checked on v1.0.2, v1.1.0, v1.1.2.

- `enableCategory` selects between two `oneOf` branches (`const: false` / `const: true`); the
  code tests truthiness, so an unset flag means "no categories" (pattern 3).
- Observed on 1.1: an empty line label shows as the text `undefined` (lines are grouped by
  label as object keys). Not fixable by configuration: report it.

## app-relations-network

Repository and deployment `app-relations-network`.

Checked on v0.2.3, v1.0.0, v1.0.3.

- **0.2 → 1.0**: per node type `labelsDisplay` (`hover` default, `always`, `never`): labels
  that were always visible disappear until hover; set `always` to keep the old rendering.
  `icon` (an icon dataset line in 0.2) becomes `{ name, svg, svgPath }`: add `svgPath`.

## Transparent upgrades (checked, no conversion)

The original configurations validated against the target schema and rendered the same, apart
from the application's own redesign:

- `app-calendar` 1.2 → 1.3 (v1.3.9): observed, the month view is redone (days with "N de
  plus").
- `sunburst` (repository `app-sunburst`) 0.3 / 0.4 → 1.0 (v1.0.4).
- `admin-divs-levels` 0.3 / 1.0 → 1.1 (observed; repository not checked).
