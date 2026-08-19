# processing-config-schema.json — the vjsf 3+ / json-layout reference

The user-facing configuration form of a processing. It is a **JSON Schema** annotated with **json-layout `layout` keywords**, rendered by the processings UI with `@koumoul/vjsf` v4.

Two independent jobs, same file:
1. **Validation + typing** — `df-build-types` turns it into `types/processingConfig/.type/` (the `ProcessingConfig` type + an ajv validator). Rerun `npm run build-types` after **every** edit.
2. **Form rendering** — everything under `layout` drives the UI and nothing else.

**Canonical examples:** `processing-hello-world` (template), `processing-gtfs` (tabs, list, `if`/`then`), `ademe-rge` (many dataset pickers), `processing-import-api` (conditional field groups).

---

## Legacy `x-*` keywords are silently ignored

vjsf 2 keywords (`x-display`, `x-fromUrl`, `x-itemsProp`, `x-itemTitle`, `x-itemKey`, `x-if`, `x-options`) are **not** part of json-layout. vjsf 3+ does not warn, does not error — it just renders the field with defaults. Symptoms: tabs collapse into one long form, a dataset picker becomes a raw id/title text pair, a field that should be hidden shows up.

Detect with `grep -n '"x-' processing-config-schema.json`, then exclude the two families that are still valid: `x-exports` (a df-build-types keyword) and `x-i18n-*` (a json-layout keyword — see *Internationalized schemas* below).

### Migration table

| vjsf 2 | vjsf 3+ / json-layout |
|---|---|
| `"x-display": "tabs"` | `"layout": "tabs"` |
| `"x-display": "switch"` | `"layout": "switch"` |
| `"x-display": "card"` | `"layout": "card"` |
| `"x-display": "password"` | `"layout": { "props": { "type": "password" } }` |
| `"x-if": "parent.value.a === 'b'"` | `"layout": { "if": "parent.data.a === 'b'" }` — **`parent.value` → `parent.data`** |
| `"x-options": { "evalMethod": "evalExpr" }` | drop it — expressions are `js-eval` by default |
| `"x-fromUrl": "{context.dataFairUrl}/…{q}…{context.ownerFilter}"` | `"layout": { "getItems": { "url": "${context.dataFairUrl}/…{q}…${context.ownerFilter}" } }` — **`{context.x}` → `${context.x}`**, `{q}` stays |
| `"x-itemsProp": "results"` | `"itemsResults": "data.results"` (inside `getItems`) |
| `"x-itemTitle": "title"` | `"itemTitle": "item.title"` (inside `getItems`) |
| `"x-itemKey": "id"` | `"itemKey": "item.id"` (inside `getItems`) |
| `"x-itemTitle": "key"` on an **array** | `"layout": { "itemTitle": "item.key" }` — list item label, *not* inside `getItems` |

The `x-*` values were **property paths**; the json-layout ones are **JS expressions** over `item` (for item\*) or template literals (for `url`). Forgetting the `item.` prefix or the `$` on `${context…}` is the usual breakage.

---

## Top-level shape

```json
{
  "type": "object",
  "layout": "tabs",
  "required": ["datasetMode", "url"],
  "allOf": [
    { "title": "Jeu de données", "oneOf": [ /* create / update */ ] },
    { "title": "Paramètres", "properties": { /* … */ } }
  ]
}
```

One `allOf` entry = one tab; its `title` is the tab label. Keep the dataset tab first.

## The dataset tab (create / update)

Every plugin that produces a dataset exposes the same discriminated union on `datasetMode`. The processings UI strips `datasetMode` from `required` when the processing already exists, so the two branches must be distinguishable by their `const`.

```json
{
  "title": "Jeu de données",
  "default": { "datasetMode": "update" },
  "oneOf": [
    {
      "title": "Créer un jeu de données",
      "required": ["datasetMode"],
      "properties": {
        "datasetMode": { "type": "string", "const": "create", "title": "Action" },
        "datasetTitle": {
          "type": "string",
          "title": "Titre du jeu de données à créer",
          "description": "Explication du mode création, rendue en aide contextuelle."
        }
      }
    },
    {
      "title": "Mettre à jour un jeu de données",
      "required": ["dataset"],
      "properties": {
        "datasetMode": { "type": "string", "const": "update", "title": "Action" },
        "dataset": {
          "type": "object",
          "title": "Jeu de données",
          "layout": {
            "getItems": {
              "url": "${context.dataFairUrl}/api/v1/datasets?select=id,title&${context.ownerFilter}&raw=true",
              "qSearchParam": "q",
              "itemsResults": "data.results",
              "itemTitle": "item.title",
              "itemKey": "item.id"
            }
          },
          "properties": {
            "id": { "type": "string", "title": "Identifiant" },
            "title": { "type": "string", "title": "Titre" }
          }
        }
      }
    }
  ]
}
```

### Create mode takes a flat `datasetTitle`, never a `dataset` object

In the `create` branch there is no dataset to point at — only a title to give the one that will be produced. Declare it as a **plain string property at branch level**, exactly like `processing-hello-world`:

```json
"datasetTitle": { "type": "string", "title": "Titre du jeu de données à créer" }
```

Wrapping it in a `"dataset": { "type": "object", "title": …, "properties": { "title": … } }` compiles to a `section` component, which renders a titled sub-block with its `description` as an always-visible markdown `subtitle`, wrapping a single field whose own label then repeats the same idea. Two headings and a paragraph for one text input. The flat form compiles to a bare `text-field` and pushes the `description` to the `help` icon — same information, one line.

Only the **update** branch carries a `dataset` object, because there it is a real reference (`id` + `title`) filled by `getItems`.

Much of the existing fleet still uses the nested `create[dataset]` shape (~30 of 37 plugins with a `datasetMode`); `hello-world`, `gtfs`, `gbfs`, `decp` and `datasets-list` use the flat one. **The flat one is the target** — fix the branch when you touch a plugin, and read the `create` title in `run` from `processingConfig.datasetTitle`.

The `create` branch is only ever used once: `run` must call `patchConfig({ datasetMode: 'update', dataset })` after creating, so the next run updates. Say so in the `datasetTitle` `description` — users ask.

**Available `context` variables** (injected by the processings UI):

| Variable | Value |
|---|---|
| `context.dataFairUrl` | absolute data-fair base URL |
| `context.ownerFilter` | already includes the param name: `owner=organization:xxx` |
| `context.owner` | `{ type, id, department }` |
| `context.directoryUrl` | simple-directory base URL |
| `context.utcs` | list of timezones |

## `getItems` fields

| Field | Meaning |
|---|---|
| `url` | template literal (`${…}`); `{q}` marks the search param |
| `qSearchParam` | explicit search param name — alternative to `{q}` |
| `itemsResults` | expression over the response, alias `data` (e.g. `"data.results"`) |
| `itemTitle` / `itemKey` / `itemValue` / `itemIcon` | expressions over one raw item, alias `item` |
| `searchParams` / `headers` | extra request params |

Either `{q}` in the url **or** `qSearchParam` makes the component an `autocomplete` (server-side search). Without both it is a `select` — every item fetched once. Always give one of them for dataset pickers.

---

## Layout vocabulary

`layout` accepts a component name (`"layout": "tabs"`), an object, an array of children, or `{ "switch": [ … ] }`.

**Component names:** `none` `slot` `composite-slot` `section` `tabs` `vertical-tabs` `expansion-panels` `stepper` `card` `list` `text-field` `textarea` `number-field` `checkbox` `switch` `slider` `date-picker` `date-time-picker` `time-picker` `color-picker` `select` `autocomplete` `combobox` `number-combobox` `checkbox-group` `switch-group` `radio-group` `file-input` `one-of-select`.

The component is **inferred** from the schema (object → `section`, `oneOf` → `one-of-select`, `enum` → `select`, >20 items → `autocomplete`, array → `list`…). Only set `comp` when the inference is wrong.

**Object form, the fields that matter here:**

| Key | Use |
|---|---|
| `comp` | force the component |
| `if` | JS expression; the field renders only when truthy |
| `props` | passed to the Vuetify component (`type: "password"`, `autocomplete: "suppress"`, `rows`, …) |
| `cols` | width, 0–12, or `{ xs, sm, md, lg, xl }` |
| `itemTitle` / `itemSubtitle` | label of a list row, alias `item` |
| `listEditMode` | `inline` \| `inline-single` \| `menu` \| `dialog` |
| `listActions` | subset of `add` `edit` `delete` `sort` `duplicate` `insertAfter` `copy` `paste` |
| `messages` | override UI strings, e.g. `{ "addItem": "Ajouter un jeu de données" }` |
| `items` / `oneOfItems` | explicit choice lists |
| `getItems` | remote choice list (above) |
| `slots` | `{ "before": { "markdown": "…" } }` for inline help |
| `defaultData` / `constData` / `transformData` | value plumbing |
| `separator` | turns a string into a multi-value combobox |

### Password fields

```json
"password": {
  "type": "string",
  "title": "Mot de passe",
  "layout": { "props": { "type": "password", "autocomplete": "suppress" } }
}
```

Add `autocomplete: "suppress"` on the matching username too, or browsers autofill it. A field holding a real secret must also be handled in `lib/prepare.ts`.

### Conditional fields

`layout.if` expressions receive `data` (this node's value), `value`, `parent` (`{ data, parent }` — chain `parent.parent.data` for a grandparent), `rootData`, `context`, `options`, `display`, `readOnly`, `summary`.

```json
"backupDir": {
  "type": "string",
  "title": "Dossier d'archive",
  "layout": { "if": "parent.data.sourceAction === 'move'" }
}
```

`layout.if` only **hides** the field; it does not remove it from validation. When a field must be *required* under a condition, express it in the schema with `if`/`then` or `oneOf`, not in `layout`.

### Schema-level conditionals

- **`oneOf` with a `const` discriminator** — the way to model exclusive modes; renders as `one-of-select`. Give each branch a `title`.
- **`if` / `then`** on an `allOf` entry — add fields when a condition holds (see `processing-gtfs`).
- **`dependentSchemas`** (or the legacy `dependencies` object form, still supported) — add fields once a property is filled. Used with `$ref` for recursive structures.

`$ref: "#/definitions/x"` works; recursive definitions render fine (see `processing-json-file`'s `block`/`expand`).

---

## Internationalized schemas

`x-i18n-<keyword>` is **not** a vjsf 2 leftover — it is a supported json-layout mechanism (`resolveXI18n`), active because the processings UI passes `xI18n: true` and `locale: session.lang`. It works on any keyword: `x-i18n-title`, `x-i18n-description`, `x-i18n-markdown`, `x-i18n-examples`.

Resolution is `value[locale] ?? value[defaultLocale] ?? <the base keyword>`, with `defaultLocale = 'en'`.

### Which mode a plugin is in

| Situation | What to do |
|---|---|
| Config entirely in French | **Leave it in French.** No `x-i18n-*` at all. Don't translate a working French-only plugin for the sake of it. |
| Config in English, or half French / half English | **Internationalize it fully to French** — every user-facing `title`, `description` and `markdown` gets its `x-i18n-*.fr`. A half-translated config is the state to fix. |
| New plugin | **EN + fr** from the start. |

English always lives in the **base** keyword, French in `x-i18n-<keyword>.fr`.

### The technical-title variant (valid)

The base `title` is also what `df-build-types` uses to name the generated TypeScript type — every tab and every `oneOf` branch title becomes a type in `ProcessingConfig`. So it is legitimate to keep a short **technical** English title in the base and put the user-facing English in `x-i18n-title.en`:

```json
"title": "Layers list",
"x-i18n-title": { "fr": "Lister les différentes couches", "en": "List the available layers" }
```

Generated type `LayersList`; the branch displays "List the available layers" / "Lister les différentes couches".

Rules for the technical title:

- **Noun phrase, not verb phrase** — it names a type, not an action. `LayersList`, not `ListLayers`. Push the imperative wording into `x-i18n-title.en`.
- **Short and plain.** `Datasets`, not `DatasetMode` or `DatasetSelectionMode`.
- **Check it doesn't clash with a hand-written type** in `lib/` before choosing it. `gpkg` now generates a `LayersList` (the oneOf branch) while `lib/context.ts` exports its own `LayersList` (one row of `processingConfig.layers`) — two unrelated types, one name.
- When the technical name and the displayed English are the same word, **drop the `en` key** — it would only duplicate the base.

So an `"en"` key is **not** a smell by itself. What to check instead: when a base title is not the user-facing English, is there an `x-i18n-title.en` covering it? A base title that is neither the displayed English nor a deliberate type name is the actual defect.

## Writing good descriptions

The `description` is rendered as **markdown** and is the only documentation most users read. Use it for behaviour that isn't obvious from the label: what happens on the remote server, what an empty value means, what the option does *not* affect. Bullet lists per case read well. Titles/descriptions are French in this stack.

---

## Gotchas

| Trap | Correct move |
|---|---|
| Any `x-*` keyword left in the file | Silently ignored — migrate it (table above) |
| `{context.dataFairUrl}` in a `getItems.url` | `${context.dataFairUrl}` — it's a template literal |
| `"itemTitle": "title"` | `"itemTitle": "item.title"` — it's an expression |
| `parent.value.x` in an `if` | `parent.data.x` |
| Dataset picker with neither `{q}` nor `qSearchParam` | Becomes a `select` that loads every dataset — add one |
| `dataset` object in the **create** branch | Flat `datasetTitle` string — the object renders an over-titled section around one field |
| `description` on a single-field object wrapper | It becomes an always-visible `subtitle` block; on a plain field it becomes a discreet `help` |
| Editing the schema without `npm run build-types` | `ProcessingConfig` drifts from the form |
| Renaming a config property | Existing processings keep the old key; `removeAdditional: true` in the UI then **drops** their value on next save. Rename only with an upgrade path |
| Adding a `required` property with no `default` | Every existing processing becomes invalid |
| `layout.if` used to make a field conditionally mandatory | Hiding ≠ optional; model it with `oneOf` / `if`-`then` |
| Secret field with no `lib/prepare.ts` handling | The secret stays readable in the config |

## Checklist before committing a schema change

- [ ] `grep -n '"x-' processing-config-schema.json` returns nothing but `x-exports` / `x-i18n-*`
- [ ] no half-translated config: if any label is in English, every user-facing label has its `x-i18n-*.fr`
- [ ] `npm run build-types && npm run lint && npm test`
- [ ] `git diff types/` reviewed — the generated type changed the way you expect
- [ ] Existing configs still validate (no new `required` without `default`, no silent rename)
- [ ] `lib/execute.ts` reads every new property, and `lib/prepare.ts` handles every new secret
