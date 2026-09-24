# Accessibilité RGAA des applications DataFair

Les applications DataFair sont majoritairement embarquées dans des portails du secteur public, soumis au RGAA 4.1. Une application non conforme rend non conforme **toutes** les visualisations qui l'utilisent : une seule brique `app-charts` porte plusieurs dizaines de visualisations sur un portail donné.

Ce document liste les défauts constatés sur le parc et les corrections attendues. Les références de code pointent vers les dépôts `data-fair`, `capture` et `portals`.

## Le document embarqué est une page web à part entière

Une visualisation est servie par le proxy à `/data-fair/app/<id>` et affichée dans une iframe du portail. C'est un **document autonome** : il n'hérite ni de la langue, ni du `<main>`, ni des titres de la page porteuse. Tous les critères RGAA de niveau page s'y appliquent séparément.

Conséquence pratique : la page du portail peut être parfaitement structurée et l'iframe rester un trou noir. C'est le cas par défaut d'une visualisation qui rend dans un `<canvas>` : son arbre d'accessibilité est **vide**, un lecteur d'écran ne restitue rien.

## Structure du document — critères 9.2, 12.6

Le standard HTML5 et le RGAA exigent que tout le contenu principal soit contenu dans une zone de regroupement `<main>` unique par document (règles `axe-core` `region`, `landmark-one-main` et `landmark-no-duplicate-main`).

**Piège du double `<main>` avec Vuetify :**
Dans une application Vue basée sur Vuetify 3/4, le composant `<v-main>` placé dans `App.vue` génère **déjà nativement** une balise `<main class="v-main">` dans le DOM.

- **Si l'application utilise `<v-main>` (cas nominal DataFair) :** `index.html` doit utiliser `<div id="app" style="height:100vh"></div>`. Mettre `<main id="app">` provoquerait l'imbrication d'un `<main>` dans un autre `<main>` (`<main id="app"> ... <main class="v-main">`), ce qui constitue une violation d'accessibilité (`landmark-main-is-top-level`).
- **Si l'application n'utilise pas Vuetify (ou sans `<v-main>`) :** `index.html` doit utiliser `<main id="app" style="height:100vh"></main>` pour fournir le landmark principal requis.

```html
<!-- Application Vuetify standard avec <v-main> dans App.vue -->
<body><div id="app" style="height:100vh"></div></body>

<!-- Application Vue sans composant <v-main> -->
<body><main id="app" style="height:100vh"></main></body>
```

Le montage de Vue se fait sur un sélecteur d'identifiant (`app.mount('#app')`), indifférent à la balise. Aucune imbrication possible avec le `<main>` du portail hôte, l'iframe étant un document distinct.

## Langue — critères 8.3, 8.4

Ne pas déclarer `lang` sur `<html>`. Le proxy DataFair filtre l'attribut déclaré puis le repose depuis la locale de la requête (`data-fair/api/src/applications/proxy.ts`). Une valeur codée en dur est au mieux inopérante, au pire fausse.

Le validateur W3C émettra un avertissement « Consider adding a lang attribute » : c'est attendu, il porte sur la source et non sur le document servi.

**Limite connue, rien à corriger côté application.** Le `lang` du document et la locale de l'interface sont résolus par deux mécanismes indépendants, qui divergent :

- le proxy pose `req.getLocale()`, négocié depuis l'en-tête `Accept-Language` sur les locales de data-fair (`fr, en`) ;
- l'application rend dans `session.state.lang`, lu depuis le cookie `i18n_lang` avec `fr` par défaut, sans regarder `Accept-Language`.

Constaté en production : sur un navigateur en `en-US` **sans cookie**, le document est servi `lang="en"` alors que l'interface est en français ; avec `i18n_lang=de`, le document est servi `lang="fr"` (locale non supportée par data-fair) alors que l'interface passe en allemand.

Portée réelle : le portail pose lui-même le cookie `i18n_lang` (module i18n de Nuxt, `detectBrowserLanguage.useCookie`), donc **dans le parcours nominal — l'utilisateur arrive par le portail puis ouvre la visualisation — les deux convergent**, vérifié en production. La divergence concerne l'accès sans ce cookie : lien direct vers l'URL de la visualisation, embed sur un site tiers où le portail n'a jamais été visité ou où les cookies tiers sont bloqués, robot d'indexation.

C'est un échec 8.3 / 8.4 réel, mais il se corrige dans data-fair ou simple-directory, jamais dans l'application. Ne surtout pas « réparer » en remettant un `lang` en dur ou en forçant une locale : cela casserait aussi les cas où les deux coïncident.

Traduire les applications ne résout pas ce décalage : dans ce cas l'application rend en français parce que **sa locale de session vaut `fr`**, pas parce qu'elle manque de version anglaise. Une application entièrement traduite rendrait la même chose. En revanche la traduction change le correctif souhaitable : tant que les textes sont français en dur, seul l'alignement du proxy sur la règle de la session est tenable ; une fois les applications traduites, faire lire l'`Accept-Language` à la session devient la meilleure option, puisqu'un visiteur anglophone obtiendrait réellement l'anglais.

## Titre du document — critères 8.5, 8.6

Le `<title>` déclaré dans `index.html` est statique : identique pour toutes les visualisations d'une même brique, il ferait annoncer le même titre par un lecteur d'écran sur des dizaines de pages différentes — et, vérifié en production avant correction, une visualisation « Graphiques divers » était servie sous le titre `data-fair-charts`.

**Comme `lang`, le titre est désormais réécrit par le proxy** (`api/src/applications/proxy.ts`) : le `<title>` de la brique est remplacé par le titre de l'application servie, et inséré si la brique n'en déclare aucun. C'est donc le titre de la visualisation qu'annoncent l'onglet et les technologies d'assistance.

Rien à faire côté application : le `<title>` du dépôt ne sert plus qu'au catalogue (nom de modèle lisible anglais — `Charts`, `Dashboards`, `Treemap` — jamais un slug de paquet ni le nom du dépôt), et toujours aucun appel à `document.title` à ajouter.

## Type de document (DOCTYPE) — critère 8.1

Tout document HTML5 doit impérativement commencer par la déclaration `<!DOCTYPE html>` sur la toute première ligne (avant tout commentaire ou espace). Elle est obligatoire pour que le navigateur fonctionne en mode de rendu standard et n'active pas le mode Quirks (critère RGAA 8.1).

## Validité du code source — critère 8.2

Un seul `<title>` dans `<head>` et une seule `<meta name="description">` par document. Les dupliquer avec un attribut `lang` pour porter l'i18n est invalide en HTML et produit deux erreurs de validation W3C :

- `A document must not include more than one meta element with its name attribute set to the value description`
- `Element title not allowed as child of element head in this context`

Sur une migration ou une reprise, supprimer les doublons. L'i18n du catalogue passera par registry, qui porte `title` et `description` en objets `{ en, fr }`.

Le proxy supprime **tous** les `<title>` déclarés avant de poser le sien, donc un doublon de titre ne survit pas dans le document servi. Ce n'est pas une raison de le laisser dans la source : la validation W3C porte sur le dépôt, et l'import au catalogue lit bien l'`index.html` d'origine — avec ses doublons, qu'il départage par `lang`.

`<meta charset>` doit rester dans les **1024 premiers octets** du document : un bloc de commentaire placé avant suffit à le repousser et à provoquer une erreur.

## Rendu graphique — le gros morceau

C'est ici que se concentre l'essentiel des non-conformités. La difficulté dépend entièrement de la technologie de rendu.

| Rendu | Ce qui est possible | Critères en jeu |
|---|---|---|
| **`<canvas>`** (chart.js, maplibre, pixi) | rien à corriger sur place, le DOM est vide → il faut **fournir un équivalent explicite** | 1.1, 1.6, 4.8, 4.9, 7.1, 7.2, 7.3, 10.4, 10.13, 12.11, 3.2 |
| **`<svg>`** (d3, apexcharts) | accessible **sur place** : `role`, `aria-label`, `<title>` par élément, éléments focusables | 1.1, 3.1, 7.3 |
| **HTML/DOM** | structurellement sain, reste les contrôles Vuetify | 10.7, 11.1, 3.2 |

Un rendu SVG satisfait gratuitement le critère 10.4, son texte suivant le zoom et les préférences utilisateur. C'est un argument de fond au moment de choisir une bibliothèque de graphiques.

### Alternative textuelle — critères 1.1, 1.6, 4.8, 4.9

Un `<canvas role="img">` sans `aria-label`, sans `aria-labelledby` et sans contenu de remplacement n'apparaît pas dans l'arbre d'accessibilité. Le contenu de remplacement d'un canvas — ce qu'on met entre `<canvas>` et `</canvas>` — est ce que restituent les technologies d'assistance : un `<p></p>` vide ne restitue rien.

Ce qu'il faut fournir :

1. un nom accessible reprenant le titre du graphique ;
2. un **tableau de données équivalent**, visible ou dépliable, sous la visualisation. Un lien vers le jeu de données brut ne constitue pas une description du graphique.

### Accès clavier — critères 7.1, 7.3, 10.13, 12.11

Un canvas sans `tabindex` ne reçoit jamais le focus : la tabulation traverse l'iframe sans s'y arrêter, et tout ce qui dépend du survol devient inatteignable — infobulles de valeurs, bascule des séries par clic sur la légende.

Attendu :

- graphique focusable (`tabindex="0"`) avec indicateur de focus visible ;
- parcours des points de données au clavier ;
- légende activable au clavier ;
- infobulles masquables par Échap, persistantes au survol, déclenchables au focus. Les infobulles dessinées dans le canvas ne satisfont aucune de ces trois conditions.

Cas des cartes : maplibre pose déjà `role="region"`, `aria-label="Map"` et `tabindex="0"` sur son canvas — elles sont donc partiellement accessibles d'origine. Deux correctifs restent : passer le libellé en français via l'option `locale` de maplibre, et fournir la liste des entités en alternative textuelle.

### Agrandissement du texte — critère 10.4

Le texte dessiné dans un canvas est rasterisé : titres, légende et libellés d'axes ne réagissent pas à un agrandissement du texte seul à 200 %. Vérification : appliquer `font-size:200%` sur `<html>` et comparer l'empreinte du canvas avant/après — si elle est identique, le critère est non conforme.

Correction : indexer la taille des polices du graphique sur la taille de police du document, ou produire un rendu SVG.

### Couleurs — critères 3.1, 3.2, 3.3

- **3.1** — une série distinguée uniquement par la couleur n'est pas conforme. Doubler le codage : trames, hachures, motifs de points, styles de trait différenciés, étiquettes de données.
- **3.3** — ratio de 3:1 minimum entre séries adjacentes et entre chaque série et le fond. Deux bleus proches d'une même charte descendent facilement à 1,2:1.
- **3.2** — le texte dessiné dans un canvas échappe à toute vérification automatique du DOM. Il doit être contrôlé visuellement, à 4,5:1 minimum sur le fond.

Les palettes proposées par défaut dans le schéma de configuration doivent respecter ces seuils : c'est le seul endroit où l'application peut protéger l'utilisateur qui configure sa visualisation.

## Contrôles d'interface — critères 10.7, 11.1

- **10.7** — la prise de focus doit être visible sur **tous** les composants interactifs. Les composants Vuetify avec `outline-style:none`, sans ombre portée et dont le voile de survol reste à opacité 0 en état focus n'affichent aucun indicateur. Vérifier par captures d'écran comparées avec et sans focus, en parcourant réellement à la tabulation — lire le style calculé après un `.focus()` programmatique ne déclenche pas toujours `:focus-visible`.
- **11.1** — tout champ de saisie doit avoir une étiquette associée : `<label for>`, `aria-label` ou `aria-labelledby`. Un `placeholder` ne suffit pas.

## Structuration du contenu — critère 9.1

Pas de titre vide (`<h3></h3>` rendu par un composant dont le contenu est conditionnel), pas de saut de niveau. Un document embarqué qui affiche plusieurs blocs de contenu doit les structurer par une hiérarchie de titres.

## Constats relevés sur le parc

Défauts mesurés sur des applications en production, avec le raisonnement qui permet de les reconnaître ailleurs.

### `role="img"` sur un canvas interactif est contradictoire

`role="img"` transforme l'élément en **feuille** de l'arbre d'accessibilité : tout ce qu'il contient devient invisible pour les technologies d'assistance. C'est le bon rôle pour un graphique statique accompagné d'une alternative — c'est le mauvais rôle pour un graphique dont on attend qu'il expose des points de données navigables.

Constat type : `<canvas role="img">` sans nom accessible, contenant un `<p></p>` vide. Le rôle annonce une image, il n'y a pas d'alternative, et le contenu de remplacement est vide. Trois défauts d'un coup.

Choisir : soit `role="img"` + `aria-label` + alternative textuelle complète hors du canvas, soit un composant réellement navigable, et alors pas de `role="img"`.

### Un tableau de bord, c'est N documents autonomes

Une application de type tableau de bord embarque ses propres sous-applications dans des iframes. Chaque sous-document est une page web à part entière : il lui faut sa langue, sa zone de regroupement, sa structuration de titres. Corriger la coque ne corrige rien à l'intérieur.

Défauts constatés sur ce profil :

- coque déclarant `lang="en"` pour du contenu français, et sous-documents sans attribut `lang` du tout ;
- titres vides `<h3></h3>` rendus par un composant dont le contenu est conditionnel ;
- sauts de niveau de titre entre les blocs.

À l'inverse, un bon point à généraliser : les iframes imbriquées portaient un `title` explicite et distinct — « Centrales prod hydro - Atelier cartographique », « Centrales prod hydro - Treemap ». C'est le critère **2.1 / 2.2**, et c'est une responsabilité de l'application dès qu'elle intègre des vues via `<d-frame>`. Le titre doit décrire la vue, pas la technologie.

### Icônes décoratives : ne pas cumuler les signaux

Constat récurrent sur les composants d'icônes : un SVG portant à la fois `role="img"` et `aria-hidden="true"`. Les deux se contredisent — `aria-hidden` l'emporte, donc le résultat est correct, mais l'intention est illisible et la moindre refonte peut inverser le comportement.

Plus gênant, le cas voisin : un SVG dans un `.v-btn__content` **sans aucun statut** — ni `aria-hidden="true"`, ni `role`/`aria-label`, ni `focusable="false"`. Ni décoratif, ni porteur d'information : indécidable.

Règle : une icône décorative porte `aria-hidden="true"` et `focusable="false"`, sans `role`. Une icône porteuse d'information porte `role="img"` et un `aria-label`, sans `aria-hidden`.

### Composants ARIA sur mesure : la structure requise fait partie du contrat

Défauts relevés sur une sous-application cartographique : champ de type combobox sans nom accessible (`aria-input-field-name`), composant ARIA dont la structure d'enfants requise est absente (`aria-required-children`), bouton sans nom accessible (`button-name`).

Un rôle ARIA impose un contrat complet : nom, état, valeur, et enfants requis. Poser `role="combobox"` sans les éléments attendus produit un composant moins accessible qu'un `<select>` natif. Préférer les composants natifs ou ceux de `@data-fair/lib-vuetify`, dont le contrat est déjà tenu.

### Contenu réservé aux lecteurs d'écran : utiliser `.d-sr-only` de Vuetify

Lorsqu'un texte ou une région dynamique (`aria-live`) doit être accessible aux lecteurs d'écran sans être visible à l'écran (critères 1.1, 7.1), **ne pas recréer de classe CSS maison**. Vuetify intègre nativement dans ses utilitaires :

- `.d-sr-only` : masque visuellement l'élément tout en le conservant dans l'arbre d'accessibilité (position absolute, clip 0, dimension 1px).
- `.d-sr-only-focusable` : masque l'élément mais le rend visible dès qu'il reçoit le focus clavier (idéal pour les liens d'évitement).

> **⚠️ `.d-sr-only` ne fonctionne pas posée sur un `<table>`.** La classe masque en réduisant l'élément à 1 px et en le rognant (`clip`). Or un `display: table` traite `height` comme un **minimum** : le 1 px est ignoré et la table garde sa hauteur de contenu. `clip` masque alors la **peinture**, pas la **mise en page** — la table reste dans le flux et rallonge la zone scrollable du document. Mesuré sur `data-fair-sankey` : `getComputedStyle(table).height` à `1118px` pour une classe qui en demande 1, un document à 2054 px pour une fenêtre de 937, et une barre de défilement de 15 px sur une visualisation censée tenir dans son cadre.
>
> Le tableau de données équivalent, précisément, est une `<table>`. **Poser `.d-sr-only` sur un `<div>` enveloppant**, jamais sur la table elle-même : un `display: block` respecte le 1 px et l'`overflow: hidden` du wrapper contient la table.
>
> ```html
> <!-- la table reste lisible par les technologies d'assistance, sans peser sur le layout -->
> <div class="d-sr-only">
>   <table :id="tableId"> … </table>
> </div>
> ```
>
> Le symptôme trompeur est un **scroll parasite** dont rien dans la visualisation n'explique la hauteur : `.v-main` et le SVG mesurent tous la hauteur de la fenêtre, seul `document.documentElement.scrollHeight` déborde. Le réflexe — un `html { overflow-y: auto !important }` dans `App.vue` — ne traite pas la cause : il rend le débordement scrollable au lieu de le supprimer. Contrôle de non-régression : `document.documentElement.scrollHeight - clientHeight === 0`, avec en regard le contrôle positif que la table compte toujours ses lignes.

### Un `<title>` dans un `<svg>` est aussi une infobulle native

`<title>` est la façon canonique de nommer un SVG dans l'arbre d'accessibilité, et c'est ce que suggère la ligne « `<title>` par élément » du tableau des rendus graphiques. Ce que la spec ajoute, et qu'on oublie : les navigateurs rendent aussi ce `<title>` comme une **infobulle native au survol**, exactement comme l'attribut `title` d'un élément HTML.

La conséquence dépend entièrement d'**où** il est posé :

| Emplacement | Effet |
|---|---|
| Sur la racine `<svg>` | l'infobulle se déclenche sur **toute** la surface de la visualisation et suit le pointeur — elle recouvre l'infobulle applicative, apparaît sur chaque déplacement de souris, et n'apporte rien puisqu'elle répète le nom du graphique |
| Sur un élément interne (une barre, un nœud, un secteur) | **utile** : c'est ce qui redonne un libellé tronqué ou masqué par manque de place, au survol de l'élément concerné |

**Règle** : nommer la racine du SVG avec **`aria-label`**, et réserver `<title>` aux éléments internes dont le libellé visible est tronqué. Les deux mécanismes nomment aussi bien l'un que l'autre pour un lecteur d'écran ; seul `<title>` a l'effet visuel.

```html
<!-- le nom accessible du graphique : aria-label, pas un <title> interne -->
<svg :aria-label="t('sankeyDiagram')" :aria-describedby="tableId">
  <g v-for="node in nodes">
    <!-- utile ici : le libellé du nœud est tronqué pour tenir dans la marge -->
    <title>{{ node.fullLabel }}</title>
    <rect … />
  </g>
</svg>
```

Constaté deux fois sur `data-fair-sankey`, corrigé puis réintroduit par une réécriture — d'où le test de non-régression : `svg > title` doit compter **0**, la racine doit porter un `aria-label` non vide, et les `svg g > title` internes restent attendus.

### Contour de focus sur un tracé SVG : l'`outline` suit la boîte englobante

`outline` sur un élément SVG est dessiné autour de sa **boîte englobante**, pas autour de sa forme. Sur une icône carrée, la différence ne se voit pas. Sur un tracé courbe qui traverse la visualisation — un lien de sankey, un arc de diagramme de cordes — la boîte englobante est un rectangle qui peut dépasser le graphique entier : mesuré sur `data-fair-sankey`, **1691 × 889 px de contour pour un SVG de 1000 × 600, démarrant à x = −345**, donc hors champ.

Le focus clavier reste obligatoire (7.1, 10.13). Le dessiner comme une **copie élargie du tracé**, peinte en dernier pour que rien ne la recouvre :

```html
<template v-if="focusedLink">
  <path :d="focusedLink.path" :stroke-width="(focusedLink.width ?? 0) + 6" stroke="rgb(var(--v-theme-surface))" fill="none" />
  <path :d="focusedLink.path" :stroke-width="(focusedLink.width ?? 0) + 2" stroke="currentColor" fill="none" />
</template>
```

Neutraliser l'`outline` sur **`:focus`** et non `:focus-visible` : Chrome peint aussi le sien sur un simple clic souris, qui ne matche jamais `:focus-visible` sur ces tracés.

### Cartes maplibre : partiellement accessibles d'origine

maplibre pose `role="region"`, `aria-label="Map"` et `tabindex="0"` sur son canvas. Deux conséquences :

- le canvas **est** atteignable au clavier, contrairement à un canvas de graphique — ne pas ajouter de `tabindex` en double ;
- le libellé est en anglais sur une application francophone. Le corriger via l'option `locale` de maplibre, pas en écrasant l'attribut après coup.

Reste à fournir : la liste des entités affichées, en alternative textuelle.

### Ce qui passe mais mérite un regard

- **Reflow 320 px (10.11)** : les graphiques se recalculent, il n'y a pas de défilement bidirectionnel — le critère est conforme. Mais à cette largeur les libellés d'axes deviennent très denses. Conforme n'est pas lisible : prévoir une réduction du nombre de graduations sous un seuil de largeur.
- **Espacement du texte (10.12)** : aucune perte de contenu, donc conforme. Mais le texte d'un canvas ignore purement et simplement les réglages d'espacement imposés par l'utilisateur — il n'en bénéficie pas. Un rendu SVG, si.

### Mesurer le contraste d'un canvas

Le canvas d'une application est same-origin : ses pixels sont lisibles. Pour objectiver un contraste que le DOM ne révèle pas, extraire les couleurs dominantes et calculer les ratios :

```js
const ctx = canvas.getContext('2d')
const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height)
// regrouper les couleurs opaques, trier par fréquence, puis calculer le ratio WCAG
// entre chaque teinte significative et le fond
```

À interpréter avec prudence : les gris très clairs sont la grille et les bordures, pas du texte. Les gris intermédiaires sont des candidats « texte » à confirmer visuellement à la pipette. Ne pas conclure à une non-conformité sur la seule analyse de pixels.

## Vérifier

`axe-core` est le moteur d'accessibilité de Lighthouse et porte des étiquettes RGAA natives (`RGAAv4`, `RGAA-1.1.1`…) exploitables directement.

Points d'attention pour un audit fiable :

- exécuter `axe-core` **dans l'iframe**, pas seulement sur la page porteuse — sinon la visualisation n'est jamais analysée (`frame-tested` en résultat incomplet) ;
- descendre dans les iframes imbriquées : un tableau de bord embarque ses propres sous-applications ;
- l'arbre d'accessibilité est le juge de paix. S'il est vide pour l'iframe de visualisation, aucun réglage de couleur ou de contraste ne compte.

Ce que `axe-core` ne voit pas et qui doit être testé à la main : tout ce qui est dessiné dans un canvas, la visibilité réelle du focus, le comportement des infobulles, et l'agrandissement du texte seul.

## Checklist

- [ ] `<!DOCTYPE html>` en première ligne
- [ ] pas d'attribut `lang` sur `<html>`
- [ ] `<meta charset>` en premier dans `<head>`
- [ ] un seul `<title>`, lisible (nom du modèle, pas un slug), et une seule `<meta name="description">`
- [ ] landmark `<main>` unique (`<v-main>` dans `App.vue` + `<div id="app">`, ou `<main id="app">` sans Vuetify) — pas de `<main>` imbriqués
- [ ] nom accessible sur chaque canvas ou svg porteur d'information
- [ ] tableau de données équivalent accessible depuis la visualisation
- [ ] visualisation atteignable et opérable au clavier, focus visible
- [ ] infobulles masquables par Échap et déclenchables au focus
- [ ] texte du graphique agrandissable à 200 %
- [ ] séries distinguables autrement que par la couleur, ratios ≥ 3:1
- [ ] palettes par défaut du schéma de config conformes
- [ ] champs de saisie étiquetés
- [ ] `axe-core` exécuté dans l'iframe : zéro violation
- [ ] nom accessible du SVG porté par `aria-label`, aucun `<title>` enfant direct de la racine
- [ ] `.d-sr-only` posée sur un `<div>` enveloppant et jamais sur un `<table>` ; `scrollHeight === clientHeight` sur le document
- [ ] contour de focus d'un tracé SVG dessiné comme une copie du tracé, pas par `outline`
