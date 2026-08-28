# Recurring vjsf patterns — the fleet canon

Ready-to-copy fragments, aligned with what the maintained data-fair apps and services actually do. French strings are product copy — keep them French (or internationalize with `x-i18n-*`, see SKILL.md).

## Slider

The default slider rendering is poor in a config sidebar: no ticks, no value display, and the label sits inline next to the track where it gets squeezed. The fleet pattern (used ~25 times across list-details, atelier-carto, carto-explore):

```json
"density": {
  "type": "integer",
  "default": 1,
  "minimum": 0,
  "maximum": 2,
  "layout": {
    "comp": "slider",
    "label": "",
    "slots": { "before": "Nombre d'éléments par ligne" },
    "props": { "showTicks": "always", "thumbLabel": true }
  }
}
```

- `label: ""` empties the inline Vuetify label; the visible label moves **above** the slider via `slots.before` — this is what survives a narrow form.
- `props.showTicks: "always"` shows the tick marks, `props.thumbLabel: true` shows the value while dragging.
- Step is the **layout-level `step` keyword**, not a prop:

```json
"opacity": {
  "type": "integer", "minimum": 0, "maximum": 100, "default": 100,
  "layout": {
    "comp": "slider", "step": 10, "label": "",
    "slots": { "before": "Opacité" },
    "props": { "showTicks": "always", "thumbLabel": true }
  }
}
```

- Combines freely with `if`: `"layout": { "if": "parent.data.field", "comp": "slider", … }`.

## Icon picker (MDI)

One canonical shape — an object `{ name, svg, svgPath }` fed by the `icons-mdi-latest` dataset (produced by processing-mdi-icons, hosted with open CORS):

```json
"icon": {
  "type": "object",
  "title": "Icône",
  "required": ["name", "svg", "svgPath"],
  "default": { "name": "circle", "svg": "<svg …>", "svgPath": "M12,2A10,10 …" },
  "layout": {
    "getItems": {
      "url": "https://koumoul.com/data-fair/api/v1/datasets/icons-mdi-latest/lines?q={q}&size=50&select=name,svg,svgPath",
      "itemKey": "data.name",
      "itemTitle": "data.name",
      "itemIcon": "data.svg",
      "itemsResults": "data.results"
    }
  },
  "properties": {
    "name": { "type": "string" },
    "svg": { "type": "string" },
    "svgPath": { "type": "string" }
  }
}
```

- **`itemIcon: "data.svg"` is what shows the glyph in the dropdown.**
- **URL**: always the absolute `https://koumoul.com/data-fair/api/v1/…` form — **never relative**. `icons-mdi-latest` is a public dataset published on koumoul.com (open CORS); a relative URL resolves against whatever data-fair instance renders the form, where that dataset does not exist, and the picker silently returns nothing. This is the one `getItems` URL that is hardcoded on purpose. Always keep `size=50` (default page size is 12) and the `select` — never `size=10000`.
- `default` avoids an empty-icon state; `required` makes partial objects invalid.
- **Rendering**: use `icon.svgPath` (the `d` of a `<path>`) — no `@mdi/js` at runtime. Custom SVG: `<path :d="icon.svgPath">`; Vuetify: `:icon="icon.svgPath"`.
- Closed lists (e.g. fixed filter icons) can query directly, same absolute host: `https://koumoul.com/data-fair/api/v1/datasets/icons-mdi-latest/lines?name_in=cart,school&select=name,svg,svgPath`.

## Tabs (`allOf` + `title`)

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

One `allOf` entry = one tab; its `title` is the tab label. Without `layout: "tabs"` the entries still render as stacked sections. Keep the data-source tab first.

## Discriminated `oneOf`

```json
"chart": {
  "type": "object",
  "discriminator": { "propertyName": "type" },
  "default": { "type": "line" },
  "oneOf": [
    {
      "title": "Courbe",
      "properties": {
        "type": { "const": "line" },
        "tension": { "type": "integer", "title": "Tension", "minimum": 0, "maximum": 10, "default": 0 }
      }
    },
    {
      "title": "Barres",
      "properties": {
        "type": { "const": "bar" },
        "horizontal": { "type": "boolean", "title": "Horizontal" }
      }
    }
  ],
  "oneOfLayout": { "label": "Type de visualisation" }
}
```

See SKILL.md § Discriminated oneOf for the performance rationale (`ajvOptions: { discriminator: true }`, `oneOfLayout.autocomplete` on long lists).

## Dynamic selects (`getItems`)

**Dataset picker** (application schema — relative URL):

```json
"datasets": {
  "type": "array",
  "layout": {
    "getItems": {
      "url": "api/v1/datasets?status=finalized&q={q}&select=id,title,schema&size=50&sort=createdAt:-1",
      "itemKey": "data.href",
      "itemTitle": "data.title",
      "itemsResults": "data.results"
    }
  },
  "items": {
    "type": "object",
    "properties": {
      "href": { "type": "string" }, "title": { "type": "string" },
      "id": { "type": "string" }, "schema": { "type": "array" }
    }
  }
}
```

**Field picker from a selected dataset** — chain through `rootData` or `parent`:

```json
"field": {
  "type": "string",
  "title": "Colonne",
  "layout": {
    "getItems": {
      "url": "${rootData.datasets[0].href}/schema?calculated=false",
      "itemKey": "data.key",
      "itemTitle": "data.label"
    }
  }
}
```

Inside a list item, climb with `${parent.parent.data.dataset.href}`.

**`expr` variant** — the choices already exist in the data, no HTTP call:

```json
"dataset": {
  "type": "object",
  "title": "Jeu de données",
  "layout": {
    "getItems": { "expr": "rootData.datasets", "itemKey": "data.id", "itemTitle": "data.title" }
  },
  "properties": { "id": { "type": "string" }, "title": { "type": "string" }, "href": { "type": "string" } }
}
```

### Custom empty message (`props.noDataText` / `getProps`)

When a select or autocomplete has no matching options (e.g. filtered by capability or type), Vuetify displays the default « Aucune donnée disponible » / « No data available ». Use `layout.props.noDataText` (or dynamic `layout.getProps`) to provide a clear, contextual explanation:

- **Static message** via `props.noDataText`:
```json
"field": {
  "type": "object",
  "title": "Champ numérique",
  "layout": {
    "props": { "noDataText": "Aucun champ numérique disponible." },
    "getItems": {
      "url": "${rootData.datasets[0].href}/schema?calculated=false&type=integer,number",
      "itemKey": "data.key",
      "itemTitle": "data.label"
    }
  }
}
```

- **Dynamic message** via `getProps` (expression evaluated against form data, e.g. `rootData`):
```json
"field": {
  "type": "object",
  "title": "Champ textuel",
  "layout": {
    "getProps": "rootData.metricType?.type === 'words' ? { noDataText: 'Aucune colonne avec la capacité « Statistiques de mots ».' } : { noDataText: 'Aucune colonne textuelle disponible.' }",
    "getItems": {
      "url": "${rootData.datasets[0].href}/schema?calculated=false&${rootData.metricType?.type === 'words' ? 'capability=textAgg' : 'type=string&capability=values'}",
      "itemKey": "data.key",
      "itemTitle": "data.label"
    }
  }
}
```

## Advanced arrays

```json
"layers": {
  "type": "array",
  "title": "Calques",
  "layout": {
    "itemTitle": "data.title || (!data.dataset && 'Source non définie') || data.dataset.title",
    "itemCopy": "{...item, uuid: crypto.randomUUID()}",
    "messages": { "addItem": "Ajouter un calque" }
  },
  "items": {
    "type": "object",
    "layout": {
      "switch": [
        { "if": "!summary", "comp": "expansion-panels" },
        { "children": [] }
      ],
      "getDefaultData": "{ uuid: crypto.randomUUID() }"
    },
    "properties": {
      "uuid": { "type": "string", "layout": "none" },
      "title": { "type": "string", "title": "Titre" }
    }
  }
}
```

- `itemTitle`: JS expression summarizing the row in the list (details below).
- `itemCopy`: transformation on duplication (regenerate ids).
- `getDefaultData`: initial value of a new item.
- `messages.addItem`: label of the add button (capitalized, like every label).
- Rich editing UX: `listEditMode: "dialog"` + `listActions: ["add","edit","delete","sort","duplicate","copy","paste"]` (the portals page editor pattern).

### List item titles (`itemTitle` / `itemSubtitle`)

On an **array** node, `layout.itemTitle` and `layout.itemSubtitle` are JS expressions evaluated **once per item**, against that item's value (alias `data`). The result renders as the item's header line (`v-list-item-title` / `v-list-item-subtitle`) above its content — it is what identifies a collapsed or dialog-edited row, so a list without `itemTitle` is a wall of anonymous cards.

```json
"sections": {
  "type": "array",
  "title": "Sections",
  "layout": {
    "listEditMode": "dialog",
    "itemTitle": "(data.title || 'Sans libellé') + ' - ' + (data.elements?.length ?? 0) + ' éléments'",
    "itemSubtitle": "data.icon?.name"
  },
  "items": { "type": "object", "properties": { "title": { "type": "string", "title": "Libellé" } } }
}
```

- The expression is plain JS over `data` (the item value): concatenations, optional chaining, `||` fallbacks all work. Always provide a fallback for empty items (`data.title || 'Nouvelle section'`) — a freshly added item has no data yet.
- Without `itemTitle`, the row shows no header; `layout: { "indexed": true }` falls back to showing the item key/index.
- Not to be confused with the **`getItems.itemTitle`** of a select (expression over a fetched `item`), nor with the **`itemTitle` of a list row inside `getItems`** — this one lives directly under `layout` on the array.
- With `listEditMode: "dialog"` or `"inline-single"`, the title is the only thing the user sees before opening the row — make it carry the discriminating information (name, count, target dataset…).

## Hidden fields

```json
"uuid": { "type": "string", "layout": "none" }
```

Present in the data, absent from the form. For internal state (uuids, hashes) — often written by the app itself, not the user.

## Password fields

```json
"password": {
  "type": "string",
  "title": "Mot de passe",
  "layout": { "props": { "type": "password", "autocomplete": "suppress" } }
}
```

Add `autocomplete: "suppress"` on the matching username field too, or browsers autofill it. How the secret is then stored is the host project's concern (e.g. `lib/prepare.ts` in a processing plugin).
