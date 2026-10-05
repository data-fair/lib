---
name: data-fair-app-dashboard
description: >
  Use when building, configuring or reviewing a dashboard or an observatory made with the
  `@data-fair/app-dashboards` application (DashboardConfig: sections, rows, elements,
  filters, staticFilters, periodFilter, allowDuplicate) and its embedded sub-applications
  (app-charts, metrics, atelier-carto, list-details, app-treemap…), usually written through
  the data-fair API rather than the portal forms. Triggers: "tableau de bord",
  "dashboard", "observatoire", "portrait de territoire", "chiffres clés", "ma commune",
  "filtre territoire", "sélecteur de commune / EPCI / département", "mode comparaison",
  "app-dashboards", "sous-applications", "_c_codeCommune_in", "df:filter-concepts", a
  dashboard block that shows France-wide numbers while a territory is selected, blank
  cards or empty charts after an API write, a PATCH that silently disappeared.
---

# Data Fair dashboards and observatories (`@data-fair/app-dashboards` 1.0)

A dashboard is an application whose configuration assembles **other applications**
(and dataset previews, forms, text) into sections → rows → elements, under **one set of
filters taken from a root dataset**. It is today the only Data Fair object where one
territory filter really drives many visualisations at once, which makes it the engine of
every observatory built on the platform.

The aim of this skill is a **four-star observatory**: everything the best French
observatories do (Observatoire des territoires, TerriSTORY, OFGL, Mayenne, Centre-Val de
Loire, Dataeko), plus what none of them does well: honest filters, readable method and
verified numbers. The bar is in §1; the rest is how to reach it without the traps that
cost previous builds days.

Related skills: `data-fair-app` (developing a base-app, URL filter conventions in
`references/filters-url-convention.md`), `portals-pages` (the portal page that hosts the
dashboard), `data-fair-browse` (driving the platform from a browser, NHI identity).

## 1. The four-star bar

Score the design against this grid **before** writing any configuration, and again on the
rendered result. A three-star observatory ticks the first five; four stars needs all ten.

| # | Criterion | How with app-dashboards |
|---|---|---|
| 1 | **One territory selector drives every block**, at every scale the audience needs | Root dataset that carries all territory levels; one optional `filters[]` entry per level (region → département → EPCI → commune), `forceOneValue: false`; `startValue` on the default territory (§3) |
| 2 | **Reading path**: overview first, then one tab per theme | `sectionsGroup: 'tabs-button'` (2–6 sections); first section = key figures (`metrics`), then themes; block titles phrased as what the reader learns |
| 3 | **Map linked to the filter** | `atelier-carto` / `infos-territoires` with concept filters, fixed height (700 px) |
| 4 | **Comparison with a reference territory** | `allowDuplicate: true` (two columns, each with its own filters) and/or `ignoreFilters: true` blocks titled "France" / "Département" next to the filtered one |
| 5 | **Shareable state** | The dashboard keeps its filters in its URL: share the link |
| 6 | **Method next to every number**: definition, formula, vintage, source, limits | `description` of each sub-application (rendered as markdown) + `element.description: 'right'` or `'bottom'`; `showSources: true` |
| 7 | **Rates, not only counts** (per 1,000 inhabitants, shares) | `metrics` `value.divider` with `{type: 'metric'}` on another dataset (cross-dataset ratio) (`references/sub-apps.md`) |
| 8 | **Honest scale**: no block silently shows France while a territory is selected | Every dataset checked for the concept of every scale offered; blocks that cannot follow get a `text` warning, `ignoreFilters` + explicit title, or `valueMandatory` (§4) |
| 9 | **Numbers verified** against an independent source for one known territory | §6 checklist, network check that each iframe request carries the filter |
| 10 | **Readable by everyone**: anonymous access, dark theme, no grey series, export | All sub-apps public; palette colors; `tablePreview` for the underlying rows and their download |

What the platform cannot do yet, so do not promise it: text with live values inserted, an
automatic PDF portrait, a median (`avg`, `sum`, `min`, `max` only), a ratio whose
denominator is a sum of two columns, markdown in `config.description`,
`section.description` and `text` elements (rendered as plain text; only the
sub-application description renders markdown).

## 2. Workflow

1. **Frame**: the questions the observatory answers, the audience, the territories and
   scales, the reference territory, the vintages. Write it down; it decides the root
   dataset.
2. **Audit the data before designing** (§4). A design that skipped this lost 4 of its 14
   visualisations at build time.
3. **Reuse before creating**: list the applications that already exist on the portal on
   the same datasets (`GET /applications?dataset=<id>&size=100`). Only **public** ones
   can be embedded in a public dashboard, and check their France total first: a public
   age pyramid used by two dashboards counted Paris / Lyon / Marseille twice (71.3 M
   inhabitants instead of 67.8 M).
4. **Create the sub-applications**, one per block, each with its own description (method,
   source, vintage). Write every config key explicitly (§5, `references/api-recipes.md`).
5. **Create the dashboard** and PUT its configuration (`references/config.md`).
6. **Permissions**: dashboard and every sub-app readable anonymously when the observatory
   is public (`PUT /applications/<id>/permissions`, full array).
7. **Verify** (§6) at three widths, anonymous, light and dark.
8. **Host it**: a portals v2 page (skill `portals-pages`) with intro, how-to-read and the
   dashboard block in `syncParams: 'shared-filters'`. **One dashboard per page**: a page
   with one dashboard per tab forces the reader to re-enter the territory on every tab.

## 3. Territory filter recipes

The root dataset is `datasets[0]`; every dynamic filter is a field of it. The dashboard
sends each filter to embedded applications twice: `_d_<rootId>_<field>_<op>` and, when the
field carries a concept, `_c_<concept>_<op>`. Applications on **other datasets** only
follow through the `_c_*` key, so **the filter fields must carry concepts**
(`codeCommune`, `codeEPCI`, `codeDepartement`, `codeRegion`, `timePeriod`…).

**Multi-scale selector** (proven on "Territoire SIRENE" and the economic observatory):

```jsonc
"filters": [
  { "labelField": "nom_region",      "values": ["code_region"],      "multipleValues": true, "forceOneValue": false, "showAllValues": true },
  { "labelField": "nom_departement", "values": ["code_departement"], "multipleValues": true, "forceOneValue": false, "showAllValues": true },
  { "labelField": "nom_epci",        "values": ["code_epci"],        "multipleValues": true, "forceOneValue": false, "showAllValues": false },
  { "labelField": "nom_commune",     "values": ["code_commune"],     "multipleValues": true, "forceOneValue": false, "showAllValues": false, "startValue": "Vannes" }
]
```

- An empty filter emits nothing: no selection = national reading. Say so in the intro.
- `values` holds the **code** field (the one with the concept); `labelField` is what the
  reader sees. Never filter on a label (`city`): case differs between datasets
  (`VANNES` / `Vannes`) and emitting both returns zero rows.
- A good root dataset is a **territory reference**, not a thematic dataset that may miss
  communes. On Koumoul platforms: `communes-de-france` (35,005 rows, `code_*` / `nom_*`
  for commune, EPCI, département, région, plus arrondissement, bassin de vie, aire
  d'attraction, unité urbaine, zone d'emploi), or a dataset enriched with
  `_infos_commune`. `communes-de-france` also holds the 45 Paris / Lyon / Marseille
  arrondissements: exclude them with a root static filter (`nin` on their codes, or `in`
  on the communes), or the PLM cities appear twice.
- `periodFilter: true` only works on datasets whose period fields carry `startDate` /
  `endDate` concepts (`timePeriod`); a `time_period` string column does not count.
- Single-territory portal (one EPCI): one commune filter with `forceOneValue: true` and a
  `startValue`, like Grand Poitiers "Ma commune".

## 4. Data audit (before any design)

For every candidate dataset, from `GET /datasets/<id>`:

- **Concepts per scale**: which of `codeCommune`, `codeEPCI`, `codeDepartement`,
  `codeRegion` it carries (`schema[].x-concept.id`, which is what the API and the
  dashboard read; `x-refersTo` is the URI behind it). Cheapest test per scale:
  `GET /datasets/<id>/lines?size=0&_c_codeEPCI_in=<code>`: an ignored concept filter
  answers 200 with the national total and a `meta.hints` entry saying it was ignored.
  A dataset with only `codeCommune` shows France-wide figures under a département filter. Decide per block: restrict the
  scales, add a warning `text`, or `ignoreFilters` + "France" in the title.
- **Real vintages** (`timePeriod`, distinct values of the year field): do not plan a
  time series on a dataset with one vintage.
- **Aggregate rows** in long-format datasets (`_T` = "Total" modality): exclude them with
  a `staticFilters` `in` on the detail modalities or aggregations double the result.
- **Row grain**: DVF has one row per lot, not per sale (`nbDistinctValues` on
  `id_mutation`); outliers in prices need an `interval` static filter.
- **Mixed geographic levels**: Insee files often hold communes **and** Paris / Lyon /
  Marseille arrondissements (`nivgeo` = `COM` / `ARM`): without a static filter on
  `COM`, département 75 counts twice (4.2 M instead of 2.1 M). Same for rows that are
  département or France totals inside a commune file.
- **Dirty periods**: partial current year, typo years (2050–2099 in Sitadel), cancelled
  records: bound them with `interval` / `in` static filters.
- **Homonymous names**: commune names are not unique ("Saint-Denis"); a commune filter
  without a département selected sums every homonym. Prefer a label field that is unique
  (`Nom (dép.)`) or keep the département filter above the commune one.
- **Unweighted means**: an average of per-commune rates or rents over an EPCI is wrong;
  show such blocks only with `valueMandatory` on the commune filter, or compute the
  weighted ratio with `metrics` (sum / sum).
- **Labels**: coded columns without `x-labels` render as codes (`5`, `GU`, `OQ`); fix
  the dataset metadata, not the application.
- Never conclude a dataset is absent from one search: the API `q` search tolerates
  accents, but local filtering of titles does not ("valeurs foncieres" vs "foncières"),
  and titles vary (DVF, demandes de valeurs foncières, mutations).

Then for every **base-app** considered, read its metas (`GET /base-applications?size=100`,
or the `<meta>` of its `index.html` on jsdelivr): it must declare `df:filter-concepts`
**and** `df:sync-state` to follow the dashboard filter, and even then **verify on the
network** (`references/sub-apps.md` lists the ones that lie).

## 5. Rules that prevent silent failures

1. **Schema defaults are applied by the form only, never by the API.** Write every key
   of every config, discriminants included (`{type: 'const'}`, `maxBoxes`,
   `animationDelay`, `divider`). Missing keys give blank cards with no error.
2. **Read the published schema**, not the repository one:
   `https://cdn.jsdelivr.net/npm/@data-fair/<app>@<major.minor>/dist/config-schema.json`.
3. **`GET /applications/<id>/config` (alias `/configuration`) can come from cache.**
   Add `?_=<random>` to every read; writing back a stale body silently undoes the previous write.
4. **Heights**: `-1` (auto) for apps declaring `df:overflow: true` (`metrics`,
   `list-details`); fixed px for canvas / map apps (`app-charts` 420–520, map 700,
   101-row pyramid 820). A fixed height on an auto app creates an inner scroll.
5. **An `application` element carries the full base-app**: `baseApp {id, url, meta,
   datasetsFilters}` from `GET /applications/<id>/base-application`, not just its `url`,
   as the form stores it: the meta is how you (and the next agent) know whether the block
   can follow filters.
6. **Mirror what the form maintains**: `config.applications` = `[{id, title}]` of every
   embedded application, `config.datasets` = root dataset first (full entry: `id`,
   `href`, `title`, `slug`, `schema`, `finalizedAt`, `bbox`, `timePeriod`).
7. **Static filter `field` shape differs per app and version**: `metrics`, `list-details`,
   `app-treemap`, `app-charts` 1.4: `{key, label}`; `app-charts` 1.3: a string;
   `atelier-carto`: `{key}`. Copy the shape from the published schema of that version.
8. **Root static filters reach every block**: the dashboard sends them to each element,
   as `_c_<concept>_<op>` when the field carries a concept. A `staticFilters` entry on
   the root restricts the whole observatory (useful to drop arrondissements, a trap if
   meant for one block only: put block-specific filters in the sub-app). Exclusion is
   `nin` (normalised to `out` at runtime; recent schemas name it `out`).
9. **Permissions are a `PUT` of the full array**; a sub-app left `protected` shows "Cette
   application est protégée" inside a public dashboard.
10. Right after creation, open the dashboard by **id** (`/data-fair/app/<id>`): the slug
   route can serve a cached protection page.

## 6. Verification checklist

- [ ] Anonymous browser context: every block renders (no protection form, no 403 in the
      network panel).
- [ ] For each iframe, the data request carries the filter (`_c_codeCommune_in=…` or the
      `<field>_in` filter it translates to). "It displays" is not "it filters".
- [ ] One known territory checked against an independent source (Insee dossier complet,
      Observatoire des territoires): population, one rate, one count.
- [ ] Switch scale (commune → EPCI → département → none) and confirm every block changes
      or is explicitly marked as not following.
- [ ] Comparison mode: both columns filter independently.
- [ ] 500, 1100, 1920 px: no inner scroll, no horizontal overflow; dark theme readable,
      no grey-only series.
- [ ] Every sub-app has a description with definition, source link and vintage.
- [ ] `showSources` behaves (the bar does not overlap the next block).

## References

- `references/config.md`: full `DashboardConfig` anatomy for 1.0.11, element types,
  filter propagation channels, text rendering, a complete annotated example.
- `references/sub-apps.md`: per base-app capabilities, required keys and known traps
  (app-charts, metrics, atelier-carto, list-details, app-treemap, sankey, proportions,
  bar-chart-race, app-calendar, infos-territoires), and which visualisation answers which
  question.
- `references/api-recipes.md`: the API write cycle (create, configure, describe,
  permissions, re-read), dataset entry builder, and verification snippets.
