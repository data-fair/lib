# Conventions URL des filtres (interop applications)

Référence canonique pour **sérialiser un filtre sur un champ dans l'URL**, afin que
les applications DataFair s'interopèrent : app-dashboards, apps métier, pages de
portails, embeds. Toute app qui lit ou écrit des filtres dans son URL (ou dans
celle d'un parent/enfant d-frame) doit suivre ces règles.

## Règles de base

**Un filtre = un paramètre de query individuel** `<clé><suffixe>=<valeur>`.
L'API datasets ne supporte **pas** de paramètre JSON `filter=`.

Deux familles de clés :

| Cas | Clé | Portabilité |
|---|---|---|
| Le champ porte un **concept** (`x-concept.primary` du schéma) | `_c_<conceptId>_<op>` | dataset-agnostique |
| Le champ n'a **pas** de concept | `_d_<datasetId>_<fieldKey>_<op>` | scopé à un dataset |

Ces clés couvrent **deux mécanismes** distincts — le filtre (restriction) et la
sélection (désignation d'entités) : voir § « Mode sélection `_s_` » pour le
marqueur `_s_`, le rendu de la sélection et la propagation entre visus.

## 1. Champ avec concept → `_c_<conceptId>_<op>`

```
_c_<conceptId>_<op>=<valeur>
```

- `conceptId` : id d'un concept du vocabulaire standard data-fair
  (`codeDepartement`, `codeCommune`, `siret`, `postalCode`, `date`, `year`, …)
  ou d'un vocabulaire privé du propriétaire.
- L'API REST le résout contre le champ du **dataset cible** qui porte ce concept
  (uniquement les champs marqués `x-concept.primary`).
- **Ignoré silencieusement** si le dataset cible n'a aucun champ portant ce
  concept : une app peut donc émettre un `_c_` sans connaître le dataset du
  récepteur.
- **Jamais préfixé** par un dataset (`_d_...`) : c'est précisément ce qui le rend
  réutilisable entre datasets.
- L'app réceptrice déclare `<meta name="df:filter-concepts" content="true">`
  pour recevoir ces filtres (sinon DataFair ne les lui transmet pas).

Exemples :

```
_c_codeDepartement_in=75%2C92          (sélection multiple, virgule URL-encodée)
_c_siret_eq=12345678900012
_c_year_gte=2020
```

## 2. Champ sans concept → `_d_<datasetId>_<fieldKey>_<op>`

```
_d_<datasetId>_<fieldKey>_<op>=<valeur>
```

- Le préfixe `_d_<datasetId>_` est **obligatoire** dans tout contexte URL où
  plusieurs datasets peuvent coexister : pages de portail (un bloc = un dataset,
  plusieurs blocs par page), URL de dashboard, échanges entre apps.
- Il évite les collisions entre datasets ayant les mêmes noms de champs, et
  permet à chaque récepteur de sélectionner les clés qui le concernent :
  `getConceptFilters(searchParams, datasetId)` (lib-vue) retire le préfixe des
  clés du bon dataset et ignore les autres.
- L'API REST renvoie une **erreur 400** si le champ n'existe pas dans le dataset
  ciblé (contrairement aux `_c_`, ignorés silencieusement).

Exemples :

```
_d_accidents-velos_dep_in=75%2C92
_d_accidents-velos_int_in=2022
```

### Les clés nues `<fieldKey>_<op>`

Une clé sans préfixe (`departement_eq=75`) n'est valide que pour un **appel REST
direct sur un dataset unique** (ex. `/api/v1/datasets/{id}/lines?departement_eq=75`
ou un embed natif `/embed/dataset/<id>/table?...`), où le dataset est déjà porté
par le chemin ou l'URL cible.

**Ne jamais utiliser de clé nue dans une URL d'app ou de portail** : portals ne
les reconnaît pas comme filtres (`isFilterKey` = préfixes `_c` / `_d` uniquement)
et elles ne sont pas routées par `sync-params`. Quand une app reçoit des filtres
dataset-scopés d'un parent (ex. app-dashboards), elle les « dé-préfixe » elle-même
avant l'appel REST (via `getConceptFilters`), ou le parent les dé-préfixe avant
un embed natif (cas `stripDatasetScope` de app-dashboards).

## Opérateurs (`FILTER_CAPABILITIES`)

Source de vérité : `api/src/datasets/es/operations.ts`.

| Suffixe | Signification | Capacité requise |
|---|---|---|
| `_eq` | égal | index |
| `_neq` | différent | index |
| `_in` | dans la liste (valeurs séparées par virgules) | index |
| `_nin` | pas dans la liste | index |
| `_lt` / `_lte` | inférieur (ou égal) | index |
| `_gt` / `_gte` | supérieur (ou égal) | index |
| `_starts` | commence par | index |
| `_exists` / `_nexists` | valeur renseignée / non renseignée | index |
| `_contains` | contient (wildcard) | wildcard |
| `_search` | recherche textuelle sur champ texte (une valeur OU une autre) | texte |

## Formats de valeurs

| Cas | Format |
|---|---|
| Filtre mono-valeur | chaîne simple : `_d_<ds>_<field>_eq=75` |
| Filtre multi-valeurs (`_in` / `_nin`) | liste séparée par virgules, URL-encodée : `_c_codeDepartement_in=75%2C92` |
| Plage | deux clés distinctes `_gte` + `_lte` |
| `_c_date_match` | `YYYY-MM-DD` ou plage `YYYY-MM-DD,YYYY-MM-DD` |
| `_c_geo_distance` | `lon,lat,rayonEnMètres` (ex. `2.3522,48.8566,5000`) |
| `_c_bbox` | `gauche,bas,droite,haut` |

> Limite connue : les valeurs multi-valeurs contenant des virgules ne sont pas
> représentables dans un `_in` (sérialisation `JSON.stringify(arr).slice(1,-1)`
> dans app-dashboards). À documenter/dépasser si besoin.

## Concepts universels (sans colonne)

Indépendants de tout champ du schéma, applicables à n'importe quel dataset :

| Paramètre | Rôle |
|---|---|
| `q` / `_c_q` | recherche fulltext |
| `qs` | recherche Lucene (filtres complexes — dernier recours) |
| `_c_date_match` | filtre sur les champs de type date (`x-refersTo` schema.org/Date, startDate, endDate) |
| `_c_geo_distance` | distance autour d'un point |
| `_c_bbox` | bounding box géographique |
| `_id_eq` | filtre sur l'id d'une ligne (ex. embed table) |
| `finalizedAt` | timestamp de la version du dataset (cache) |

## Émission : comment écrire des filtres dans l'URL

Quand votre app écrit un filtre dans l'URL (`reactiveSearchParams`) ou le passe à
un enfant :

1. Le champ porte un concept (`field['x-concept'].id`) → écrire
   `_c_<conceptId>_<op>=<valeur>`. Seule forme réutilisable par une autre app sur
   un autre dataset.
2. Le champ n'a pas de concept → écrire `_d_<datasetId>_<fieldKey>_<op>=<valeur>`
   (jamais de clé nue, sauf appel REST direct).
3. Convention app-dashboards (à reproduire) : le broadcast vers les visus enfants
   émet la clé dataset-scopée **et**, si le champ porte un concept, le miroir
   `_c_<conceptId>_<op>` avec la même valeur — la visu cible peut ainsi
   réutiliser le filtre même sur un autre dataset. Voir
   `useFiltersValues.ts:recompute` et `collectStaticFilterParams`.

## Réception : comment lire des filtres venant d'un parent

Côté enfant d'un d-frame ou d'un portail :

```ts
import { useConceptFilters } from '@data-fair/lib-vue/concept-filters.js'

const conceptFilters = useConceptFilters(reactiveSearchParams, datasetId)
// conceptFilters contient :
//  - toutes les clés _c_* telles quelles
//  - les clés _d_<datasetId>_* dé-préfixées (ex. _d_myds_dep_in -> dep_in)
//  - rien d'autre : les filtres d'autres datasets sont ignorés
```

Puis fusionner avec les filtres statiques avant d'appeler l'API :

```ts
const allFilters = computed(() => ({ ...config.staticFilters, ...conceptFilters.value }))
useFetch(() => datasetUrl.value + '/lines', { query: computed(() => ({ ...allFilters.value })) })
```

> ⚠️ Ici `staticFilters` est un **objet plat** de clés REST déjà suffixées
> (convention app-dashboards). Pour le pattern **array** des visus
> (`staticFilters` = tableau `{ type, field, ... }`), convertir avec `filters2params`
> de `@data-fair/lib-utils/filters` — voir `SKILL.md`, section
> « Filtres statiques prédéfinis (`staticFilters`) ».

Prérequis :
- `<meta name="df:filter-concepts" content="true">` dans `index.html` pour
  recevoir les filtres par concepts d'un parent (dashboard, portail).
- `window.vIframeOptions = { reactiveParams: reactiveSearchParams }` en enfant
  d'un d-frame pour appliquer les `updateSrc` du parent sans rechargement.
- L'URL de l'app doit être le réceptacle : `reactiveSearchParams` (singleton
  `@data-fair/lib-vue/reactive-search-params-global.js`) + adaptateur
  `createDFrameAdapter(reactiveSearchParams)` côté parent.

## Mode sélection `_s_` (filtre vs sélection, clic → interop)

Une application maintient son état dans son URL selon **deux mécanismes
distincts** :

| Mécanisme | Clés écrites par l'app | Effet |
|---|---|---|
| **Filtre** | `_c_<conceptId>_<op>` / `_d_<datasetId>_<fieldKey>_<op>` | restriction : l'app se restreint |
| **Sélection** | les mêmes clés **+ le marqueur** `_s_<clé sans opérateur>` | désignation : aucune app ne se restreint, la sélection est rendue |

- **Filtre** : un critère (facette, période, recherche…), jamais un clic sur une
  entité — pas de marqueur.
- **Sélection** : un clic sur une entité ou un ensemble (une barre, une ligne, une
  entité de carte). L'app émettrice **s'auto-exclut** du filtre marqué — elle
  garde son contexte complet, pas seulement l'entité — et rend la sélection.
- **Réception** : un filtre **marqué** n'est jamais une restriction pour l'app qui
  le reçoit ; elle rend la sélection selon son type (une carte peint les entités,
  un tableau surligne les lignes, un graphe met les barres ou segments concernés
  en évidence) ou l'ignore si elle n'a rien à mettre en évidence. Vrai quel que
  soit l'opérateur : une plage (`_gte` + `_lte`, un seul marqueur) se rend comme
  une plage. Un filtre **non marqué** s'applique normalement (restriction).

**Émission** d'une sélection = un filtre **+ un marqueur** :

| Filtre émis | Marqueur |
|---|---|
| `_c_<conceptId>_<op>=<valeur>` | `_s_<conceptId>=app_<applicationId>` |
| `_d_<datasetId>_<fieldKey>_<op>=<valeur>` | `_s_<datasetId>_<fieldKey>=app_<applicationId>` |

- Le marqueur est la **clé de filtre sans opérateur** (`_s_<conceptId>` /
  `_s_<ds>_<field>`), ce qui lève l'ambiguïté champ/concept.
- **Valeur** : `app_<applicationId>` avec `applicationId = window.APPLICATION.id`.
  Elle identifie l'émetteur : une app sait si la sélection qu'elle rend est la
  sienne ou vient de l'extérieur. Elle ne change rien au filtrage. Collision
  connue et assumée : la même app embedée 2× sur la même page pour le même
  concept. Une page peut y mettre autre chose (ex. le code d'une commune),
  aucune app ne s'en trouvera être l'émetteur.
- **Lecture** : aucune app ne restreint ses requêtes API sur une clé marquée
  (contexte préservé, durable après reload de l'URL) —
  `getConceptFilters` / `useConceptFilters` (lib-vue) les retirent déjà.
  `findSelectionFilters(searchParams, datasetId)`
  (`@data-fair/lib-vue/selection-filters.js`) donne la sélection à rendre, avec
  son émetteur (`source`).
- **Effacement** : chip « ✕ » / « tout effacer » → retirer ses valeurs
  (read-modify-write sur l'URL), supprimer la clé si vide, supprimer le marqueur.
- **Cas table** : sélection de ligne = `_d_<datasetId>__id_eq=<lineId>` +
  `_s_<datasetId>__id=app_table`.
- **Coin à connaître** : si un filtre préexiste (posé par un agent, un autre
  composant) sur le même champ et que l'utilisateur clique dans l'app, la **clé
  entière** devient une sélection : la restriction d'origine est perdue pour
  toutes les apps qui reçoivent le marqueur.
- **Une marque par clé** : chaque clé émise a son marqueur. Une sélection doublée
  `_c_` + `_d_` (miroir concept) porte deux marqueurs, sinon la clé `_d_` reste
  une restriction.

### Propagation aux autres visus : décision du parent

Un visu n'écrit jamais pour les autres : il tient son propre état. La propagation
vers les autres visus de la même page est configurée au-dessus (page de portail,
tableau de bord, diaporama data-story), visu par visu. Le parent contrôle **en
sortie** (ce qui remonte de l'app vers la page), pas en entrée.

| Ce qu'émet le visu | Choix du parent |
|---|---|
| sélection | **propager en sélection** — le marqueur suit, les autres visus mettent en évidence |
| | **propager en filtre** — seules les clés `_c_`/`_d_` sont propagées : les autres visus se restreignent (ex. clic sur une barre qui filtre le reste du tableau de bord) |
| | ne pas propager |
| filtre | propager (les autres visus appliquent) / ne pas propager |

- En mode « propager en filtre », le parent retire les clés `_s_*` du flux vers les
  autres visus ; le visu émetteur conserve son marqueur, il reste la source de la
  sélection.
- Le marqueur porte déjà son émetteur (`app_<applicationId>`) : il suffit à router
  `_s_*` vers le bon visu et `_c_*`/`_d_*` vers tous.

**Routage portals** : `isFilterKey` reconnaît le préfixe `_s` ; les blocs
`sync-params` (application / dataset-table) routent `_s*` comme les filtres
(`_c*,_s*,_d*,*:<uuid>_` et `_s*,_c*,*_*:_d_<id>_,*:<uuid>_`). Le choix par visu
« sélection propagée en sélection / en filtre / rien » reste à exposer (le
réglage de bloc est aujourd'hui tout ou rien, cf. Écarts connus).

## Cas portals : synchro via l'URL dans les pages

Les pages de portals reflètent les filtres de page dans l'URL avec la même
convention et les routent vers chaque bloc :

- Clés reconnues comme filtres de page : préfixe `_c`, `_d` ou `_s`
  (`pageFilters_get` / `pageFilters_set` dans portals).
- Tableau de données d'un bloc : `sync-params` =
  `_s*,_c*,*_*:_d_<datasetId>_,*:<uuid>_` (les `_c_*` passent tels quels, les
  `_d_<id>_*` sont dé-préfixés pour le bloc concerné, le reste est préfixé
  `<uuid>_`).
- Application embarquée : `sync-params` = `_c*,_s*,_d*,*:<uuid>_` (l'app reçoit
  toutes les clés `_c_*`, `_s_*` et `_d_*`, elle filtre avec `useConceptFilters`
  et rend les sélections marquées).
- Sandbox : seul le préfixe `<uuid>_` est routé.

Conséquence pour une app embarquée dans un portail : écrire ses filtres de page
avec `_c_` (concept) ou `_d_<datasetId>_` (champ simple), jamais en clé nue.

## Exemples concrets (issus des tests e2e existants)

- Filtre dynamique mono-valeur : `_d_accidents-velos_int_in=2022`
- Static filter `dep` (concept `codeDepartement`, valeurs 75, 92) :
  - dataset-scopé : `_d_accidents-velos_dep_in=75%2C92`
  - miroir concept : `_c_codeDepartement_in=75%2C92`
  - embed table (dé-préfixé) : `dep_in=75%2C92`
- Sélection émise par une app (clic sur la barre `dep=75`) :
  `_d_accidents-velos_dep_eq=75` + `_s_accidents-velos_dep=app_<applicationId>` +
  `_c_codeDepartement_eq=75` + `_s_codeDepartement=app_<applicationId>` — aucune
  app ne se restreint sur ces clés marquées : l'émettrice garde son contexte, une
  carte mettrait le département en évidence, un tableau se restreindrait seulement
  si le parent propage en filtre (sans marqueur).
- Sélection posée par une page (pas une app), cf. pages communes Grand Poitiers :
  `_c_codeCommune_in=86194` + `_s_codeCommune=86194` — la carte garde tous les
  contours et met la commune en évidence.
- App data-fair embarquée : les clés `_d_*`, `_c_*` et `_s_*` lui sont passées
  telles quelles dans l'URL de l'iframe.

## Écarts connus / à corriger

- **URL propre qui ne double pas les filtres à concept** : si l'URL propre d'une
  application écrit `_d_<rootDatasetId>_<field>_<op>` pour **tous** les filtres, y
  compris ceux à concept, et ne double le miroir `_c_` que dans le broadcast vers
  ses enfants, une app externe ne peut pas recycler ces filtres sans connaître le
  schéma du dataset racine. Correction : doubler `_c_` dans l'URL propre
  elle-même, en gardant la lecture des anciennes clés `_d_`.
- **Propagation non configurable par le parent** : la convention demande, pour
  chaque visu, de choisir ce qui est propagé aux autres visus (sélection → en
  sélection / en filtre / rien ; filtre → oui / non). Portals n'expose aujourd'hui
  qu'un réglage tout ou rien par bloc (`syncParams` : `none` / `sandboxed` /
  `shared-filters`), et app-dashboards ne synchronise pas l'état de ses visus
  enfants (aucun `sync-params` sur ses `d-frame`) — à couvrir avec
  l'implémentation.
- **Builders de clés non centralisés** : `datasetFilterKey` / `conceptFilterKey`
  sont parfois réimplémentés localement (`src/utils/dataset-filter.ts`) plutôt que
  fournis par `lib-vue` — mutualisation possible pour que toutes les apps
  réutilisent la même implémentation.
- **Documentation à ne pas reproduire** : ne pas décrire le format dataset-scopé
  comme « attendu par l'API REST » de l'embed dataset — le préfixe est en fait
  stripé avant l'appel (cf. ci-dessus, § Filtres de concepts).
