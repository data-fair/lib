# Outils WebMCP : mécanique et inventaire

## Mécanique

Les interfaces data-fair utilisent le standard **WebMCP** (`navigator.modelContext`, polyfill `@mcp-b/webmcp-polyfill`), via `useAgentTool` / `useAgentSubAgent` de `@data-fair/lib-vue-agents`. `useFrameServer(serverId)` remplace ensuite `navigator.modelContext` par un `BrowserMcpServer` branché sur un `BroadcastChannel` propre à l'onglet, pour que le chat de la plateforme puisse agréger les outils de toutes les frames.

API utile depuis `browser_evaluate` :

| Appel | Retour |
| --- | --- |
| `navigator.modelContext.listTools()` | **synchrone**, `[{ name, description, inputSchema, ... }]` |
| `navigator.modelContext.callTool({ name, arguments })` | `Promise<{ content: [{ type: 'text', text }], structuredContent?, isError? }>` |

Le résultat métier est en général du **texte dans `content[0].text`** (souvent du JSON à parser), avec parfois un `structuredContent` en doublon typé.

### Attendre l'enregistrement puis lister

L'enregistrement est asynchrone (imports dynamiques, montage de composants). Ne pas conclure à l'absence d'un outil sur une première lecture.

```js
// browser_evaluate — attend jusqu'à 15 s l'apparition d'un outil, puis liste tout
async () => {
  const deadline = Date.now() + 15000
  const has = n => {
    const mc = navigator.modelContext
    return !!mc && typeof mc.listTools === 'function' && mc.listTools().some(t => t.name === n)
  }
  while (!has('list_datasets') && Date.now() < deadline) await new Promise(r => setTimeout(r, 200))
  return navigator.modelContext.listTools().map(t => ({ name: t.name, description: t.description }))
}
```

### Appeler un outil

```js
async () => {
  const res = await navigator.modelContext.callTool({
    name: 'search_data',
    arguments: { datasetId: 'mon-jeu', size: 5, filters: { ville_eq: 'Nantes' } }
  })
  if (res.isError) return { error: res.content?.[0]?.text }
  return res.structuredContent ?? JSON.parse(res.content[0].text)
}
```

Lire d'abord `inputSchema` dans le listing plutôt que deviner les arguments : les erreurs de validation reviennent en `isError` avec un message exploitable.

### Outils d'une iframe

Chaque frame tient **son propre registre**. Le `listTools()` de la frame du haut ne contient pas les outils d'une application embarquée. Évaluer dans la frame propriétaire (`browser_evaluate` sur le frame ciblé, ou `page.frames()` côté Playwright) :

```js
// Playwright brut
const frame = page.frames().find(f => f.url().includes('/data-fair/app/'))
await frame.evaluate(() => navigator.modelContext.listTools().map(t => t.name))
```

## Formulaires VJSF

Un formulaire vjsf 3 / json-layout peut exposer son `StatefulLayout` avec la classe `WebMCP` de `@json-layout/core/webmcp`. Les outils sont préfixés (`pageConfig_`, `portalConfig_`…) :

| Outil | Rôle |
| --- | --- |
| `<prefix>fillFormSkill` | **À appeler en premier** : renvoie le mode d'emploi du formulaire courant (ordre des opérations, complexité, conventions). |
| `<prefix>getData` | État complet des données du formulaire. |
| `<prefix>describeState` | Champs visibles, types, erreurs, chemins. |
| `<prefix>setFieldValue` | `{ path, value }` → pose une valeur, renvoie `{ valid, field, errors }`. |
| `<prefix>setData` | Remplace tout ou partie des données. |
| `<prefix>getFieldSuggestions` | Valeurs proposées pour un champ (énumérations, `getItems`). |
| `<prefix>editArray` | Ajout / suppression / déplacement dans un tableau. |
| `<prefix>getSchema` | Schéma JSON, si le composant l'a fourni. |
| `subagent_<prefix>form` | Consigne de délégation (voir « sous-agents » ci-dessous), présent seulement si le composant active `includeSubAgent`. |

**Les chemins incluent les conteneurs de mise en page** : le titre d'une page de portail est à `/$comp-1/title`, pas `/title`. Les obtenir de `getData`/`describeState`, jamais par déduction depuis le schéma JSON.

## Outils sous-agents

Un outil nommé `subagent_*` (produit par `useAgentSubAgent`) **ne fait pas le travail** : il renvoie un JSON

```json
{ "prompt": "…", "tools": ["read_column_values", "set_column_labels"], "model": "tools" }
```

destiné à l'hôte, qui doit lancer un sous-agent avec ce prompt et ces outils. Pour un agent externe, c'est une **source d'instructions**, pas un résultat : lire le `prompt`, puis exécuter soi-même les outils listés.

## Inventaire par surface

Listes constatées dans le code ; vérifier toujours par `listTools()` sur la page réelle, les jeux évoluent.

### Portail public (`portals/portal`)

Enregistrés au niveau de l'application, **indépendamment de l'affichage du chat** (`agentChat.active: false` masque le chat, pas les outils).

- données : `list_datasets`, `describe_dataset`, `search_data`, `aggregate_data`, `calculate_metric`, `get_field_values`, `get_dataset_schema`, `subagent_dataset_data`
- navigation : `get_current_location`, `list_pages`, `navigate`, `pageFilters_get`, `pageFilters_set`
- contenu du portail : `list_applications`, `list_events`, `list_news`, `list_reuses`
- géo : `get_user_geolocation`, `geocode_address`

### Back-office data-fair (`/data-fair`)

Socle posé par le layout, présent sur toutes les routes :

- navigation : `get_current_location`, `list_pages`, `navigate`
- jeux de données et données : `list_datasets`, `describe_dataset`, `search_data`, `aggregate_data`, `calculate_metric`, `get_field_values`, `get_dataset_schema`, `subagent_dataset_data`, `subagent_data_quality_checker`
- applications : `list_applications`, `describe_application`, `get_application_config`, `get_application_config_schema`, `get_application_config_draft`, `list_base_applications`
- connecteurs : `list_processings`, `describe_processing`, `list_catalogs`, `describe_catalog`
- géo : `get_user_geolocation`, `geocode_address`

Ajoutés selon la route :

| Route | Outils |
| --- | --- |
| `/dataset/:id` | `read_dataset_info`, `read_dataset_metadata`, `set_dataset_metadata`, `read_dataset_changes`, `read_schema_for_annotation`, `annotate_schema`, `read_column_values`, `set_column_labels`, `reorder_columns`, `read_property_config`, `set_property_config`, `get_expression_context`, `get_sample_data`, `test_expression`, `set_expression`, `page_guidance` + les sous-agents associés (`subagent_dataset_summarizer`, `subagent_dataset_description_writer`, `subagent_dataset_changes_summarizer`, `subagent_schema_annotator`, `subagent_column_labeler`, `subagent_property_config_advisor`, `subagent_expression_helper`) |
| Table d'un jeu de données | `open_add_line_dialog`, `open_edit_line_dialog` |
| `/application/:id` | `set_application_summary`, `set_application_description`, `page_guidance` + `subagent_application_summarizer`, `subagent_application_description_writer` |
| `/dataset/new` | `select_dataset_type`, `set_dataset_title`, `set_rest_options`, `skip_init_from_step`, `advance_to_confirmation` |
| `/application/new` | `select_creation_type`, `select_base_application`, `select_copy_application`, `set_application_title` |
| `/admin/info` | `list_services_versions`, `explore_github` |

### Gestionnaire de portails (`/portals-manager`)

- édition d'une page : formulaire VJSF préfixé `pageConfig_` (+ `subagent_pageConfig_form`)
- configuration d'un portail : formulaire VJSF préfixé `portalConfig_`

### Simple Directory

Aucun outil WebMCP. Barreau ② (API) ou ③ (Playwright).

## Barreau ② : appels d'API

### `fetch` same-origin depuis la page

```js
// browser_evaluate, sur une page de l'hôte qui sert l'API visée
async () => {
  const res = await fetch('/data-fair/api/v1/datasets?size=5', { headers: { accept: 'application/json' } })
  if (!res.ok) return { status: res.status, body: await res.text() }
  return await res.json()
}
```

Les cookies injectés par le proxy partent automatiquement. Vérifier l'origine courante avant l'appel : après une navigation vers un portail, une URL relative vise le portail et renvoie le HTML de la SPA.

### `curl` via le proxy

```bash
curl -s --proxy http://127.0.0.1:7331 \
     --cacert ~/.config/nhi-proxy/<profil>/ca.crt \
     https://<hôte>/simple-directory/api/auth/me
```

Indépendant de l'état du navigateur, pratique pour une sonde d'identité ou une lecture en volume. Pour une cible locale, voir les pièges `no_proxy` dans `nhi-proxy/docs/usage.md`.
