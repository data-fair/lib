# Blocs de page — champs et conventions

Le schéma de référence est `portals/api/types/page-elements/schema.ts` (union discriminée sur `type`) et les définitions `portals/api/types/page-element-*/schema.js`. En cas de doute sur un champ, lire ces fichiers plutôt que deviner.

Tous les blocs acceptent :

- `type` (requis) ;
- `uuid` (recommandé : `crypto.randomUUID()`) — identité du bloc, sert aussi de préfixe de synchronisation d'URL pour les applications ;
- `mb` : marge basse, entier 0-16 (défaut 4).

Le serveur calcule et stocke en plus, à ne pas écrire soi-même :

- `text` / `alert` : `_html` (markdown rendu et sanitisé) ;
- `title` ancré : `anchor._slug`, et `config._toc` (sommaire global).

## Blocs de contenu

### `title`

```json
{
  "type": "title", "uuid": "…",
  "content": "Publier et valoriser des données de transport GTFS",
  "titleSize": "h3", "titleTag": "h2",
  "centered": true, "bold": true,
  "anchor": { "enabled": true, "inToc": true, "label": "Valoriser" }
}
```

- `titleSize` (requis) pilote l'apparence : `h1`…`h6` → `text-h1`…`text-h6` (Vuetify). `titleTag` pilote la balise HTML : `h1`…`h6` ou `div`.
- Le layout du portail rend le titre du portail en `<h1>` : garder **un seul `<h1>`** par document et viser `titleSize: 'h3'` + `titleTag: 'h2'` pour un titre de page (convention des pages existantes).
- `anchor.enabled` génère un lien direct ; `anchor.inToc` ajoute l'entrée au sommaire ; `anchor.label` raccourcit le libellé du sommaire.
- Autres : `color`, `icon`, `line { position, color, growOnHover? }`, `link` (lien simple).

### `text`

```json
{ "type": "text", "uuid": "…", "content": "Markdown **gras**, [lien](https://…), listes, tableaux." }
```

- Markdown sanitisé : `h1-h6`, `p`, listes, tableaux, `strong/em`, liens, `img`, `pre/code`, `blockquote`.
- **Interdit par le sanitizer** : `<iframe>`, `<script>`, `<video>`, `style=""`, `<details>`. Pour intégrer, utiliser `application` ou `iframe`.
- `centered` (bool), `mb`.

### `alert`

```json
{
  "type": "alert", "uuid": "…",
  "alertType": "info", "variant": "tonal",
  "title": "Pour qui ?",
  "content": "Les collectivités **en charge des transports**…"
}
```

- `alertType` (requis) : `none`, `info`, `success`, `error`, `warning`. `variant` : `default` (avec fond), `outlined`, `tonal`.
- Quand `alertType` vaut `none`, on peut choisir `icon` et `color`.
- `closable` ajoute une croix (mémorisée par visiteur).

### `mermaid`

```json
{ "type": "mermaid", "uuid": "…", "code": "flowchart TB\n    A[\"…\"] --> B[\"…\"]", "description": "Alternative textuelle du diagramme" }
```

- Rendu client (`securityLevel: 'strict'`), thème du portail, `description` → `aria-label`.
- Règles de lisibilité et thème : voir `references/mermaid.md`.
- En cas d'erreur de syntaxe : un avertissement en prévisualisation, le code source en lecture seule sinon.

### `iframe`

```json
{ "type": "iframe", "uuid": "…", "title": "Carte temps réel", "url": "https://…", "scroll": false }
```

- `url` requis, `title` recommandé (accessibilité), `scroll` (bool).
- Pas de champ hauteur : la hauteur est déduite par `d-frame` (ratio largeur).
- Le domaine doit figurer dans `config.allowedFrameSources` du portail, sinon le CSP bloque le rendu (voir `references/embeds.md`).

### `application`

```json
{
  "type": "application", "uuid": "…",
  "application": { "id": "eKUyqjw8mcm8tD_cF03_d", "title": "Carte temps réel du réseau STAR", "slug": "carte-temps-reel-du-reseau-star" },
  "syncParams": "none",
  "displayMode": "fixed-height",
  "height": 600,
  "actionButtons": { "items": ["fullscreen", "datasets"] }
}
```

- `application.id` / `.slug` doivent exister sur l'instance DataFair du portail (`GET /data-fair/api/v1/applications/<id>`).
- `syncParams` : `none`, `sandboxed` (paramètres d'URL cloisonnés par `uuid`), `shared-filters` (partage des filtres `_c`/`_d`).
- `displayMode` : `auto-resize` (défaut, hauteur optimale), `aspect-ratio` (+ `ratio` : `auto`, `16/9`, `4/3`, `1/1`, `3/2`, `21/9` et `maxHeight`), `fixed-height` (+ `height`, min 150, défaut 500).
- `actionButtons.items` : `fullscreen`, `capture`, `embed`, `datasets` ; `style` (`icon`/`full`/`text`), `position` (`top`/`bottom`), `alignment` (`start`/`center`/`end`).
- Détails et comparaison avec `iframe` : `references/embeds.md`.

### `button`

```json
{
  "type": "button", "uuid": "…",
  "link": { "type": "external", "href": "https://koumoul.com/contact", "title": "Échanger sur vos données de transport" },
  "usePortalConfig": true, "centered": true
}
```

- `link` est un `linkItem` discriminé : `external` (`href`), `standard` (`subtype`: home, contact, datasets…), `generic` (`pageRef {slug,title}`), `event`, `news`.
- `usePortalConfig: true` reprend le style de bouton du portail ; sinon `config` porte les couleurs/variantes.

### `divider` / `image`

- `divider` : `content`, `inset`, `rounded`, `opacity`, `thickness`, `color`.
- `image` : `url` ou upload `image`/`wideImage`, `banner`, `cover`, `alignment`, `height`, `zoomable`, `title` (alt), `legend`, `link`. La miniature et les images passent par la médiathèque du portail (upload), pas par des URL externes pour les assets produits.

## Conteneurs

- `two-columns` : `disposition` (`equal`/`left`/`right`), `align`, `gutter`, `children`, `children2`.
- `responsive-grid` : `columns` (2/3/4/6), `gutter`, `align`, `centered`, `children`.
- `card` : `children`, `title`, `elevation`, `rounded`, `border`, `keepTextSize`, `hover`, `thumbnail`, `link`, `actions[]`, `background`.
- `banner` : `children`, `fullWidth`, `background { color, image, tintStrength }`, `pt/pb/pl/pr`, `overflowTop/Bottom`.
- `tabs` : `tabs[] { title, icon, children }`, `grow`, `border`, `keepTextSize`.
- `expansion-panels` : `panels[] { title, icon, children }`, `multiple`, `openFirst`, `openAll`.

Le serveur traverse récursivement `card`, `banner`, `responsive-grid`, `two-columns`, `tabs`, `expansion-panels` (et `advancedFilters` des catalogues) pour le rendu markdown, le sommaire et le nettoyage des images.

## Blocs fonctionnels (rappel)

`search`, `topics`, `metrics` (déprécié), `contact`, `custom-agent` (beta) ; `datasets-catalog`, `datasets-list`, `dataset-card`, `dataset-table`, `dataset-form`, `dataset-download` ; `applications-catalog`, `applications-list` ; `reuses-*`, `event-*`, `news-*`. Ces blocs dépendent des fonctionnalités du portail et de ses permissions ; documenter les champs à partir du schéma avant usage.

## Structure éditoriale type

```js
const elements = [
  { type: 'title', uuid: u(), content: 'Titre de la page', titleSize: 'h3', titleTag: 'h2', centered: true, bold: true, anchor: { enabled: true, inToc: false } },
  { type: 'alert', uuid: u(), alertType: 'info', variant: 'tonal', title: 'Pour qui ?', content: '…' },
  { type: 'text', uuid: u(), content: 'Intro : enjeu, réglementation, promesse.\n\nSecond paragraphe.' },
  { type: 'mermaid', uuid: u(), code: '…', description: '…' },
  { type: 'title', uuid: u(), content: '1. Première étape', titleSize: 'h2', titleTag: 'h2', anchor: { enabled: true, inToc: true } },
  { type: 'text', uuid: u(), content: 'Détail de l’étape…' },
  // … une section par étape …
  { type: 'application', uuid: u(), application: { id: '…', title: '…', slug: '…' }, displayMode: 'fixed-height', height: 600, actionButtons: { items: ['fullscreen', 'datasets'] } },
  { type: 'title', uuid: u(), content: 'Pour aller plus loin', titleSize: 'h2', titleTag: 'h2', anchor: { enabled: true, inToc: true } },
  { type: 'text', uuid: u(), content: '- [Ressource 1](https://…)\n- [Ressource 2](https://…)' },
  { type: 'button', uuid: u(), link: { type: 'external', href: 'https://…', title: 'CTA' }, usePortalConfig: true, centered: true }
]
```

Avant de rédiger le contenu : lire les dépôts/sources concernés (README de processing, schéma de config d'app, pages existantes) pour rester factuel. Ne pas inventer de fonctionnalités ni d'URLs.
