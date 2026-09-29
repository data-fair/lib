# API des jeux de données : ce qui piège un script

Comportements de `/data-fair/api/v1` à connaître avant d'écrire au barreau ②. Les chemins de code cités sont dans le dépôt `data-fair` (`api/src/…`).

## Résoudre un slug

- `GET /datasets/{ref}` accepte un **id** partout, mais un **slug** seulement dans le contexte d'un site de publication : sur l'hôte du portail (slug cherché parmi les jeux du propriétaire du portail), ou sur l'hôte principal avec `?publicationSites=data-fair-portals:<portalId>`. Ailleurs, un slug répond `404` (`getByUniqueRef`, `misc/utils/find.ts` ; contexte posé dans `app.js`). Même règle pour `/applications/{ref}`.
- En liste, le slug est un filtre ordinaire : `GET /datasets?slug=<slug>` (ou `slugs=a,b`, `ids=a,b`).

## Cycle de vie : `409` pendant un traitement

- Un `PATCH` qui touche `schema`, `extensions`, `projection`, `virtual` ou `publications` n'est accepté qu'en statut `finalized` ou `error` ; les écritures de lignes REST, en `finalized`, `indexed` ou `error`. Hors de ces statuts, le serveur patiente 10 s (20 × 500 ms, `datasetStateRetries`) puis répond `409` (« pas dans un état permettant l'opération », ou « opération bloquante déjà en cours » si le jeu est verrouillé). Un `PATCH` de métadonnées seules (`title`, `modified`…) passe dans tout statut sauf `draft`.
- Ce qu'un `PATCH` de schéma relance (`preparePatch`, `datasets/utils/patch.ts`) :
  - titres, descriptions, libellés : rien ;
  - `x-transform` modifié, ou type incompatible : statut `analyzed` → relecture du fichier, validation, indexation, finalisation ;
  - concept géographique, séparateur, fuseau horaire, `x-capabilities`, concept « Document numérique attaché », extensions (jeu fichier) : réindexation complète.
- Donc, après un changement structurel : attendre `status === 'finalized'` (le relire dans `GET /datasets/{id}`) avant l'écriture suivante, et ne jamais écrire en parallèle sur un même jeu.

## Lectures en cache

- Chaque processus API garde le jeu lu en mémoire **30 s** (`memoizedGetDataset`, `datasets/service.ts` ; clé : ref, site de publication, brouillon, descendants).
- `GET /datasets/{id}` revalide cette copie sur `updatedAt`, `finalizedAt` et `status` : il est à jour après un `PATCH`. Une écriture de lignes REST ne touche que `dataUpdatedAt` et `count` : ces deux champs peuvent rester anciens jusqu'à la finalisation qui suit (quelques secondes).
- Les autres routes (`/lines`, agrégations…) servent la copie sans la revalider. Pour forcer la relecture, passer `?finalizedAt=<valeur récente>` : le cache est ignoré si elle est plus récente que la copie. Une valeur plus récente que le jeu lui-même répond `400`.
- `/lines` vide ou ancien juste après une écriture REST : ce n'est **pas** un délai de rafraîchissement Elasticsearch. Les lignes unitaires et les `_bulk_lines` de moins de 200 000 octets et de 2000 lignes sont indexées dans la requête (`refresh: wait_for`). La cause est le cache HTTP : `/lines` répond `Last-Modified: <finalizedAt>`, qui ne bouge qu'à la finalisation, donc `304` et le navigateur resert l'ancien corps ; sur un jeu public, le reverse proxy garde en plus la réponse 5 min (`Cache-Control: public, max-age=300`). Parade, celle de l'interface : ajouter un paramètre propre à l'écriture, `?indexedAt=<indexedAt renvoyé par _bulk_lines>` (ou n'importe quel horodatage).
- Les gros bulks, `?async=true` et les bulks avec pièces jointes sont indexés plus tard par le worker : les lignes apparaissent après le traitement.

## Types inférés

- L'analyse d'un fichier infère les types : un téléphone, un code postal ou un code INSEE devient un nombre et **perd ses zéros de tête**. Forcer le type sur la propriété du schéma : `"x-transform": { "type": "string" }` (avec `"format"` au besoin), dans un `PATCH` du schéma complet. `cleanSchema` applique ce type, et le changement de `x-transform` relance la relecture du fichier stocké (statut `analyzed`) : les valeurs reviennent avec leurs zéros.
- Une colonne **sans aucune valeur dans tout le fichier** est typée `empty` et retirée du schéma à l'analyse, avec une erreur au journal (« colonnes vides qui seront ignorées »). Si elle était annotée (titre, concept), ses annotations partent avec elle : les reposer après le premier chargement qui la remplit.

## Extensions et données de référence

- Une extension de données de référence : `{ "type": "remoteService", "remoteService": "dataset:<idRef>", "action": "masterData_bulkSearch_<bulkSearchId>", "select": [...], "active": true }` dans `extensions` (un `PATCH` qui réindexe). L'action exige qu'une colonne du jeu porte son concept d'entrée. Sur koumoul.com : `sirene-infos` sur `dataset:base-sirene-des-entreprises` attend un SIREN (`http://dbpedia.org/ontology/siren`), `siret-infos` sur `dataset:sirene` un SIRET.
- Lister les actions : `GET /remote-services?q=sirene`. Sonder une action : `POST /datasets/<idRef>/master-data/bulk-searchs/<bulkSearchId>`.
- `_geopoint` est une colonne calculée ajoutée **automatiquement** dès que le schéma, colonnes d'extension comprises, porte une paire latitude/longitude (`http://schema.org/latitude`/`longitude` ou WGS84), des coordonnées X/Y, un `lat_long` ou une géométrie (`extendedSchema`, `datasets/utils/data-schema.ts`). Il suffit donc de mettre les sorties lat/lon de l'extension dans `select`. Une sortie ne garde son concept que si aucune colonne propre du jeu ne le porte déjà : un jeu qui a ses propres lat/lon garde son `_geopoint` sur celles-ci.

## Applications sur l'hôte d'un portail

`GET /applications/{ref}` et `/app/{ref}` sur l'hôte d'un portail cherchent l'application parmi celles du **propriétaire du portail**, sans vérifier qu'elle y est publiée (`readApplication`, `applications/middlewares.ts`). La publication (`publicationSites`) ne filtre que les listes : catalogue, sitemap, jeux liés. Un `404` y signifie donc une référence inconnue ou une application d'un autre propriétaire. Un visiteur anonyme reçoit `403` sur une application privée. Un hôte absent de tous les `settings.publicationSites` répond `404 publication site unknown` à toute requête data-fair.

## Limites de débit

- **Hôte de portail** (ingress nginx posé par `portals-ingress-manager`) : 1200 requêtes/min **par IP cliente et par hôte**, sans rafale au-delà, plus 200 connexions simultanées par IP → `429`. Le tileserver est limité à 120 requêtes/min.
- **data-fair lui-même** (`defaultLimits.apiRate`, en mémoire par pod) : 600 requêtes/60 s par IP en anonyme, 1200 requêtes/60 s par utilisateur ou clé d'API, plus un budget de temps Elasticsearch → `429`. Le débit en octets est ralenti, jamais refusé.
- Pour un script en volume : séquentiel, et pause puis reprise sur `429`.

## Métadonnées

- `modified` (date `YYYY-MM-DD`, `PATCH /datasets/{id}`) est la date de modification de la source, distincte des dates automatiques `updatedAt` (métadonnées) et `dataUpdatedAt` (données). Le tri `sort=-modified` utilise `_modified` = `modified`, sinon `dataUpdatedAt`, sinon `updatedAt` (`datasets/utils/compute-modified.ts`). Les portails affichent `modified || dataUpdatedAt`.
- Le formulaire de métadonnées du back-office n'affiche les champs `creator`, `frequency`, `spatial`, `temporal`, `modified` et `keywords` que si l'organisation les active dans ses paramètres : `settings.datasetsMetadata.<clé>.active: true` (faux par défaut ; `title` en donne le libellé). `searchTerms` est affiché sauf `active: false`. L'API accepte ces champs dans tous les cas, et la fiche d'un portail les montre dès qu'ils sont remplis. Un import qui les remplit doit donc activer ces clés pour qu'ils restent éditables dans le back-office.
