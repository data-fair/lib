# processing-config-schema.json — the processings-specific parts

The user-facing configuration form of a processing. It is a **JSON Schema** annotated with **json-layout `layout` keywords**, rendered by the processings UI with `@koumoul/vjsf` v4.

**REQUIRED BACKGROUND: the [vjsf skill](../vjsf/SKILL.md).** It holds everything generic: the layout vocabulary and component inference, `getItems` (and the `size=50` rule on data-fair URLs), conditionals, discriminated `oneOf`, `x-i18n-*` internationalization and the technical-title rules, label casing, and the full vjsf 2 → 3+ migration table (`../vjsf/references/migration-v2-to-v3.md` — legacy `x-*` keywords are **silently ignored**, detect them with `grep -n '"x-'` excluding `x-exports` / `x-i18n-*`). This file only covers what is specific to processings.

Two independent jobs, same file:
1. **Validation + typing** — `df-build-types` turns it into `types/processingConfig/.type/` (the `ProcessingConfig` type + an ajv validator). Rerun `npm run build-types` after **every** edit.
2. **Form rendering** — everything under `layout` drives the UI and nothing else.

**Canonical examples:** `processing-hello-world` (template), `processing-gtfs` (tabs, list, `if`/`then`), `ademe-rge` (many dataset pickers), `processing-import-api` (conditional field groups).

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
              "url": "${context.dataFairUrl}/api/v1/datasets?select=id,title&size=50&${context.ownerFilter}&raw=true",
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

Note the **absolute** `${context.dataFairUrl}` prefix on data-fair URLs: the processings UI is not served under the data-fair origin, so relative `api/v1/…` URLs (the application-schema habit) do not work here.

## Secrets

A field holding a real secret (password, API key) must pair its schema declaration (`layout: { props: { type: "password", autocomplete: "suppress" } }` — see the vjsf skill's patterns) with handling in `lib/prepare.ts`, which moves the value out of the config into `secrets`. A secret with no `prepare.ts` handling stays readable in the config.

## Internationalization policy

The mechanism (`x-i18n-<keyword>`, technical titles naming the generated types) is in the vjsf skill. The per-plugin policy:

| Situation | What to do |
|---|---|
| Config entirely in French | **Leave it in French.** No `x-i18n-*` at all. |
| Config in English, or half French / half English | **Internationalize it fully** — every user-facing label gets its `x-i18n-*.fr`. |
| New plugin | EN + fr from the start. |

## Writing good descriptions

The `description` is rendered as **markdown** and is the only documentation most users read. Use it for behaviour that isn't obvious from the label: what happens on the remote server, what an empty value means, what the option does *not* affect. Bullet lists per case read well. Titles/descriptions are French in this stack.

---

## Gotchas

Generic schema traps (leftover `x-*`, `${context…}` templates, `item.` prefixes, `parent.data`, missing `{q}`/`qSearchParam`/`size`, `layout.if` vs conditional required) are in the **vjsf skill's gotchas table**. Processings-specific:

| Trap | Correct move |
|---|---|
| `dataset` object in the **create** branch | Flat `datasetTitle` string — the object renders an over-titled section around one field |
| Relative `api/v1/…` URL in a `getItems` | The processings UI is not on the data-fair origin — prefix with `${context.dataFairUrl}` |
| Editing the schema without `npm run build-types` | `ProcessingConfig` drifts from the form |
| Renaming a config property | Existing processings keep the old key; `removeAdditional: true` in the UI then **drops** their value on next save. Rename only with an upgrade path |
| Adding a `required` property with no `default` | Every existing processing becomes invalid |
| Secret field with no `lib/prepare.ts` handling | The secret stays readable in the config |

## Checklist before committing a schema change

- [ ] `grep -n '"x-' processing-config-schema.json` returns nothing but `x-exports` / `x-i18n-*`
- [ ] no half-translated config: if any label is in English, every user-facing label has its `x-i18n-*.fr`
- [ ] `npm run build-types && npm run lint && npm test`
- [ ] `git diff types/` reviewed — the generated type changed the way you expect
- [ ] Existing configs still validate (no new `required` without `default`, no silent rename)
- [ ] `lib/execute.ts` reads every new property, and `lib/prepare.ts` handles every new secret
