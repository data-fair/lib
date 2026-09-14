# Composition et rendu d'une page

`elements.md` décrit les **champs** des blocs, ce document décrit le **rendu** : comment composer une page qui tient debout visuellement dans le thème du portail. Toutes les valeurs citées viennent du code de `data-fair/portals` ; en cas de doute, relire le fichier indiqué plutôt que deviner.

## Sommaire

1. Ce que la page peut décider (et ce qu'elle ne peut pas)
2. Lire le portail avant de composer
3. Méthode en deux passes
4. Recettes de composition
5. Propriété → rendu : ce qui change vraiment l'aspect
6. Typographie, hiérarchie, ancres
7. Rythme, largeurs, responsive
8. Thèmes et contraste
9. Relecture visuelle

## 1. Ce que la page peut décider

Le rendu appartient au portail, pas à la page :

- **Aucune couleur en dur, aucune police, aucun CSS.** Les propriétés `color`, `background.color`, `line.color`, `hover.color` n'acceptent que des **tokens du thème** (`primary`, `secondary`, `accent`, `info`, `success`, `error`, `warning`, `surface`, `surface-inverse`, `background` selon la propriété — `api/types/common-defs/schema.ts:234-330`). La typo est celle du portail (`bodyFontFamily`/`headingFontFamily`), appliquée globalement.
- **Le markdown est sanitisé.** Pas d'`iframe`, pas de `style=`, pas d'attribut de classe. Aucun contournement.
- **Le thème est dynamique.** Une page correcte rend dans les quatre thèmes (`default`, `dark`, `hc`, `hc-dark`), y compris sur un portail qui change ses couleurs. C'est la raison d'être des tokens : une page qui ne code rien en dur s'adapte toute seule.

Tout le « design » se joue donc sur : **composition, rythme, hiérarchie, images et contenu**. Les recettes CSS d'autres contextes (polices signatures, dégradés, animations) ne s'appliquent pas ici.

## 2. Lire le portail avant de composer

`GET /portal/api/portal` (public) donne la config publiée. À relever avant d'écrire la page :

| Réglage | Ce qu'on en déduit |
| --- | --- |
| `config.header.show` | Si `true`, le layout rend déjà un `<h1>` (titre du portail) : la page ne doit pas en ajouter un. |
| `config.theme.colors`, `bodyFontFamily`, `headingFontFamily` | L'ambiance (couleur dominante, serif/sans). Choisir les tokens en conséquence : une page à fond `primary` très saturé ne convient pas à tous les portails. |
| `config.defaults` | `elevation`, `rounded`, `density`, `hover` hérités par les cartes et boutons. Sur un portail neuf, `defaults` est **absent** : les cartes rendent plates avec bordure. |
| `config.linksConfig` | Style des liens markdown (soulignement, couleur). |
| `config.breadcrumb.position` | Le fil d'Ariane est-il affiché, et où. |
| `config.allowedFrameSources` | Quels domaines externes sont autorisés dans un bloc `iframe` (`frame-src`). |
| `fluid` de la **page** (`page-config.fluid`, pas du portail) | `true` = contenu pleine largeur ; le sommaire passe alors en bouton flottant au lieu d'un volet latéral (`layout/page-toc.vue:3`). |

Sur l'accueil, vérifier aussi `config.headerHomeActive` / `config.headerHome` : l'en-tête peut changer sur la home (`layout-app-bar.vue:38-41`).

## 3. Méthode en deux passes

**Passe 1 — le parti pris.** Répondre en trois lignes : qui lit la page, ce qu'il doit comprendre en 30 secondes, quelle est l'action finale. Une page a **un** job : une page de cours, une page de référence et une page de vente n'ont pas la même composition.

**Passe 2 — la trame.** Lister les sections en une ligne chacune, puis relire la trame avec la question anti-gabarit : « une autre page de ce portail pourrait-elle recevoir exactement cette structure ? » Si oui, remplacer au moins une section par une composition dictée par le contenu (le diagramme Mermaid comme pièce centrale, une frise d'étapes, une carte à côté du texte, un listing réel).

Calibrage des pages génériques, à éviter sauf justification par le contenu :

- titre centré + intro + une suite de paragraphes + un bouton, sans relief ;
- une grille de trois cartes identiques parce que « trois c'est bien » ;
- des numéros 01/02/03 sur du contenu qui n'est **pas** une séquence : un marqueur structurel doit encoder une information vraie.

Dépenser le relief à **un** endroit (hero, diagramme, intégration, carte), et garder le reste sobre. Un effet partout n'est plus un effet.

Puis construire : builders d'`elements.md`, trois appels API de `api-workflow.md`.

## 4. Recettes de composition

### Hero d'accueil (bannière pleine largeur)

```js
{
  type: 'banner', uuid: u(), mb: 0, fullWidth: true, pt: 10, pb: 10,
  background: { color: 'primary' },
  children: [
    { type: 'title', uuid: u(), titleSize: 'h2', titleTag: 'h1', centered: true, bold: true, content: '…' },
    { type: 'text', uuid: u(), centered: true, mb: 0, content: 'Sous-titre court : à qui ça sert, ce qu’on y trouve.' }
  ]
}
```

- `bg-primary` pose aussi la couleur de texte lisible (`on-primary`) : **ne pas** ajouter `color` aux titres du bandeau, ça la remplacerait.
- Variante image : bloc `image` avec `banner: true`, `wideImage`, `cover: true`, `height: 320…480`, `fetchPriority: true`, `isPresentation` si purement décorative.
- `fullWidth` n'agit **qu'à la racine de la page** (`page-element-banner.vue:5`) ; le fond déborde, le contenu reste dans le conteneur.
- Un hero en premier bloc racine subit `mt-n4` automatique (compensation du padding de page) : ne pas essayer de le « décoller » avec des marges.

### Titre de section

```js
{
  type: 'title', uuid: u(), content: 'Publier un jeu de données',
  titleSize: 'h5', titleTag: 'h2',
  line: { position: 'bottom-small', color: 'primary' },
  anchor: { enabled: true, inToc: true }
}
```

`line.color` est **obligatoire** dès qu'un trait est demandé (sinon la couleur CSS est invalide et rien n'apparaît). Convention : ancres sur les H2/H3, **jamais** sur le H1 de page ; le trait sous le titre remplace avantageusement un titre maquillé via markdown.

### Section sur fond contrasté

```js
{ type: 'banner', uuid: u(), fullWidth: true, mb: 0, pt: 8, pb: 8,
  background: { color: 'surface' }, children: [ /* titre + texte + cartes */ ] }
```

`surface` (ou `background`) crée une respiration douce sans casser la palette ; `primary`/`accent` pour une section manifeste. `overflowTop`/`overflowBottom` font chevaucher le fond sur les blocs voisins (marges négatives de `pt`/`pb`). `pt`/`pb` vont de 4 à 16 (16 à 64 px) ; 8–12 pour une section aérée.

### Grille de cartes (piliers, étapes, ressources)

```js
{ type: 'responsive-grid', uuid: u(), columns: 3, gutter: 'default', align: 'stretch',
  children: [
    { type: 'card', uuid: u(), mb: 0, border: true, rounded: 'lg', elevation: 1, contentAlign: 'start',
      hover: { effects: ['darken', 'elevate', 'titleUnderlineAnimated', 'imageZoom'], color: 'primary' },
      children: [ { type: 'title', uuid: u(), titleSize: 'h6', titleTag: 'h3', content: '…' },
                  { type: 'text', uuid: u(), mb: 0, content: '…' } ],
      actions: [] } // requis, même vide
  ] }
```

- Colonnes réellement rendues (`page-element-responsive-grid.vue:46-54`) :

  | `columns` | lg | md | sm | mobile |
  | --- | --- | --- | --- | --- |
  | 2 | 2 | 2 | 1 | 1 |
  | 3 | 3 | 2 | 2 | 1 |
  | 4 | 4 | 4 | 3 | 1 |
  | 6 | 6 | 4 | 3 | 2 |

- `align: 'stretch'` + `contentAlign: 'start'` = cartes de même hauteur, contenu aligné en haut (le défaut centre, ce qui flotte mal dans une grille).
- Une carte n'a d'effet de survol **que si elle porte un `link`** (`page-element-card.vue:4-7`) ; sans lien, rester sobre.
- `link` rend toute la carte cliquable via un overlay : les liens et boutons internes restent cliquables.
- `thumbnail.location: 'top'` rend l'image sur 170 px fixes ; `'left'` occupe une colonne (passe au-dessus sur mobile).

### Deux colonnes (contenu + encart)

`disposition: 'left'` = 8/4 (contenu large à gauche), `'right'` = 4/8, `'equal'` = 6/6 ; toujours empilé sur mobile. `align: { right: 'stretch' }` pour qu'une carte encart prenne la hauteur de la colonne.

### FAQ / détails

```js
{ type: 'expansion-panels', uuid: u(), multiple: true, rounded: 'lg', elevation: 1,
  panels: [ { title: 'Question ?', children: [ /* texte */ ] } ] }
```

Laisser `openFirst`/`openAll` absents (repliés) : une FAQ ouverte d'emblée repousse le contenu. `titleBackgroundColor` vaut `surface` par défaut.

### Listing éditorial

Une ligne markdown par entrée, **re-triée** avant publication (voir `SKILL.md`, §5). Préférer un bloc `divider` (`my-4` fixe) entre les entrées plutôt qu'une ligne `---` markdown. Un listing vivant (mis à jour souvent) est une application DataFair (`list-details`) branchée sur un jeu de données, pas du contenu figé.

### Appel à l'action

```js
{ type: 'button', uuid: u(), centered: true, mb: 0, usePortalConfig: true,
  link: { type: 'external', href: '…', title: 'Échanger sur vos données' } }
```

`usePortalConfig: true` reprend le style de bouton du portail. Un seul CTA primaire par page ; le libellé est un verbe (`S’inscrire`, `Télécharger`, `Nous contacter`) — jamais « Cliquez ici ».

## 5. Propriété → rendu : ce qui change vraiment l'aspect

| Intention | Propriété | Rendu réel | Piège |
| --- | --- | --- | --- |
| Trait sous/à gauche d'un titre | `line.position` + `line.color` | Trait de 4 px ; `bottom-small` = 80 px qui s'étire au survol si `growOnHover` + lien ; `bottom-medium` = largeur du texte ; `bottom-large` = filet pleine largeur | Sans `line.color`, couleur `undefined` → **aucun trait** (`layout-title.vue:18,54,118`) |
| Teinte sur image de fond | `background.image` + `background.color` + `tintStrength` (0–1, défaut 0.8) | Voile coloré sur l'image, texte lisible par-dessus | Il faut **la couleur ET l'image** : sinon la teinte ne rend pas (`page-element-banner.vue:14-17`) |
| Bandeau image plein écran | `image.banner` + `wideImage` + `cover` + `height` | Bandeau bord à bord | `banner` sans `wideImage` retombe sur `image` ; `cover` sans `height` pose `height:100%` dans un parent auto → aucun recadrage |
| Image haute recadrée | `cover: true` + `height` | Recadrage au ratio demandé | `cover` **sans** `height` : `height:100%` dans un parent auto → recadrage invisible (`page-element-image.vue:138-144`). Sans `cover`, `height` rogne (calculer, voir `elements.md`) |
| Espacement entre blocs | `mb` | Non renseigné = 16 px (`mb-4`) ; 1…16 = 4…64 px ; `mb: 0` = aucun | `title` et `divider` **n'ont pas de `mb`** : titres = marges auto, divider = `my-4`. Ajuster les blocs voisins |
| Marges des titres | automatiques selon `titleSize` | `h6` → `mb-2` (8 px) … `h1` → `mb-7` (28 px), et `my-*` si le titre n'est pas le premier (`page-element-title.vue:68-85`) | Ne pas essayer de régler `mb` sur un titre : la clé est guérie à la validation |
| Alerte colorée libre | `alertType: 'none'` + `color` + `icon` | Bandeau à la couleur du thème | Avec un `alertType` sémantique, `color` est **ignoré** (`page-element-alert.vue:6`) |
| Filet / séparateur | `divider` (recommandé : `opacity: 0.2`, `thickness: 1`, `rounded: true`) | `my-4` (16 px) de part et d'autre, toujours | Pas de `mb` pour l'espacer autrement |
| Carte cliquable + survol | `link` + `hover.effects` | Défaut `darken` (assombrit) ; `elevate` (+2, plafond 5) ; `grow` (échelle 1.02) ; `titleUnderlineAnimated`, `imageZoom` (1.05) ; `background`/`border` teintent | Effets **inertes sans `link`** ; `darken` par défaut, `effects: []` pour couper ; `prefers-reduced-motion` neutralise tout |
| Élévation / arrondi | `elevation` (0–3), `rounded` (`0`, `default`, `lg`, `xl`) | Hérités de `config.defaults` du portail quand absents | Portail neuf sans `defaults` → VCard plate bordée |
| Chevauchement de sections | `banner.overflowTop` / `overflowBottom` | Le fond mord sur le bloc précédent/suivant | `mb` est masqué dans l'éditeur quand `overflowBottom` ; c'est voulu |
| Premier / dernier bloc racine | — | `banner` et `image` racines reçoivent `mt-n4` / `mb-n4` (`page-element-banner.vue:7-8`) | Ne pas ajouter de marge pour « coller » le hero en haut |
| Priorité de chargement | `image.fetchPriority: true` | `fetchpriority="high"` | Réservé aux images visibles au premier écran ; partout ailleurs c'est contre-productif |
| Onglets | `tabs` | `v-tabs color="primary"`, `grow`/`align`/`border` | La couleur des onglets n'est pas configurable |
| Panneaux dépliants | `expansion-panels` | Variante accordéon non configurable | Seuls `multiple`, `openFirst`, `openAll`, couleurs de fond sont réglables |

## 6. Typographie, hiérarchie, ancres

Échelle réelle des titres de page (`layout-title.vue:147-198`) :

| `titleSize` | Taille | Usage type |
| --- | --- | --- |
| `h1` | 96 px / 6 rem | Uniquement le hero, s'il n'y a pas de H1 d'en-tête |
| `h2` | 60 px / 3.75 rem | Très grand titre de page |
| `h3` | 48 px / 3 rem | Titre de page standard (défaut) |
| `h4` | 34 px / 2.125 rem | Titre de section fort |
| `h5` | 24 px / 1.5 rem | Titre de section courant |
| `h6` | 20 px / 1.25 rem | Titre de carte, de bloc, sous-section |

- `titleSize` = apparence, `titleTag` = balise HTML ; les deux sont indépendants. `titleTag` par défaut = `titleSize`.
- **Un seul `<h1>` par page.** Si `header.show` (ou l'en-tête de la home) est affiché, il en rend déjà un : le titre de page prend `titleTag: 'h2'` (visuel `h3`). Sinon la page peut le porter (`titleSize: 'h2'`, `titleTag: 'h1'` pour un hero).
- Éviter d'habiller un titre avec du markdown : dans un bloc `text`, `#` devient un `<h2 class="text-display-medium text-primary mt-12 mb-8">` (marges et couleur non maîtrisées, `lib/packages/utils/marked-vuetify.ts:64-72`). Les blocs `title` existent pour ça.
- Ancres : `anchor: { enabled: true, inToc: true }` sur chaque H2/H3. Le serveur recalcule `_toc` à chaque PATCH ; `anchor.label` raccourcit l'entrée. Depuis que le sommaire existe, une page longue sans sommaire se lit mal.
- Contenu markdown : listes et tableaux bienvenus, paragraphes courts, un lien par phrase plutôt que des URL nues.

## 7. Rythme, largeurs, responsive

- **Conteneur** (Vuetify `VContainer.css`, vu dans `lib/node_modules/vuetify`) : 700 px (≥ 840), 1000 px (≥ 1145), 1400 px (≥ 1545), 2000 px (≥ 2138), padding 16 px ; `page.fluid: true` passe à 100 %. Sur écran large, un texte courant posé sur toute la colonne dépasse vite la longueur confortable : au-delà de quelques lignes, préférer une composition en deux colonnes ou un encadré plutôt qu'un pavé de 1000 px.
- **Rythme vertical** : un espacement de 16 px par défaut entre blocs. Pour des sections, viser `mb: 6` (24 px) à `mb: 8` (32 px) ou un `banner` avec `pt`/`pb`. Des blocs collés se lisent comme une page non finie, des écarts de 64 px partout comme un gabarit.
- **Gutters** : `none`, `dense` (16 px), `default` (24 px).
- **Responsive à vérifier, pas à supposer** : la grille et les colonnes s'empilent, mais un titre `h2`/`h1`, un tableau large ou deux cartes côte à côte peuvent déborder. `h1` à 96 px ne tient pas dans une colonne étroite.
- Le sommaire occupe un volet à droite en `lg` **et** hors `fluid` ; sur mobile et en pleine largeur, c'est un bouton flottant en haut à droite.

## 8. Thèmes et contraste

- Quatre thèmes sont possibles (`default`, `dark`, `hc`, `hc-dark`, plugins Vuetify du portail) : une page publiée peut être vue dans n'importe lequel. Les tokens s'adaptent, une valeur codée en dur ne le ferait pas — d'où l'interdiction absolue.
- `bg-<token>` pose le fond **et** la couleur de texte `on-<token>` correspondante : dans un bandeau coloré, ne pas re-colorer les textes à la main.
- Sur fond neutre, les titres colorés (`color: 'primary'`…) sont le seul accent de couleur recommandé, avec parcimonie : un accent partout n'accentue rien.
- Alertes : préférer les types sémantiques (`info`, `success`, `error`, `warning`) à une couleur libre ; leur contraste est géré par le thème.
- Diagramme Mermaid : rendu avec le thème du portail, directive `%%{init}%%` pour neutraliser les fonds (voir `mermaid.md`).
- Contrôle minimal : ouvrir la page en mode sombre (cookie de thème du portail ou `prefers-color-scheme`), et si l'instance le propose en contraste renforcé — c'est le thème le plus exigeant pour les titres colorés et les images de fond.

## 9. Relecture visuelle

À faire après publication, en plus des contrôles de `SKILL.md` §9 (SEO, images, console) :

- capturer en desktop (1440 px) **et** en mobile ; juger les tailles de titre, les grilles et les empilements sur les captures, pas dans l'inspecteur ;
- vérifier la **hiérarchie** : un seul H1, pas de saut H2 → H4, un titre par section, aucune section orpheline en fin de page ;
- vérifier le **rythme** : aucun bloc collé par accident, aucun « trou » de plusieurs centaines de pixels, aucun double espacement entre le `pt`/`pb` d'une section et le `mb` du bloc voisin ;
- vérifier ce qui **déborde** : titres longs, tableaux markdown, captures d'écran, iframes, cartes de grille ;
- vérifier le **contraste** dans les quatre thèmes si possible, au minimum `default` et `dark` : titres colorés sur fond coloré, textes posés sur une image (`tintStrength` trop faible), alertes ;
- relire une dernière fois avec les yeux d'un visiteur pressé : la promesse de la page est-elle visible sans défiler, et l'action finale est-elle évidente ?
