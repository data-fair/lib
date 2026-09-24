# Endpoints API DataFair pour les applications

## Endpoints principaux

### 1. Données brutes — `GET /api/v1/datasets/{id}/lines`

Pour les visus affichant des lignes individuelles : tableaux, listes, cartes avec points, timelines, etc.

**Paramètres** :
- `size` : nombre de résultats (max 10000)
- `q` : recherche textuelle fulltext
- `sort` : tri, liste de noms de colonnes séparés par virgules. Ascendant par défaut, préfixer par `-` pour descendant. Ex : `ma_colonne,-ma_colonne2`.
- `*_eq` / `*_in` : filtres sur les champs (ex: `departement_eq=75`)
- `select` : champs à retourner (séparés par virgule)
- `finalizedAt` : timestamp pour le cache

**Exemple** :
```ts
useFetch(
  computed(() => datasetUrl.value + '/lines'),
  {
    query: computed(() => ({
      size: 100,
      sort: '-date',
      departement_eq: selectedDept.value,
      select: 'nom,valeur,date'
    }))
  }
)
```

---

### 2. Valeurs distinctes avec labels — `GET /api/v1/datasets/{id}/values_labels`

Pour obtenir les valeurs distinctes d'un champ avec leurs labels (traductions, énumérations, concepts). Utile pour les listes déroulantes de filtres, les axes des graphiques, les légendes.

**Paramètres** :
- `field` : champ cible (obligatoire)
- `size` : nombre maximum de valeurs (max 1000)
- `sort` : tri, valeur simple `asc` ou `desc` (défaut `asc`). Ex : `sort: 'desc'`.
- `*_eq` / `*_in` : filtres préalables
- `missing` : label pour les valeurs nulles

**Réponse** :
```ts
interface ValuesLabelsResponse {
  total: number
  results: Array<{
    value: string        // valeur brute
    label: string        // label affichable (traduit si concept)
    count: number        // nombre d'occurrences
  }>
}
```

**Exemple** :
```ts
// Liste des régions pour un sélecteur de filtre
const { data } = useFetch(
  computed(() => datasetUrl.value + '/values_labels'),
  {
    query: {
      field: 'region',
      size: 100,
      sort: 'desc'
    }
  }
)
// data.value.results → [{ value: '75', label: 'Paris', count: 1250 }, ...]
```

---

### 3. Agrégation groupée — `GET /api/v1/datasets/{id}/values_agg`

Pour les graphiques avec regroupement : bar charts, pie charts, line charts, treemaps, etc.

**Paramètres** :
- `field` : champ de regroupement (obligatoire)
- `metric` : type d'agrégation (`sum`, `avg`, `min`, `max`, `count`)
- `metric_field` : champ sur lequel calculer la métrique (si `metric` ≠ `count`)
- `agg_size` : nombre de groupes (max 1000, 20 par défaut)
- `size` : nombre de lignes brutes renvoyées dans `results` par groupe (mettre `0` quand seule l'agrégation compte)
- `interval` : pour un champ date ou nombre, pas de regroupement (`value`, `year`, `month`, `day`, ou un nombre)
- `*_eq` / `*_in` : filtres préalables
- `sort` : tri des groupes parmi `metric`, `-metric`, `_count`, `-_count`, `_key`, `-_key`, ou nom de colonne (préfixé `-` pour desc). Ex : `sort: '-metric'`, `sort: '_key'`.
- `missing` : label pour les valeurs nulles (ex: `Non renseigné`)

**Plusieurs niveaux de regroupement** : `field`, `agg_size`, `sort`, `interval` et `missing`
sont des listes parallèles, **une valeur par niveau, séparées par des virgules** —
`field=annee,secteur&agg_size=100,12&sort=_key,-metric`. La réponse imbrique alors un `aggs`
dans chaque bucket.

Toujours la virgule, jamais le point-virgule : data-fair accepte encore `;` par
rétro-compatibilité (`splitRetroCompat`), mais un `;` non encodé dans une URL est un
délimiteur de paramètres pour certains reverse-proxies (traefik, utilisé chez des clients
hébergés) qui tronquent la requête au premier `;` — la visu ne reçoit qu'un niveau et plante
(`Cannot read properties of undefined (reading 'controller')` dans charts). Pour la même
raison, ne pas construire ces paramètres à la main avec `join(';')` : utiliser `join(',')`.

**Exemples par type de visu** :

```ts
// Bar chart : total des ventes par région (filtré par année)
useFetch(
  computed(() => datasetUrl.value + '/values_agg'),
  {
    query: computed(() => ({
      field: 'region',
      metric: 'sum',
      metric_field: 'montant',
      annee_eq: selectedYear.value,
      agg_size: 20,
      size: 0,
      sort: '-metric'
    }))
  }
)

// Pie chart : répartition par catégorie (count)
useFetch(
  computed(() => datasetUrl.value + '/values_agg'),
  {
    query: computed(() => ({
      field: 'categorie',
      status_eq: 'actif',
      agg_size: 10,
      size: 0,
      missing: 'Autre'
    }))
  }
)

// Line chart : évolution temporelle (groupBy date)
useFetch(
  computed(() => datasetUrl.value + '/values_agg'),
  {
    query: computed(() => ({
      field: 'date',
      interval: 'month',    // ou 'year', 'day', 'value'
      metric: 'sum',
      metric_field: 'valeur',
      region_eq: selectedRegion.value,
      agg_size: 100,
      size: 0,
      sort: '_key'
    }))
  }
)
```

---

### 4. Métrique simple — `GET /api/v1/datasets/{id}/metric_agg`

Pour les KPIs, compteurs, scorecards, ou quand on a besoin d'une seule valeur agrégée.

**Paramètres** :
- `metric` : type (`sum`, `avg`, `min`, `max`, `count`)
- `field` : champ cible (obligatoire si `metric` ≠ `count`)
- `*_eq` / `*_in` : filtres

**Exemple** :
```ts
// KPI : moyenne des notes
const { data } = useFetch(
  computed(() => datasetUrl.value + '/metric_agg'),
  {
    query: { metric: 'avg', field: 'note' }
  }
)
// data.value contient : { value: 14.5 }
```

---

### 5. Agrégation géo — `GET /api/v1/datasets/{id}/geo_agg`

Pour les cartes (tuiles vectorielles ou géométries agrégées).

**Paramètres** :
- `simplify` : niveau de simplification des géométries
- `bbox` : bounding box (format `minX,minY,maxX,maxY`)
- `*_eq` / `*_in` : filtres
- `format` : `geojson` ou `pbf`

---

## Paramètres communs à tous les endpoints

| Paramètre | Description |
|-----------|-------------|
| `*_eq` | Filtre d'égalité sur un champ (ex: `departement_eq=75`) |
| `*_in` | Filtre IN sur un champ (ex: `type_in=A,B,C`) |
| `finalizedAt` | Timestamp de la version du dataset (pour le cache navigateur) |
| `draft` | `true` pour utiliser le brouillon du dataset (mode édition) |

**Suffixes de filtres disponibles** : `_eq`, `_neq`, `_gt`, `_gte`, `_lt`, `_lte`, `_in`, `_nin`, `_starts`, `_contains`, `_exists`, `_nexists`, `_search`

> Pour la convention de sérialisation des filtres **dans l'URL** (interop entre
> apps, `_c_` concepts / `_d_<datasetId>_` champs simples, synchro portals),
> voir `references/filters-url-convention.md`.

## Construction des filtres

### Paramètres de requête `_eq` et `_in`

Privilégier les paramètres de requête explicites (`_eq`, `_in`) plutôt que le format `qs`.

```ts
// Égalité simple : champ _eq valeur
const query = {
  'departement_eq': '75',
  'status_eq': 'actif',
  'annee_eq': '2023'
}

// Liste de valeurs : champ _in valeur1,valeur2
const query = {
  'departement_in': '75,92,93',
  'statut_in': 'actif,publie'
}

// Supérieur / inférieur
const query = {
  'population_gt': '10000',
  'date_gte': '2023-01-01',
  'date_lt': '2024-01-01'
}
```

### Le paramètre `qs`

Le format `qs` est un raccourci pour construire des filtres complexes en une seule string. Il est utile pour des filtres dynamiques construits par l'utilisateur, mais moins lisible que `_eq`/`_in`.

```ts
// Équivalent en qs (à éviter quand possible)
const qs = 'departement:75,population:>10000,status:actif,publie'
```

> **Ne plus utiliser `qs` pour les filtres statiques prédéfinis** (`staticFilters`).
> Ceux-ci se convertissent en params REST suffixés via `filters2params` de
> `@data-fair/lib-utils/filters` (types `in`, `out`, `interval`, `starts`, `exists`,
> `notExists`). Voir la section « Filtres statiques prédéfinis (`staticFilters`) »
> dans `SKILL.md`.

### Recommandation

- **Toujours privilégier les suffixes de filtres** (`_eq`, `_in`, `_gt`, etc.) pour tous les cas simples
- **`qs` uniquement en dernier recours** : logiques de filtrage complexes impliquant des AND / OR imbriqués
- **Jamais mélanger les deux** sur le même champ

## Filtres de concepts

Fusionner les filtres statiques (`config.staticFilters`) avec les filtres de
concepts reçus du parent avant d'appeler les endpoints. Voir
`references/filters-url-convention.md` pour la convention complète
(`_c_<conceptId>_<op>` / `_d_<datasetId>_<field>_<op>`).

> ⚠️ L'exemple ci-dessous illustre la convention **objet plat** de app-dashboards
> (`staticFilters` = objet de clés REST déjà suffixées). Le pattern **array** des
> visus (`staticFilters` = tableau `{ type, field, ... }`) se convertit avec
> `filters2params` — voir `SKILL.md` section « Filtres statiques prédéfinis ».

```ts
import { useConceptFilters } from '@data-fair/lib-vue/concept-filters.js'

// Clés du parent : _c_* conservées telles quelles, _d_<monDatasetId>_ dé-préfixées,
// filtres des autres datasets ignorés.
const conceptFilters = useConceptFilters(reactiveSearchParams, datasetId)
const allFilters = computed(() => ({
  ...config.staticFilters,
  ...conceptFilters.value
}))
```

## Réponse `values_agg`

```ts
interface ValuesAggResponse {
  total: number           // nombre total de lignes agrégées
  total_values: number    // nombre de valeurs distinctes du champ
  total_other: number     // lignes hors des agg_size premiers groupes
  aggs: Array<{
    value: string         // valeur du champ de regroupement
    total: number         // nombre de lignes du groupe
    metric?: number       // valeur agrégée (si metric + metric_field)
    results: Array<Record<string, any>>  // `size` lignes brutes du groupe
    aggs?: ValuesAggResponse['aggs']     // niveau suivant, si plusieurs `field`
  }>
}
```

## Réponse `lines`

```ts
interface LinesResponse {
  total: number           // nombre total de lignes
  results: Array<Record<string, any>>  // lignes du dataset
}
```
