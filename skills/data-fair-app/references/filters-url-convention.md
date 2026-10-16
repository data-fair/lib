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
sélection (désignation d'entités) — qui s'écrivent avec les **mêmes clés** : c'est
la visu réceptrice qui décide, selon son champ de sélection déclaré, si la clé la
restreint ou la met en évidence. Voir § « Sélection ».

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
3. Si le champ porte un concept, écrire la clé **concept seule**
   (`_c_<conceptId>_<op>`) : elle est réutilisable par une autre visu sur un
   autre dataset. N'écrire `_d_<datasetId>_<fieldKey>_<op>` que lorsque le champ
   n'a pas de concept. Voir `useFiltersValues.ts:recompute` et
   `collectStaticFilterParams`.

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

## Sélection (désignation d'entités)

Restriction et sélection s'écrivent avec **la même forme d'URL** (`_c_`/`_d_` +
opérateur) : ce qui les distingue n'est pas la clé écrite, mais le **champ de
sélection déclaré par la visu réceptrice**.

- **Filtre** : un critère (facette, période, recherche…). La visu se restreint.
- **Sélection** : un clic sur une entité ou un ensemble (une barre, une ligne, une
  entité de carte, une commune). La visu met en évidence — elle ne se restreint
  pas.

### Règle de lecture d'une visu

Une visu **déclare son (ses) champ(s) de sélection** : un concept
(`x-concept.primary`) ou un champ dataset-scopé. Le champ est **propre à chaque
visu** ; une visu peut en avoir plusieurs (ex. carto multicouche peignant sur
plusieurs champs).

| Clé `_c_<conceptId>_<op>` / `_d_<datasetId>_<fieldKey>_<op>` | Comportement de la visu |
|---|---|
| sur le **champ de sélection** de la visu | **sélection** : mise en évidence ; la clé est **retirée de ses requêtes API** |
| sur un **autre champ** | **restriction** (comportement normal) |
| `<fieldKey>_<op>` (clé nue) | réservée aux appels REST directs, inchangé |

- Opérateurs lus comme sélection : `eq` et `in` pour des entités ponctuelles,
  `gte` + `lte` pour une plage (brosse temporelle).
- **Auto-exclusion par construction** : le champ de sélection n'étant jamais
  appliqué comme restriction, une visu ne se restreint pas sur sa propre
  émission, même relayée en retour.
- **XOR assumé** : un champ de sélection n'est pas filtrable *sur cette visu*. Un
  filtre de page visant le même champ ne restreint pas cette visu : il la met en
  évidence.
- Un **récepteur non configuré** (un embed natif, une visu sans champ de
  sélection) ne peut pas distinguer une sélection : la clé le restreint.

### Émission d'une sélection

Un clic écrit une **clé seule**, sans marqueur ni identité :

- champ à concept → `_c_<conceptId>_eq=<valeur>` ;
- champ sans concept → `_d_<datasetId>_<fieldKey>_eq=<valeur>` ;
- sélection multiple → `_in=<v1>%2C<v2>` (virgule URL-encodée) ;
- ligne de table → `_d_<datasetId>__id_eq=<lineId>`.

L'**effacement** (retirer une valeur, chip « ✕ », « tout effacer ») fait un
read-modify-write sur l'URL et supprime la clé si vide.

### Propagation aux autres visus : décision du parent

Une visu n'écrit jamais pour les autres : elle tient son propre état. La
propagation vers les autres visus de la même page (page de portail, tableau de
bord, diaporama data-story) est configurée au-dessus, visu par visu, selon trois
modes :

| Mode | `syncParams` | Comportement |
|---|---|---|
| **partage des filtres** | `shared-filters` | les clés `_c*`/`_d*` écrites par la visu remontent dans l'URL du parent et sont injectées dans **tous** les blocs |
| **cloisonné** | `sandboxed` | les clés de la visu sont conservées dans l'URL du parent sous son préfixe de bloc (état conservé au reload) mais **ne sont pas partagées** |
| **aucune synchro** | `none` | rien n'est repris de la visu ; elle ne reçoit que les filtres du parent |

Une visu qui reçoit les clés d'une autre les traite selon son propre champ de
sélection (mise en évidence) ou comme des restrictions.

## Cas portals : synchro via l'URL dans les pages

Les pages de portals reflètent les filtres de page dans l'URL avec la même
convention et les routent vers chaque bloc :

- Clés reconnues comme filtres de page : préfixe `_c` ou `_d`
  (`pageFilters_get` / `pageFilters_set` dans portals).
- Tableau de données d'un bloc : `sync-params` =
  `_c*,*_*:_d_<datasetId>_,*:<uuid>_` (les `_c_*` passent tels quels, les
  `_d_<id>_*` sont dé-préfixés pour le bloc concerné, le reste est préfixé
  `<uuid>_`).
- Application embarquée : `sync-params` = `_c*,_d*,*:<uuid>_` (l'app reçoit
  toutes les clés `_c_*` et `_d_*`, elle filtre avec `useConceptFilters` et met
  en évidence selon son champ de sélection).
- Sandbox : seul le préfixe `<uuid>_` est routé.

Conséquence pour une app embarquée dans un portail : écrire ses filtres de page
avec `_c_` (concept) ou `_d_<datasetId>_` (champ simple), jamais en clé nue.

## Exemples concrets (issus des tests e2e existants)

- Filtre dynamique mono-valeur : `_d_accidents-velos_int_in=2022`
- Static filter `dep` (concept `codeDepartement`, valeurs 75, 92) :
  - dataset-scopé : `_d_accidents-velos_dep_in=75%2C92`
  - miroir concept : `_c_codeDepartement_in=75%2C92`
  - embed table (dé-préfixé) : `dep_in=75%2C92`
- Sélection émise par un clic sur la barre `dep=75` :
  `_c_codeDepartement_eq=75` — une visu dont `codeDepartement` est le champ de
  sélection met le département en évidence et ne se restreint pas ; une autre
  visu se restreint si le parent partage les filtres.
- Sélection posée par une page (pas une app), cf. pages communes Grand Poitiers :
  `_c_codeCommune_in=86194` — la carte garde tous les contours et met la commune
  en évidence.
- App data-fair embarquée : les clés `_d_*` et `_c_*` lui sont passées telles
  quelles dans l'URL de l'iframe.

## Écarts connus / à corriger

- **URL propre qui ne double pas les filtres à concept** : une application qui
  écrit `_d_<rootDatasetId>_<field>_<op>` pour **tous** ses filtres, y compris
  ceux à concept, empêche une app externe de les recycler sans connaître le schéma
  du dataset racine. Correction : écrire la clé concept `_c_<conceptId>_<op>`
  lorsque le champ en porte un.
- **Builders de clés non centralisés** : `datasetFilterKey` / `conceptFilterKey`
  sont parfois réimplémentés localement (`src/utils/dataset-filter.ts`) plutôt que
  fournis par `lib-vue` — mutualisation possible pour que toutes les apps
  réutilisent la même implémentation.
- **Documentation à ne pas reproduire** : ne pas décrire le format dataset-scopé
  comme « attendu par l'API REST » de l'embed dataset — le préfixe est en fait
  stripé avant l'appel (cf. ci-dessus, § Filtres de concepts).
