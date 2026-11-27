# Migrating a vjsf 2 schema to vjsf 3+ / json-layout

vjsf 3 was a full rewrite with a new vocabulary (json-layout). vjsf 4 is the Vuetify 4 port of v3 — same vocabulary, no schema change. So this guide covers "2 → anything current".

## Why nothing errors

vjsf 2 keywords are plain unknown keywords to json-layout: no warning, no error, the field just renders with **inferred defaults**. Typical symptoms:

- `x-display: "tabs"` ignored → tabs collapse into one long vertical form.
- `x-fromUrl` ignored → a dataset picker degrades into the raw sub-fields of its object (two text inputs for `id` / `title`).
- `x-if` ignored → the field always shows.
- `x-display: "list"` ignored on an array fed by `x-fromUrl` → the per-item editor becomes a multi-select of the fetched values, and the sub-fields of each item (an icon, a colour per value) are never shown.

Detection: `grep -n '"x-' <schema>` and migrate everything it finds **except** `x-exports` (df-build-types keyword) and `x-i18n-*` (json-layout keyword, still valid).

## Migration table

| vjsf 2 | vjsf 3+ / json-layout |
|---|---|
| `"x-display": "tabs"` | `"layout": "tabs"`: one tab per child of the object (titled sub-objects, or titled `allOf` entries to keep the data flat) |
| `"x-display": "card"` / `"switch"` / `"textarea"` / … | `"layout": "<comp>"` |
| `"x-display": "radio"` | `"layout": "radio-group"` |
| `"x-display": "checkbox"` (non-boolean, multi-choice) | `"layout": "checkbox-group"` |
| `"x-display": "switch"` (non-boolean, multi-choice) | `"layout": "switch-group"` |
| `"x-display": "hidden"` | `"layout": "none"` |
| `"x-display": "password"` | `"layout": { "props": { "type": "password" } }` |
| `"x-display": "list"` on an `array` of objects fed by `x-fromUrl` (one row per fetched value, e.g. an icon or a colour per category) | `"layout": { "comp": "list", "listEditMode": "inline", "getItems": { … } }` — **`comp` is mandatory**: an array with `getItems` is inferred as a multi-select |
| `"x-display": "icon"` on an `enum` | `"layout": { "getItems": { "itemIcon": "…" } }` |
| `"format": "hexcolor"` | `"layout": "color-picker"` — `hexcolor` is not a JSON Schema format, drop it |
| `"x-props": { … }` | `"layout": { "props": { … } }` |
| `"x-cols": 6` | `"layout": { "cols": 6 }` |
| `"x-if": "parent.value.a === 'b'"` | `"layout": { "if": "parent.data.a === 'b'" }` — **`parent.value` → `parent.data`** |
| `"x-options": { "evalMethod": "evalExpr" }` | drop it — expressions are `js-eval` by default |
| `"x-options": { "hideInArrayItem": true }` | `"layout": { "if": "!summary" }` |
| `"x-fromData": "expr"` | `"layout": { "getItems": { "expr": "…" } }` |
| `"x-fromUrl": "{context.dataFairUrl}/…{q}…{context.ownerFilter}"` | `"layout": { "getItems": { "url": "${context.dataFairUrl}/…{q}…${context.ownerFilter}" } }` — **`{context.x}` → `${context.x}`**, `{q}` stays (still supported; or drop it and add `qSearchParam: "q"`, the current form) |
| `"x-itemsProp": "results"` | `"itemsResults": "data.results"` (inside `getItems`) |
| `"x-itemTitle": "title"` | `"itemTitle": "item.title"` (inside `getItems`) |
| `"x-itemKey": "id"` | `"itemKey": "item.id"` (inside `getItems`) |
| `"x-itemTitle": "key"` on an **array** | `"layout": { "itemTitle": "item.key" }` — list item label, *not* inside `getItems` |

## The paths-became-expressions rule

The `x-*` values were **property paths**; the json-layout ones are **JS expressions**:

- `item*` fields are expressions over one raw item, alias `item` (`"item.title"`, backtick templates allowed).
- `url` is a template literal (`${…}` interpolation).
- `if` expressions read `data` / `parent.data` / `rootData` / `context` — never `.value`.

Forgetting the `item.` prefix or the `$` on `${context…}` is the usual breakage — and like everything else on this page, it fails **silently** (empty select, dead condition).

## Tabs: one tab per child

`layout: "tabs"` makes one tab per child of the object, labelled by the child's `title`. What the children are decides the data shape:

- titled sub-objects (`properties: { source: { type: "object", title: "Source", properties: … } }`): one tab per sub-object, the data is nested (`{ source: { … } }`);
- titled `allOf` entries: one tab per entry, the data stays **flat**;
- plain fields directly under `properties`: one tab per field, rarely what is wanted.

vjsf 2 schemas usually kept their fields flat, so migrating them means `allOf` entries; the data-fair configuration schemas use that form (flat configuration objects):

```json
{
  "type": "object",
  "layout": "tabs",
  "allOf": [
    { "title": "Source de données", "properties": { "datasets": { } } },
    { "title": "Paramètres", "properties": { "chart": { } } }
  ]
}
```

Adding `layout: "tabs"` over flat `properties` without regrouping them gives one tab per field.

## Automated first pass: `v2compat`

The lib ships the exact mapping as a function — useful to migrate mechanically, then clean up by hand:

```js
import { v2compat } from '@koumoul/vjsf/compat/v2'
const v3Schema = v2compat(v2Schema)
```

It covers the table above but produces literal translations; after running it, still review expressions (`parent.data`, `item.` prefixes), re-add `size`/`select` on data-fair URLs, and check how the tabs regroup the fields.

## After the migration

- Rerun the host project's type generation (`npm run build-types`) where applicable.
- Rerun the detection grep — it must return only `x-exports` / `x-i18n-*`.
- Open the form: every picker searches, every condition toggles, tabs are tabs.
