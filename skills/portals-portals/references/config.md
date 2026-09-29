# Sections de `config` — champs et valeurs effectives

Source : `portals/api/types/portal-config/schema.ts` et les schémas `portal-config-*`, `common-*-card`, `footer-elements`. Colonne « absent » = ce que le **rendu** fait quand la clé manque (les `default` du schéma ne sont appliqués que par le formulaire du gestionnaire, jamais par l'API ni par le portail).

Propriétés requises de `config` : `title`, `authentication`, `theme`, `header`, `navBar`, `menu`, `breadcrumb`, `footer`, `datasets`, `applications`, `reuses`, `events`, `news`, `contactInformations`, `socialShares`, `socialLinks`, `personal`. Toute clé inconnue est rejetée (`unevaluatedProperties: false`).

## Config initiale d'un portail créé par l'API

```js
{
  title, menu: { children: [] }, authentication: 'optional',
  theme: fillTheme(defaultTheme, defaultTheme),
  header: { show: true, showTitle: true }, navBar: {}, breadcrumb: {},
  linksConfig: { underline: 'always' },
  footer: /* ≥ 2.34 */ { copyright: true, background: { color: 'primary' },
    rows: [{ columns: 1, blocks: [{ type: 'links', align: 'center', display: 'inline',
      items: [{ type: 'standard', subtype: 'sitemap', title: 'Plan du site' }] }] }] },
  // ≤ 2.33.1 : { color: 'primary', socialPosition: 'none', copyright: 'text', logoPrimaryType: 'default',
  //             extraLogos: [], linksMode: 'lines', links: [{ type: 'standard', subtype: 'sitemap', title: 'Plan du site' }], importantLinks: [] }
  datasets: { card: {}, page: { metadata: { actionButtons: ['download', 'api', 'embed', 'notifications', 'attachments', 'table', 'map', 'schema'] } } },
  applications: { card: {}, page: {} }, reuses: { card: {}, page: {} }, events: { card: {} }, news: { card: {} },
  socialShares: ['bluesky', 'x', 'facebook', 'linkedin', 'reddit', 'sms', 'whatsapp'],
  socialLinks: {}, contactInformations: {},
  personal: { navigationColor: 'primary', hidePages: ['contribute', 'processings'], accountPages: [] }
}
```

## Généralités

| Clé | Valeurs | Absent |
| --- | --- | --- |
| `description` | texte | meta description par défaut |
| `allowRobots` | booléen | `robots.txt` = `Disallow: /` |
| `authentication` | `none` / `optional` / `required` | requis |
| `allowedFrameSources` | origines | aucune iframe externe (CSP `frame-src`) |
| `allowedFrameAncestors` | origines | portail non intégrable en iframe |
| `bodyFontFamily` / `headingFontFamily` | nom de `GET /fonts` | Nunito / police principale |
| `logo`, `logoDark`, `favicon` | `{ _id, name, mimeType, mobileAlt? }` | pas de logo ; `/favicon.ico` en 404 |
| `errorImages` | `notFound`, `forbidden`, `fallback` | illustrations intégrées par défaut |
| `linksConfig` | `underline` (`always`, `always-grow`, `hover-grow`, `hover`, `never`), `color`, `underlineColor` | — |
| `navLinksConfig` | `buttonConfig` (variante `default`/`outlined`/`tonal`, couleurs, `hoverEffects`) | — |
| `defaults` | `elevation` 0–3, `density` `default`/`comfortable`/`compact`, `rounded` `0`/`default`/`lg`/`xl`, `hover { effects, color }` | cartes plates, pas d'effet commun |
| `topics[]` | `{ id, title, description?, thumbnail? }` (liste reprise des paramètres data-fair du propriétaire) | — |
| `labelsOverrides`, `analytics { tracker, mergeDatasetAppPaths }`, `personal`, `agentChat` (superadmin) | | |

## Entête, barre de navigation, fil d'Ariane

| Clé | Valeurs | Absent |
| --- | --- | --- |
| `header.show` | booléen | pas d'entête |
| `header.showTitle` | booléen | pas de titre (ni de `<h1>`) |
| `header.logoPrimaryType` | `default` (logo global) / `local` (`logoPrimary`, `logoPrimaryMobile`) / `hidden` | logo global |
| `header.logoPrimaryCentered`, `logoPrimaryLink`, `logoSecondary(Link)`, `color`, `keepOnScroll`, `showSocial` | | |
| `headerHomeActive` + `headerHome` | variante d'entête pour l'accueil (fusionnée sur `header`) | |
| `navBar.fluid` | booléen | **pleine largeur** |
| `navBar.align` | `left` / `center` | centré |
| `navBar.tabsStyle` | `boldTitle`, `uppercaseTitle`, `largerFont` | normal |
| `navBar.color`, `sliderColor`, `loginColor` | tokens de couleur | `loginColor` vide = couleur de la barre |
| `navBar.logoType` | `default` / `local` (`logo`, `logoMobile`) / `hidden` | |
| `navBar.transparent`, `keepOnScroll` | booléens | |
| `navBarHomeActive` + `navBarHome` | variante pour l'accueil | |
| `breadcrumb.position` | `none`, `below-nav`, `above-footer`, `both` | masqué |
| `breadcrumb.showHome`, `homeLabel`, `fluid`, `compact`, `separator { type: text|icon, text, icon, color }` | | |

## Pied de page

### Forme ≤ 2.33.1

Requis : `color`, `copyright` (`text`|`logo`), `logoPrimaryType` (`default`|`header`|`local`|`hidden`), `extraLogos`, `linksMode` (`lines`|`columns`), `links`, `importantLinks`.

Autres : `logoPrimary`, `logoPrimaryDark`, `logoPrimaryLink`, `logoPosition` (`main`|`left`), `logoAlignment` (`left`|`center`|`right`), `slogan`, `sloganColor`, `sloganPosition`, `sloganAlignment`, `text` (markdown → `text_html`), `textPosition`, `backgroundImage`, `backgroundImageLocation` (`left`|`center`|`right`|`repeat`), `socialPosition` (`none`|`main`|`left`). `extraLogos[]` : `{ logo, label, link? }` (`logo` et `label` requis). `links[]` / `importantLinks[]` : items de lien (même union que le menu, sans sous-menu).

### Forme ≥ 2.34 (lignes)

```json
{
  "copyright": true,
  "background": { "color": "primary" },
  "rows": [
    { "columns": 3, "gutter": "default", "align": "start",
      "blocks":  [{ "type": "images", "align": "left", "height": 48, "items": [{ "source": "global", "label": "Logo" }] }],
      "blocks2": [{ "type": "links", "align": "left", "display": "list", "items": [{ "type": "standard", "subtype": "legal-notice", "title": "Mentions légales" }] }],
      "blocks3": [{ "type": "social", "align": "right" }] },
    { "columns": 1, "blocks": [{ "type": "text", "align": "center", "markdown": true, "content": "Données publiées sous Licence Ouverte." }] }
  ]
}
```

- Ligne : `columns` 1|2|3 ; `disposition` (`equal`|`left`|`right`, 2 colonnes) ; `gutter` (`none`|`dense`|`default`) ; `align` vertical (`start`|`center`|`end`) ; `background` (couleur vide = fond du pied de page) ; `blocks`, `blocks2`, `blocks3` (les colonnes non affichées restent stockées).
- Blocs (tous `additionalProperties: false`, `mb` optionnel) :
  - `images` : `align`, `height` (16–200, défaut 40), `items[] { source: upload|global|header|koumoul, label, image?, imageDark?, link? }` ;
  - `text` : `align`, `markdown` (requis), `content`, `color` (le serveur calcule `content_html`) ;
  - `links` : `align`, `display` (`inline`|`list`|`columns`), `items[]` ;
  - `buttons` : `align`, `variant` (`text`|`outlined`|`tonal`|`flat`|`elevated`), `items[]` ;
  - `social` : `align`, `title?` (réseaux de `socialLinks`) ;
  - `divider` : `align`, `opacity` (0.1–1), `thickness`, `color`.
- Mention Koumoul : `copyright: true` ou un item `images` `source: 'koumoul'` (sinon `400` hors marque blanche). Un portail dupliqué sans mention repasse `copyright: true`.

## Vignettes

| Clé (`datasets.card`, `applications.card`) | Valeurs | Absent au rendu |
| --- | --- | --- |
| `actionsLocation` | `right` / `bottom` / `none` | **aucune action** |
| `actionsStyle` | `icon` / `full` / `text` | texte seul |
| `showSummary` | booléen (champ `summary`) | pas de résumé |
| `showDepartment` | booléen | pas de propriétaire |
| `titleLinesCount` | `1` / `2` / `0` (illimité) | |
| `thumbnail.show`, `location` (`left`/`top`/`center`), `crop`, `default` (datasets), `useTopic`, `useApplication` (datasets), `useSummary` | | pas d'image |
| `topics { show, color, variant, elevation, density, rounded, showIcon, iconColor }` | | pas de thématiques |
| `keywords { show, color, variant, … }` (datasets) | | pas de mots-clés |
| `elevation`, `rounded`, `hover` | | hérités de `defaults` |
| `openInFullPage` (applications) | booléen | |

`reuses.card` : `showSummary`, `showAuthor`, `thumbnail`, `titleLinesCount`, style — pas d'actions. `news.card` : `showDescription`, `thumbnail { …, useDescription }`, style — pas d'actions.

## Page d'un jeu de données (`datasets.page`)

| Clé | Valeurs | Absent au rendu |
| --- | --- | --- |
| `metadata.location` | `right` / `top` / `bottom` | colonne pleine largeur |
| `metadata.actionButtons` | ⊂ `download, api, embed, notifications, attachments, table, map, schema` | aucun bouton |
| `metadata.actionsStyle` | `icon` / `full` / `text` | texte seul |
| `metadata.showDepartment`, `showAttachments`, `rounded`, `elevation` | | masqué |
| `applications.display` | `none` / `card` / `full-list` / `side-by-side` | **section absente** |
| `reuses.display` (+ `inviteUserReuses`) | `none` / `card` | section absente |
| `relatedDatasets.display` | `none` / `card` | section absente |
| `*.columns`, `*.useGlobalCard` (absent = vignette globale), `*.card` | | |
| `showData`, `showImage`, `showAttachments`, `titleStyle`, `topics`, `keywords` | | |

## Page d'une visualisation (`applications.page`)

| Clé | Valeurs | Absent au rendu |
| --- | --- | --- |
| `datasets.display` | `none` / `card` | pas de « Données utilisées » |
| `metadata.showBaseApplication` | booléen | **affiché** (masqué seulement si `false`) |
| `metadata.actionsStyle` | `icon` / `full` / `text` | texte seul |
| `metadata.location`, `showDepartment`, `rounded`, `elevation`, `showImage`, `titleStyle`, `topics` | | |

## Contact et réseaux

- `contactInformations` : `email` (retiré de `/portal/api/portal`, destination du formulaire de contact ; vide = contact global de la plateforme), `phone`, `phoneLabel`, `website`, `websiteLabel`, `infos` (markdown → `infos_html`).
- `socialLinks` : `bluesky`, `x`, `facebook`, `linkedin` (page entreprise), `instagram`, `youtube`, `vimeo` — **identifiants**, l'URL est construite par le portail.
- `socialShares` : réseaux proposés au partage d'une page.
