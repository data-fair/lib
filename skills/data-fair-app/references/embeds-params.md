# Paramètres des vues embed DataFair (pour les apps)

Référence des paramètres de query supportés par les vues embed les plus utilisées dans les apps DataFair.

## Tableau — `/embed/dataset/<id>/table`

Affiche les lignes d'un jeu de données sous forme de tableau, liste ou cartes.

| Paramètre | Description |
|-----------|-------------|
| `draft` | Mode brouillon (`true` / `false`) |
| `cols` | Colonnes affichées (séparées par virgule, ex: `nom,valeur,date`) |
| `display` | Mode d'affichage : `list`, `table` ou `cards` |
| `q` | Recherche textuelle fulltext pré-remplie |
| `sort` | Tri (préfixer la colonne avec `-` pour descendant, ex: `-valeur`) |
| `fixed` | Liste des colonnes fixes (non déplaçables) |
| `interaction` | Active les interactions (clic sur ligne, etc.) |
| `selectable` | Active la sélection de lignes |
| `_id_eq` | Filtre sur un ID spécifique |
| `*_eq` / `*_in` | Filtres dynamiques de contexte |

**Exemple** : `/embed/dataset/{id}/table?cols=nom,valeur&sort=-valeur&q=paris&departement_eq=75`

---

## Tableau éditable — `/embed/dataset/<id>/table-edit`

Tableau avec possibilité d'édition inline des cellules.

| Paramètre | Description |
|-----------|-------------|
| `cols` | Colonnes affichées (séparées par virgule) |
| `display` | Mode d'affichage |
| `q` | Recherche textuelle |
| `sort` | Tri |
| `interaction` | Interactions activées |
| `*_eq` / `*_in` | Filtres de contexte (restreignent les lignes éditables) |

**Exemple** : `/embed/dataset/{id}/table-edit?cols=nom,valeur&interaction=true`

---

## Carte — `/embed/dataset/<id>/map`

Carte géographique affichant les données géolocalisées du dataset.

| Paramètre | Description |
|-----------|-------------|
| `draft` | Mode brouillon |
| `q` | Recherche textuelle |
| `interaction` | Active les interactions (clic sur point, zoom, etc.) |
| `selectable` | Active la sélection de points |
| `cols` | Colonnes affichées dans le popup de clic |
| `_id_eq` | Filtre sur un ID spécifique |
| `*_eq` / `*_in` | Filtres dynamiques de contexte |

**Exemple** : `/embed/dataset/{id}/map?q=restaurant&interaction=true&selectable=true`

---

## Formulaire — `/embed/dataset/<id>/form`

Formulaire de saisie / édition d'une ligne du dataset.

| Paramètre | Description |
|-----------|-------------|
| `extension` | Extension de formulaire (si configurée dans DataFair) |
| `*_eq` | Filtres de contexte pour pré-remplir des champs |

**Exemple** : `/embed/dataset/{id}/form?departement_eq=75&type_eq=restaurant`

---

## Vignettes — `/embed/dataset/<id>/thumbnails`

Galerie de vignettes (images, documents, etc.) du dataset.

| Paramètre | Description |
|-----------|-------------|
| `draft` | Mode brouillon |
| `q` | Recherche textuelle |

---

## Téléchargement — `/embed/dataset/<id>/download`

Interface de téléchargement / export des données.

| Paramètre | Description |
|-----------|-------------|
| `select` | Champs à inclure dans l'export (séparés par virgule) |
| `header` | Nom du fichier exporté |
| `*_eq` / `*_in` | Filtres de contexte (restreignent les données exportables) |

---

## Configuration d'application — `/embed/application/<id>/config`

Formulaire de configuration d'une autre application DataFair (utilisé dans les dashboards ou apps composites).

| Paramètre | Description |
|-----------|-------------|
| `roDataset` | ID du dataset en lecture seule (pré-sélectionné) |

---

## Notes d'utilisation

- Les paramètres `*_eq` et `*_in` fonctionnent comme des **filtres de contexte** : ils restreignent les données affichées dans l'embed sans permettre à l'utilisateur de les modifier.
- Le paramètre `draft` permet de visualiser les données en mode brouillon (utile pendant la configuration de l'app parente).
- Le paramètre `q` permet de pré-remplir une recherche textuelle dans l'embed.
- L'**accessKey** doit être propagée aux embeds pour maintenir les droits d'accès sur les données. Ce n'est pas un attribut de `d-frame` mais un préfixe de l'id de la ressource dans le chemin de l'URL, interprété côté data-fair : `/data-fair/embed/dataset/{accessKey}%3A{datasetId}/table`, `/data-fair/app/{accessKey}%3A{appId}`.
- Les filtres de contexte (`*_eq`, `*_in`) sont cumulatifs : plusieurs filtres peuvent être combinés pour restreindre les données.

## Conventions d'émission par type d'embed

Les embeds ci-dessus émettent leur sélection dans l'URL **parente** selon deux conventions :

| Type d'embed | Émet côté parent | `:sync-params` suggéré |
|---|---|---|
| Table embed (`/embed/dataset/{id}/table`, `display=table|list`) | `_id_eq` | `_id_eq:_d_{id}_,_c_*,_d_*` |
| Carte embed (`/embed/dataset/{id}/map`) | `_id_eq` | `_id_eq:_d_{id}_,_c_*,_d_*` |
| App data-fair (`/app/{appId}`) | `_d_{id}__id_eq` | `_d_{id}__id_eq:_d_{id}__id_eq,_c_*,_d_*` |

Quand votre app supporte plusieurs types d'embed selon la configuration, calculez `:sync-params` dynamiquement :

```vue
<d-frame
  :src="iframeSrc"
  :sync-params="
    config.display?.type === 'tablePreview'
      ? `_id_eq:_d_${mainDataset.id}_,_c_*,_d_*`
      : `_d_${mainDataset.id}__id_eq:_d_${mainDataset.id}__id_eq,_c_*,_d_*`
  "
/>
```

**Règle générale** : votre code lit/écrit dans `reactiveSearchParams` avec la convention **parent**. C'est `:sync-params` qui adapte ce qui est passé à l'enfant. Ne dupliquez pas la logique de préfixage côté composant.

## Convention URL des filtres

La sérialisation des filtres dans l'URL suit une convention unique entre apps,
portails et dashboards : filtres **par concept** = `_c_<conceptId>_<op>`
(dataset-agnostique), filtres sur **champ sans concept** = `_d_<datasetId>_<fieldKey>_<op>`
(préfixe obligatoire dans tout contexte multi-datasets). Les clés nues
(`departement_eq=75`) ne sont valides que pour un appel REST direct sur un
dataset unique.

> Voir `references/filters-url-convention.md` pour la référence complète
> (opérateurs, formats de valeurs, règles d'émission/réception, écarts connus).
