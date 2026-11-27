---
name: data-fair-app-upgrades
description: >
  Use when moving existing Data Fair applications (visualisations configured on a base
  application) from version X to version Y of their base application, one application or a
  whole campaign: finding the versions actually served, diffing config-schema.json across
  versions, converting old configurations, validating them against the target schema,
  building private copies, comparing renderings, promoting one at a time, rolling back.
  Includes the per-application catalogue of how old configurations break (app-charts,
  app-catalog / list-details, app-dashboards, atelier-carto, infos-territoires,
  admin-divs-catchment, infos-parcelles, metrics, periodic-series, app-treemap,
  data-fair-proportions, timelines-chart, app-relations-network) and converters. Triggers:
  "montée de version", "mettre à jour l'application", "migrer l'appli vers la 1.4", "passer
  en dernière version", "application en retard", "nouvelle version de la brique", "upgrade
  app-charts", "changer l'url de l'application de base", "copie [MAJ]", "urlDraft", a
  configuration refused after changing `url`, an upgraded application rendering blank,
  "must be string" / "references an unknown field" after an upgrade, "Valider" that
  reverted an upgrade.
---

# Upgrading Data Fair applications to a newer base application version

An application is a configuration (`GET/PUT /data-fair/api/v1/applications/<id>/configuration`)
read by a base application served at `application.url`
(`https://<host>/apps/<name>/<major.minor>/` or
`https://cdn.jsdelivr.net/npm/@data-fair/<pkg>@<major.minor>/dist/`). Upgrading means pointing
`url` at a newer version **and** giving it a configuration that version reads. A new minor
version almost never reads the old configuration unchanged, and when it does not, it rarely
says so: blank chart, lost colours, map that boots on the Atlantic, silently dropped filters.

This skill is the method and the catalogue of known breakages. It does not cover what a
configuration must contain at the current version whatever its history (→
`data-fair-app-dashboard`, `references/sub-apps.md`), how an application reads its
configuration (→ `data-fair-app`), or reading a json-layout schema (→ `vjsf`). Driving the
platform under a non-human identity is `data-fair-browse`.

## Rules

1. **Same lineage only.** An upgrade keeps the base application: a newer version of the same
   repository. A rename with the same configuration counts (`list-details` → `app-catalog`).
   Switching to an "equivalent" other application is a product decision, not an upgrade.
2. **Never patch a published application in place.** Build a private copy at the target
   version (title `[MAJ] <title>`), configured like the original, compare, then promote the
   validated configuration onto the original. The original keeps its id, slug, publication
   sites, permissions and the pages and dashboards that embed it.
3. **Back up before any write**: application, configuration, configuration draft and
   permissions of each original, in a file that is never overwritten. Rollback = `PATCH url`
   + `PUT configuration` from it.
4. **Promote one application at a time**, on the owner's explicit go, after you looked at
   both renderings yourself.
5. **Option removed without equivalent = do not upgrade.** The application stays on its
   version and the case is reported as a product decision (catalogue: `dynamicFilters` of
   app-charts 1.1, `previewAlwaysVisible` of list-details ≤ 1.6.5, `ignoreFilters` of
   app-dashboards 1.0, 3D view of infos-parcelles < 2.8). A key present with its default
   value is not a use.
6. **No colours pinned on the data.** When the new version assigns palette colours in another
   order, keep the palette (same name, same offset) and report the difference. Pin hex
   colours only when the original already did, or when the meaning depends on the colour
   (men / women) and the owner asks for it.
7. **Regressions are reported, not worked around silently**: a bug of the target version
   that a configuration cannot fix leaves the application on its version, with a ticket on
   the base application.
8. **No compatibility code in the application.** A new version may break old configurations:
   the conversion belongs to the upgrade, not to the application code (no reading or repairing
   of old configurations, no alias of a deprecated parameter). Two exceptions: old parameters of
   shared links (a link in circulation cannot be fixed by saving a configuration), and a
   compatibility whose removal would break silently (wrong values, lost permissions).
9. **Pace by batch.** Once the owner has validated a batch, prepare the next one without asking
   again (backups, copies, checks, then present it); promotion still waits for the explicit go.
   Bricks with only two or three applications to upgrade can share a batch.
10. **The agent's identity stays in one department.** Never ask for an admin identity at the
    root of the organization to see every department at once: move it from department to
    department between batches, and report the root-level applications to the owner instead.

## 1. Find the versions

- `GET /data-fair/api/v1/base-applications?privateAccess=<owner type>:<owner id>&size=1000`
  lists the **registered** versions only (and only those visible to that owner). A version
  missing from it may still be served: probe
  `https://<host>/apps/<name>/<major.minor>/config-schema.json` or
  `https://cdn.jsdelivr.net/npm/@data-fair/<pkg>@<major.minor>/dist/config-schema.json`
  before calling an application a dead end. jsDelivr resolves `@1.4` to the latest 1.4.x.
- A url answering 404 everywhere is not a late version but a broken application: redeploy
  the base application or unpublish.
- List the applications **with a session that sees them**:
  `GET /applications?owner=<type>:<id>[:<department>]&partOf=true,false&size=500&select=id,slug,title,url,urlDraft,status,visibility,partOf`.
  An anonymous listing misses private and protected applications, and `partOf` (dashboard
  fragments) are hidden from listings unless the parameter is given.
- Classify each application: up to date / simple bump (configuration read unchanged) /
  conversion / rebuild / option removed (rule 5) / broken in production (unknown column,
  deleted dataset: repair or report, not an upgrade).

### Repository, package and deployment names differ

| Repository | Deployment / package | Note |
|---|---|---|
| `app-charts` | `@data-fair/app-charts` (jsDelivr) | `@koumoul/data-fair-charts` 0.x: other shape, rebuild |
| `app-catalog` | `list-details` ≤ 1.6, `app-catalog` ≥ 1.7 | same lineage |
| `app-dashboards` | `@data-fair/app-dashboards` (jsDelivr) | |
| `app-multilayer-map` | `atelier-carto` | |
| `app-choropleth-map` | `infos-territoires` | |
| `app-catchment-map` | `admin-divs-catchment` | ≠ `admin-divs-levels` ≠ `infos-territoires` |
| `app-parcels-map` | `infos-parcelles` (package `info-parcelles`) | |
| `app-indicators` | `metrics` (package `data-fair-metrics`) | |
| `app-waffle-chart` | `data-fair-proportions` | |
| `app-gantt-chart` | `timelines-chart` | ≠ repository `app-timelines` |
| `app-periodic-series` | `periodic-series` | |
| `app-agg-table` | `data-fair-table` | |
| `app-explore-map` | `carto-explore` | |
| `app-time-series` | `data-fair-series` | |

The `name` of `package.json` and the publication path in the repository's README or CI give
the deployment name of any other one.

## 2. Diff the two versions

1. Read the base application's changelog between the two tags (`git log vA..vB`, the
   `feat!` / `BREAKING CHANGE` commits first): a blocker of a past campaign may be fixed
   since (app-charts label sort in 1.4.3).
2. Diff `config-schema.json` between the **last patch of each minor** (`git show
   vX.Y.Z:public/config-schema.json`; `static/` on pre-Vite versions), **in depth**: follow
   `$ref`, `allOf`, `oneOf` branches and `definitions` / `$defs`. A top-level comparison
   invents removals that only moved into an `allOf`, and misses the nested ones.
3. Diff the **defaults** too: a changed default changes every configuration that relied on it
   (app-catalog 1.7: palette `Accent` → `Dark2`).
4. Check the catalogue: [references/breaking-changes.md](references/breaking-changes.md). It
   opens with the ten patterns that come back across applications (field object → key,
   strict dataset references, `oneOf` flag absent = false, default that changes the
   rendering, settings moved, enum renamed, scale changed, `bbox` → `center`/`zoom`, order
   of series, option removed).

## 3. Convert and validate

```bash
# from the skill directory; input = {id: {application, configuration}} or {id: configuration}
python3 -I scripts/convert.py <app> <target base url or schema> backup.json conversion.json
python3 -I scripts/validate.py <config-schema.json file or url> backup.json|conversion.json [id ...]
```

- `convert.py` applies the transformations of the catalogue for app-charts, periodic-series,
  app-treemap, metrics, infos-parcelles, admin-divs-catchment (`--contours <dataset href>`),
  infos-territoires and atelier-carto, validates each result against the target schema
  (Draft 7 by default, `jsonschema` needed) and prints one line per application. Notes in
  capitals need a human decision; applications that must not be upgraded are printed `SKIP`
  and left out. Output: `[{ id, title, notes, errors, config }]`.
- **Validate every configuration**, converted or not. Test the validator on a configuration
  you know is broken first: some schemas accept almost anything.
- `valid` is necessary, not sufficient: a configuration can validate and render blank
  (reference injected one level too high, missing runtime key such as atelier-carto's
  `selectionColor`).
- Opening the configuration form and saving does **not** apply the new defaults; json-layout
  keeps "Valider" disabled until a value changes. Write the configuration by API.

## 4. Build the private copy

1. `POST /applications` with `{ url: <original url>, initFrom: { application: <id> }, title: '[MAJ] <title>', owner }`.
   `initFrom` needs the original's url and copies configuration, summary, description and
   attachments; the copy has no publication site and no public permission. `owner` needs its
   `name` (400 otherwise): reuse the original's. A department member only sees its
   department's resources: create the copy in the original's department.
2. `initFrom` does **not** mark the copy `configured`: `PATCH { url: <target>, urlDraft: '' }`
   then `PUT /configuration` with the converted configuration.
3. Re-read with `?nocache=<timestamp>`: `GET /applications/<id>/config` is served with
   `max-age=300` behind a cache; a read without it after a PUT shows the old configuration.
   Data Fair also enriches dataset references on read (`schema`, `slug`, `finalizedAt`):
   compare configurations without them.

## 5. Compare the renderings

Open original and copy side by side (same viewport, e.g. 1200 × 800) and look at both:

- charts: same series, colours, stacking (toggle the stacked mode), axes (does the y axis
  still start at 0?), labels, number format;
- lists and catalogs: result count, search (wait for the count to change before reading it),
  first filter, page 2 (a different page size shifts it), opening a detail, console errors;
- maps: initial view, every layer drawn, markers, click on a feature, legend;
- dashboards: every tab, then the first filter, counting embedded frames and console errors
  at each step; again after promotion.

A private copy is not reachable anonymously: render it with a session that sees it. The
server capture (`GET /applications/<id>/capture`) may refuse a session bound to another IP:
screenshot locally then.

Report to the owner, per application: original and copy links, what changes exactly
(converted keys, layout, labels, defaults, removed features), and any **pending configuration
draft** of the original (lost at promotion). The owner opens them and decides.

## 6. Promote, one by one

1. Check the copy's configuration is still the validated one (someone may have edited it).
2. On the original: `PATCH { url: <target>, urlDraft: '' }`, then `PUT /configuration` with the
   validated configuration (status `configured`, no draft).
   **Empty `urlDraft` explicitly**: many applications carry a draft url equal to their old url;
   the configuration editor then shows the old version and **"Valider" silently downgrades
   the application** (200, status `configured`, no error). Never click "Valider" on a just
   promoted application; after a campaign, sweep for `urlDraft` different from `url`.
3. Re-read without cache: url, empty `urlDraft`, `configured`, same configuration, same
   publication sites.
4. Check online: anonymously for public applications, with a session for protected ones, and
   inside the portal pages and dashboards that embed them.
5. Delete the copy once the owner accepts; until then it stays, private, next to the backup.

## Index of per-application references

All in [references/breaking-changes.md](references/breaking-changes.md):

| Application | Transitions covered | Converter |
|---|---|---|
| app-charts | 1.1 → 1.2 (dynamic filters), 1.2 → 1.3/1.4 | `app-charts` |
| app-catalog / list-details | 1.4–1.6 → 1.7 | none needed |
| app-dashboards | 0.3 (rebuild), 0.11 → 1.1, 1.0 → 1.1 | none |
| atelier-carto | ≤ 1.7 → 1.8 | `atelier-carto` |
| infos-territoires | 1.1 → 1.2 | `infos-territoires` |
| admin-divs-catchment | 0.1 → 1.0 | `admin-divs-catchment` |
| infos-parcelles | < 2.8 (3D), 2.8 → 2.10 | `infos-parcelles` |
| metrics | ≤ 1.3 → 1.4, 1.5 → 1.6 | `metrics` |
| periodic-series | 0.2 → 1.0.1 | `periodic-series` |
| app-treemap | 0.3 → 1.0, 1.1 → 1.3 | `app-treemap` |
| data-fair-proportions | 0.2 → 0.3, 1.1 → 1.2 | none |
| timelines-chart | 1.0 → 1.1 | none |
| app-relations-network | 0.2 → 1.0 | none |
| app-calendar, sunburst, admin-divs-levels | transparent | none |

An application missing here: apply section 2 and add what you find to the reference, with
the tags you checked.
