# Migrating a vjsf 2 schema to vjsf 3+ / json-layout

vjsf 3 was a full rewrite with a new vocabulary (json-layout). vjsf 4 is the Vuetify 4 port of v3 — same vocabulary, no schema change. So this guide covers "2 → anything current".

## Why nothing errors

vjsf 2 keywords are plain unknown keywords to json-layout: no warning, no error, the field just renders with **inferred defaults**. Typical symptoms:

- `x-display: "tabs"` ignored → tabs collapse into one long vertical form.
- `x-fromUrl` ignored → a dataset picker degrades into the raw sub-fields of its object (two text inputs for `id` / `title`).
- `x-if` ignored → the field always shows.

Detection: `grep -n '"x-' <schema>` and migrate everything it finds **except** `x-exports` (df-build-types keyword) and `x-i18n-*` (json-layout keyword, still valid).

## Migration table

| vjsf 2 | vjsf 3+ / json-layout |
|---|---|
| `"x-display": "tabs"` | `"layout": "tabs"` — the tabs themselves are the **titled `allOf` entries** of the object, one entry = one tab |
| `"x-display": "card"` / `"switch"` / `"textarea"` / … | `"layout": "<comp>"` |
| `"x-display": "radio"` | `"layout": "radio-group"` |
| `"x-display": "checkbox"` (non-boolean, multi-choice) | `"layout": "checkbox-group"` |
| `"x-display": "switch"` (non-boolean, multi-choice) | `"layout": "switch-group"` |
| `"x-display": "hidden"` | `"layout": "none"` |
| `"x-display": "password"` | `"layout": { "props": { "type": "password" } }` |
| `"x-display": "icon"` on an `enum` | `"layout": { "getItems": { "itemIcon": "…" } }` |
| `"format": "hexcolor"` | `"layout": "color-picker"` — `hexcolor` is not a JSON Schema format, drop it |
| `"x-props": { … }` | `"layout": { "props": { … } }` |
| `"x-cols": 6` | `"layout": { "cols": 6 }` |
| `"x-if": "parent.value.a === 'b'"` | `"layout": { "if": "parent.data.a === 'b'" }` — **`parent.value` → `parent.data`** |
| `"x-options": { "evalMethod": "evalExpr" }` | drop it — expressions are `js-eval` by default |
| `"x-options": { "hideInArrayItem": true }` | `"layout": { "if": "!summary" }` |
| `"x-fromData": "expr"` | `"layout": { "getItems": { "expr": "…" } }` |
| `"x-fromUrl": "{context.dataFairUrl}/…{q}…{context.ownerFilter}"` | `"layout": { "getItems": { "url": "${context.dataFairUrl}/…{q}…${context.ownerFilter}" } }` — **`{context.x}` → `${context.x}`**, `{q}` stays |
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

## Tabs need `allOf`

vjsf 2 tolerated tabs over plain `properties`. In json-layout, `layout: "tabs"` groups the **`allOf` entries** of the object; each entry's `title` is the tab label:

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

A migration that keeps everything under `properties` and just adds `layout: "tabs"` produces one empty tab bar.

## Automated first pass: `v2compat`

The lib ships the exact mapping as a function — useful to migrate mechanically, then clean up by hand:

```js
import { v2compat } from '@koumoul/vjsf/compat/v2'
const v3Schema = v2compat(v2Schema)
```

It covers the table above but produces literal translations; after running it, still review expressions (`parent.data`, `item.` prefixes), re-add `size`/`select` on data-fair URLs, and check the tabs/`allOf` structure.

## After the migration

- Rerun the host project's type generation (`npm run build-types`) where applicable.
- Rerun the detection grep — it must return only `x-exports` / `x-i18n-*`.
- Open the form: every picker searches, every condition toggles, tabs are tabs.
