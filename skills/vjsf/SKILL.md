---
name: vjsf
description: >
  Use when writing, reviewing or migrating a JSON schema rendered as a form by
  @koumoul/vjsf 3+ / json-layout in the data-fair stack: an application
  config-schema.json, a processing or catalog plugin config schema, a portals
  page/portal config. Triggers include: legacy x-* keywords (x-display,
  x-fromUrl, x-if, x-itemsProp...), a form that renders wrong with no error
  (collapsed tabs, picker turned into raw text fields), selects fed by
  layout.getItems, sliders, icon pickers, conditional fields, discriminated
  oneOf, a form that takes seconds to open (large oneOf, dereferenced schema),
  or schema translations with x-i18n-*.
---

# vjsf / json-layout form schemas

## Overview

A vjsf form is driven by a **JSON Schema** annotated with the **json-layout `layout` keyword**, rendered by `@koumoul/vjsf`. The schema does two independent jobs: validation/typing (standard JSON Schema keywords) and form rendering (everything under `layout`, plus `oneOfLayout` and `x-i18n-*`).

Version naming: "vjsf 3+" and "vjsf 4" share the same vocabulary — v4 is the Vuetify 4 port of v3, no schema-level breaking change. The current lib is 4.5.x. Anything written here applies to both.

**Not covered here** (see the consumer skills): the `df:vjsf` meta and `df-build-types` pipeline of applications (skill-apps), the `datasetMode` create/update pattern and processing context variables (data-fair-processings), the portals compiled mode (`x-vjsf`, `--vjsf-dir`).

## When to use

- Writing or editing any schema rendered by vjsf: app `src/config/schema.json`, plugin `processing-config-schema.json`, catalog `types/*/schema.json|ts`, portals `api/types/*/schema.*`.
- Migrating a schema that still contains vjsf 2 `x-*` keywords.
- Debugging a form that renders wrong **with no error message**.

**Not for:** Vue component work on the form renderer itself (that is the vuetify-jsonschema-form repo), or app runtime code reading the config.

## Legacy `x-*` keywords are silently ignored

vjsf 2 keywords (`x-display`, `x-fromUrl`, `x-itemsProp`, `x-itemTitle`, `x-itemKey`, `x-if`, `x-props`, `x-cols`, `x-options`, `x-fromData`) are **not** json-layout. vjsf 3+ does not warn, does not error — it renders the field with inferred defaults. Symptoms: tabs collapse into one long form, a dataset picker becomes a raw id/title text pair, a field that should be hidden shows up.

Detect with `grep -n '"x-'` on the schema, then exclude the two families that are still valid: `x-exports` (df-build-types) and `x-i18n-*` (json-layout, see below).

Full migration table, expression traps and the `v2compat` helper: **`references/migration-v2-to-v3.md`**. The three traps that survive every migration attempt:

- `parent.value` → **`parent.data`** in `if` expressions.
- `{context.x}` → **`${context.x}`** in `getItems.url` (it is a template literal; `{q}` alone stays as-is).
- `x-itemTitle: "title"` → **`itemTitle: "item.title"`** — the old values were property paths, the new ones are JS expressions over `item`.

## Layout vocabulary

`layout` accepts a component name (`"layout": "tabs"`), an object, an array of children, or `{ "switch": [ … ] }`.

**Component names:** `none` `slot` `composite-slot` `section` `tabs` `vertical-tabs` `expansion-panels` `stepper` `card` `list` `text-field` `textarea` `number-field` `checkbox` `switch` `slider` `date-picker` `date-time-picker` `time-picker` `color-picker` `select` `autocomplete` `combobox` `number-combobox` `checkbox-group` `switch-group` `radio-group` `file-input` `one-of-select`.

The component is **inferred** from the schema (object → `section`, `oneOf` → `one-of-select`, `enum` → `select`, >20 items → `autocomplete`, array → `list`…). Only set `comp` when the inference is wrong.

**Object form, the keys that matter:**

| Key | Use |
|---|---|
| `comp` | force the component |
| `if` | JS expression; the field renders only when truthy |
| `props` | passed to the Vuetify component (`type: "password"`, `showTicks`, `rows`, `noDataText`...) |
| `getProps` | JS expression returning dynamic props passed to the Vuetify component (e.g. dynamic `noDataText` based on selected mode) |
| `label` | override the field label — `""` removes the inline label (see the slider pattern) |
| `step` | slider/number step — a **layout-level** keyword, not a Vuetify prop |
| `cols` | width, 0–12, or `{ xs, sm, md, lg, xl }` |
| `slots` | `{ "before": "…" }` or `{ "before": { "markdown": "…" } }` — content above the field |
| `itemTitle` / `itemSubtitle` | header of a list row — JS expression over the item's value (alias `data`), evaluated per item |
| `itemCopy` | expression applied when duplicating a list item |
| `listEditMode` | `inline` \| `inline-single` \| `menu` \| `dialog` |
| `listActions` | subset of `add` `edit` `delete` `sort` `duplicate` `insertAfter` `copy` `paste` |
| `messages` | override UI strings, e.g. `{ "addItem": "Ajouter un calque" }` |
| `items` / `oneOfItems` | explicit choice lists |
| `getItems` | remote or computed choice list (below) |
| `defaultData` / `getDefaultData` / `constData` / `transformData` | value plumbing |
| `separator` | turns a string into a multi-value combobox |

Ready-to-copy examples (tabs, sliders, icon picker, arrays, hidden and password fields): **`references/patterns.md`**.

## `getItems` — dynamic selects

| Field | Meaning |
|---|---|
| `url` | template literal (`${…}`); `{q}` marks the search param |
| `expr` | JS expression over existing data (`rootData.datasets`, `context.attachments`) — no HTTP call |
| `qSearchParam` | explicit search param name — alternative to `{q}` |
| `itemsResults` | expression over the response, alias `data` (e.g. `"data.results"`) |
| `itemTitle` / `itemKey` / `itemValue` / `itemIcon` | expressions over one raw item, alias `item` (or `data` in app schemas — both are exposed) |
| `searchParams` / `headers` | extra request params |

Either `{q}` in the url **or** `qSearchParam` makes the component an `autocomplete` (server-side search). Without both it is a `select` — every item fetched once. Always give one of them for dataset pickers.

**Always set an explicit `size` on data-fair URLs.** data-fair search endpoints (`/api/v1/datasets`, `…/lines`, applications listing) return **12 results by default** — too few for a usable select or autocomplete. Append `&size=50` (a good default across the stack) unless the list is known to be tiny, and add `&select=…` to fetch only the fields you use:

```json
"getItems": {
  "url": "api/v1/datasets?status=finalized&q={q}&select=id,title&size=50",
  "itemKey": "data.id",
  "itemTitle": "data.title",
  "itemsResults": "data.results"
}
```

## Conditional display

`layout.if` expressions receive `data` (this node's value), `value`, `parent` (`{ data, parent }` — chain `parent.parent.data` for a grandparent), `rootData`, `context`, `options`, `display`, `readOnly`, `summary`.

```json
"backupDir": { "type": "string", "layout": { "if": "parent.data.sourceAction === 'move'" } }
```

`layout.if` only **hides** the field; it does not remove it from validation. When a field must be *required* under a condition, express it in the schema with `if`/`then` or `oneOf`, not in `layout`.

`layout.switch` picks between whole layout variants; the last entry without `if` is the fallback:

```json
"layout": {
  "switch": [
    { "if": "!summary && data.dataset", "comp": "expansion-panels" },
    { "children": [] }
  ]
}
```

**Schema-level conditionals:** `oneOf` with a `const` discriminator (exclusive modes, renders as `one-of-select`, give each branch a `title`); `if`/`then` on an `allOf` entry; `dependentSchemas` once a property is filled. `$ref: "#/$defs/x"` works, including recursive definitions.

## Discriminated `oneOf` — correctness and performance

The pattern for exclusive variants (chart types, element types, filter types):

```json
{
  "type": "object",
  "discriminator": { "propertyName": "type" },
  "default": { "type": "line" },
  "oneOf": [
    { "title": "Courbe", "properties": { "type": { "const": "line" }, "tension": { "type": "integer" } } },
    { "title": "Barres", "properties": { "type": { "const": "bar" } } }
  ],
  "oneOfLayout": { "label": "Type de visualisation" }
}
```

- Each branch declares the discriminant as a `const` directly in its `properties`, plus a branch `title` (the option label).
- `discriminator` is a **major performance point on large `oneOf`**: it lets json-layout and ajv resolve the active branch directly instead of trying every branch. The portals page editor (a ~38-type element `oneOf`) relies on it; without it, opening the form costs seconds. When ajv validates the schema, the option must also be enabled: `ajvOptions: { discriminator: true }`.
- The variant selector is labelled through **`oneOfLayout`** — a sibling of `oneOf`, not a `title` on the container (that renders a section heading, not the select label): `oneOfLayout: { "label": "…", "x-i18n-label": { "fr": "…" } }`. For long lists add `"autocomplete": true` to `oneOfLayout`.
- A `default` selecting the initial branch avoids an empty form state.

## Compilation cost and `$ref`s

json-layout compiles one skeleton tree per distinct subschema and resolves internal `$ref`s itself, so a subschema referenced from ten places is compiled once. **Dereferenced** — every `$ref` replaced by a copy of its target, what `df-build-types`' `resolvedSchema` / `resolvedSchemaJson` exports produce — the same schema gives it ten subschemas, and the compilation runs on **every mount of the form**, not once per session. `$ref`s to external schemas are the exception: they cannot be resolved at runtime, so they have to be brought into the file one way or another.

Order of magnitude, on one large application schema whose shared definitions were referenced up to 9 times each:

| | `$ref`s kept | dereferenced |
|---|---|---|
| file | 48 kB | 402 kB |
| skeleton trees compiled | 99 | 569 |
| Ajv codegen per mount | ~390 ms | ~5 100 ms |

Same rendered form and same produced object either way. When a form takes seconds to open and the profile points at Ajv codegen (`optimizeNames`, `optimizeNodes`, `subschema`) under json-layout's `compile`, check which of the two it is being fed.

## Internationalization — `x-i18n-<keyword>`

`x-i18n-<keyword>` is a supported json-layout mechanism (`resolveXI18n`), active when the rendering UI passes the `xI18n: true` option (all data-fair UIs do) with `locale: session.lang`. It works on **any keyword**, including inside `layout`, `getItems`, `props` and `oneOfLayout`: `x-i18n-title`, `x-i18n-description`, `x-i18n-markdown`, `x-i18n-placeholder`, `x-i18n-itemTitle`, `x-i18n-label`, `x-i18n-errorMessage`…

Resolution is `value[locale] ?? value[defaultLocale] ?? <the base keyword>`, with `defaultLocale = 'en'`.

**Which mode a schema is in:**

| Situation | What to do |
|---|---|
| Schema entirely in French | **Leave it in French.** No `x-i18n-*` at all. Don't translate a working French-only schema for the sake of it. |
| Schema in English, or half French / half English | **Internationalize it fully** — every user-facing `title`, `description`, `markdown` gets its `x-i18n-*.fr`. A half-translated schema is the state to fix. |
| New schema meant to be bilingual | EN in the base keyword + `x-i18n-*.fr` from the start. |

### The technical-title variant

When the schema also feeds a type generator (`df-build-types`), the base `title` names the generated TypeScript type — every tab and every `oneOf` branch title becomes a type. It is legitimate to keep a short **technical** English title in the base and put the user-facing English in the override:

```json
"title": "Layers list",
"x-i18n-title": { "fr": "Lister les différentes couches", "en": "List the available layers" }
```

Generated type `LayersList`; the branch displays "List the available layers" / "Lister les différentes couches". Rules:

- **Noun phrase, not verb phrase** — it names a type, not an action. `LayersList`, never `ListLayers`. Push the imperative wording into `x-i18n-title.en`.
- **Short and plain.** `Datasets`, not `DatasetSelectionMode`.
- **Check the name doesn't clash** with a hand-written type in the codebase before choosing it.
- When the technical name and the displayed English are the same, **drop the `en` key** — it would only duplicate the base.

An `"en"` key is not a smell by itself. The actual defect is a base title that is neither the displayed English nor a deliberate type name.

## Label casing

Every user-facing string in a schema starts with a **capital letter**, in **sentence case** (French casse de phrase — only the initial is capitalized): field `title` and `description`, `enum`/`oneOf` option labels, `messages.*`, `slots` texts, error messages. « Somme des valeurs d'un champ », never « somme des valeurs » nor « Somme des Valeurs d'un Champ ». A config form is a column of labels — a lowercase one reads like a typo.

Two exceptions only: technical identifiers rendered as-is (`h1`, a dataset field key, a projection code) and proper nouns/brands (`OpenStreetMap`, `GeoJSON`). When `x-i18n-*` translations exist, the rule applies to **every** locale.

## Descriptions

`description` renders as **markdown** and is the only documentation most users read. Use it for behaviour not obvious from the label: what an empty value means, what the option does *not* affect. On a plain field it folds into a discreet help icon; on an object it becomes an always-visible subtitle block — one reason not to wrap a single field in a titled object.

## Gotchas

| Trap | Correct move |
|---|---|
| Any legacy `x-*` keyword left in the schema | Silently ignored — migrate it (`references/migration-v2-to-v3.md`) |
| `{context.dataFairUrl}` in a `getItems.url` | `${context.dataFairUrl}` — it's a template literal |
| `"itemTitle": "title"` | `"itemTitle": "item.title"` — it's an expression |
| `parent.value.x` in an `if` | `parent.data.x` |
| Picker with neither `{q}` nor `qSearchParam` | Becomes a `select` that loads everything at once — add one |
| data-fair URL without `size` | Only 12 results come back — add `&size=50` |
| Large `oneOf` without `discriminator` | Every branch is tried — the form gets slow; add it (and `ajvOptions: { discriminator: true }` where ajv runs) |
| Form takes seconds to open, profile full of Ajv codegen | Check whether the schema it is fed was dereferenced — inlined `$ref`s multiply the subschemas compiled |
| Labelling a `oneOf` selector with a container `title` | That renders a section heading — use `oneOfLayout.label` |
| `layout.if` used to make a field conditionally mandatory | Hiding ≠ optional; model it with `oneOf` / `if`-`then` |
| Slider label squeezed next to the track | `label: ""` + `slots.before` (see `references/patterns.md`) |
| `"format": "hexcolor"` (or any invented format) | Not a JSON Schema format — vjsf warns `unknown format ignored`; use `layout: "color-picker"` |
| `description` on a single-field object wrapper | Renders an always-visible subtitle block; put it on the field, where it becomes a help icon |
| Verb-phrase base `title` feeding a type generator | Types get named `ListLayers`-style; use a noun phrase, move the verb to `x-i18n-title.en` |

## Checklist before committing a schema change

- [ ] `grep -n '"x-'` returns nothing but `x-exports` / `x-i18n-*`
- [ ] Every `getItems` on a data-fair endpoint has `{q}` or `qSearchParam`, an explicit `size` (≈50) and a `select`
- [ ] Exclusive variants use `oneOf` + `const` + `discriminator` (+ branch `title`s, `oneOfLayout` label)
- [ ] No half-translated schema: either full French, or full base-EN + `x-i18n-*.fr`
- [ ] Every user-facing label starts with a capital, in sentence case
- [ ] Conditionally required fields are modelled in the schema, not with `layout.if`
- [ ] The type-generation pipeline of the host project was rerun (`npm run build-types` where applicable)
