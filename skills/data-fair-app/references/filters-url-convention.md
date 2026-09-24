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

## Mode sélection `_s_` (clic → filtre partagé inter-apps)

Une **sélection** (clic sur un segment de graphique, une ligne de tableau, une
entité sur une carte…) est émise comme un filtre `_c_`/`_d_` **accompagné d'un
marqueur** `_s_`. Le marqueur permet à l'app source de se ré-exclure (l'app qui
émet une sélection continue à afficher son propre contexte, pas seulement la
sélection), tout en laissant les autres apps appliquer le filtre.

**Émission** d'une sélection = un filtre **+ un marqueur** :

| Filtre émis | Marqueur |
|---|---|
| `_c_<conceptId>_<op>=<valeur>` | `_s_<conceptId>=app_<applicationId>` |
| `_d_<datasetId>_<fieldKey>_<op>=<valeur>` | `_s_<datasetId>_<fieldKey>=app_<applicationId>` |

- Le marqueur est la **clé de filtre sans opérateur** (`_s_<conceptId>` /
  `_s_<ds>_<field>`), ce qui lève l'ambiguïté champ/concept.
- **Valeur** : `app_<applicationId>` avec `applicationId = window.APPLICATION.id`.
  Collision connue et assumée : la même app embedée 2× sur la même page pour le
  même concept.
- **Lecture (auto-exclusion)** : l'app dont un marqueur porte son identité retire
  la clé correspondante de ses propres requêtes API (contexte préservé, durable
  après reload de l'URL). Les autres apps appliquent le filtre normalement — **en
  v1, le marqueur ne change rien pour les récepteurs**.
- **Effacement** : chip « ✕ » / « tout effacer » → retirer ses valeurs
  (read-modify-write sur l'URL), supprimer la clé si vide, supprimer le marqueur.
- **Cas table** : sélection de ligne = `_d_<datasetId>__id_eq=<lineId>` +
  `_s_<datasetId>__id=app_table`.
- **Coin à connaître** : si un filtre préexiste (posé par un agent, un autre
  composant) sur le même champ et que l'utilisateur clique dans l'app, la **clé
  entière** est auto-exclue de l'app source (mais pas des autres apps).

**Routage portals** : `isFilterKey` reconnaît le préfixe `_s` ; les blocs
`sync-params` (application / dataset-table) routent `_s*` comme les filtres
(`_c*,_s*,_d*,*:<uuid>_` et `_s*,_c*,*_*:_d_<id>_,*:<uuid>_`).

## Cas portals : synchro via l'URL dans les pages

Les pages de portals reflètent les filtres de page dans l'URL avec la même
convention et les routent vers chaque bloc :

- Clés reconnues comme filtres de page : préfixe `_c` ou `_d` uniquement
  (`pageFilters_get` / `pageFilters_set` dans portals).
- Tableau de données d'un bloc : `sync-params` =
  `_c*,*_*:_d_<datasetId>_,*:<uuid>_` (les `_c_*` passent tels quels, les
  `_d_<id>_*` sont dé-préfixés pour le bloc concerné, le reste est préfixé
  `<uuid>_`).
- Application embarquée : `sync-params` = `_c*,_d*,*:<uuid>_` (l'app reçoit
  toutes les clés `_c_*` et `_d_*`, elle filtre avec `useConceptFilters`).
- Sandbox : seul le préfixe `<uuid>_` est routé.

Conséquence pour une app embarquée dans un portail : écrire ses filtres de page
avec `_c_` (concept) ou `_d_<datasetId>_` (champ simple), jamais en clé nue.

## Exemples concrets (issus des tests e2e existants)

- Filtre dynamique mono-valeur : `_d_accidents-velos_int_in=2022`
- Static filter `dep` (concept `codeDepartement`, valeurs 75, 92) :
  - dataset-scopé : `_d_accidents-velos_dep_in=75%2C92`
  - miroir concept : `_c_codeDepartement_in=75%2C92`
  - embed table (dé-préfixé) : `dep_in=75%2C92`
- App data-fair embarquée : les clés `_d_*` et `_c_*` lui sont passées
  telles quelles dans l'URL de l'iframe.

## Écarts connus / à corriger

- **URL propre qui ne double pas les filtres à concept** : si l'URL propre d'une
  application écrit `_d_<rootDatasetId>_<field>_<op>` pour **tous** les filtres, y
  compris ceux à concept, et ne double le miroir `_c_` que dans le broadcast vers
  ses enfants, une app externe ne peut pas recycler ces filtres sans connaître le
  schéma du dataset racine. Correction : doubler `_c_` dans l'URL propre
  elle-même, en gardant la lecture des anciennes clés `_d_`.
- **Builders de clés non centralisés** : `datasetFilterKey` / `conceptFilterKey`
  sont parfois réimplémentés localement (`src/utils/dataset-filter.ts`) plutôt que
  fournis par `lib-vue` — mutualisation possible pour que toutes les apps
  réutilisent la même implémentation.
- **Documentation à ne pas reproduire** : ne pas décrire le format dataset-scopé
  comme « attendu par l'API REST » de l'embed dataset — le préfixe est en fait
  stripé avant l'appel (cf. ci-dessus, § Filtres de concepts).
