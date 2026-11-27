# API des jeux de données : ce qui piège un script

Comportements de `/data-fair/api/v1` à connaître avant d'écrire au barreau ②. Les chemins de code cités sont dans le dépôt `data-fair` (`api/src/…`).

## Résoudre un slug

- `GET /datasets/{ref}` accepte un **id** partout, mais un **slug** seulement dans le contexte d'un site de publication : sur l'hôte du portail (slug cherché parmi les jeux du propriétaire du portail), ou sur l'hôte principal avec `?publicationSites=data-fair-portals:<portalId>`. Ailleurs, un slug répond `404` (`getByUniqueRef`, `misc/utils/find.ts` ; contexte posé dans `app.js`). Même règle pour `/applications/{ref}`.
- En liste, `GET /datasets?slug=<slug>` (ou `slugs=a,b`, `ids=a,b`) filtre (`fieldsMap`, `datasets/service.ts`). `q=` est une recherche plein texte et ne regarde pas les slugs.
- `GET /applications` n'a **pas** de filtre par slug : `?slug=` est ignoré sans erreur et renvoie toute la liste (`fieldsMap`, `applications/service.ts`). Passer par `GET /applications/{id}`, ou `?q=<titre>` puis filtrer sur `slug` côté client.

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
- `GET /datasets/{id}/raw` est servi sans aucun cache (`cacheHeaders.noCache`, `routes/files.ts`), mais ne renvoie que le fichier source d'un jeu fichier, pas les lignes indexées, les agrégations ni les extensions (sur un jeu REST, `404`, sauf pour un superadmin). Pour des lignes fraîches, utiliser `?finalizedAt=` / `?indexedAt=` ci-dessus.

## Types inférés

- L'analyse d'un fichier infère les types : un téléphone, un code postal ou un code INSEE devient un nombre et **perd ses zéros de tête**. Forcer le type sur la propriété du schéma : `"x-transform": { "type": "string" }` (avec `"format"` au besoin), dans un `PATCH` du schéma complet. `cleanSchema` applique ce type, et le changement de `x-transform` relance la relecture du fichier stocké (statut `analyzed`) : les valeurs reviennent avec leurs zéros.
- Une colonne **sans aucune valeur dans tout le fichier** est typée `empty` et retirée du schéma à l'analyse, avec une erreur au journal (« colonnes vides qui seront ignorées »). Si elle était annotée (titre, concept), ses annotations partent avec elle : les reposer après le premier chargement qui la remplit.

## Vignettes d'images

`GET /datasets/{id}/thumbnail/<url en hexadécimal>` vérifie que l'URL existe dans le jeu par un filtre exact sur la colonne portant le concept `http://schema.org/image` (`datasets/routes/misc.ts`). Si cette colonne a `x-capabilities.index: false`, toutes les vignettes répondent `400` et le tableau affiche des images cassées. En allégeant les capacités d'une colonne d'URL d'image, garder `index` ; `values`, `text`, `textStandard` et `insensitive` peuvent partir.

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

## Listes par propriétaire et département

- Il n'y a pas de filtre `department` : `GET /datasets?department=<dep>` et `GET /applications?department=<dep>` l'ignorent et renvoient la même liste. Filtrer plutôt sur le propriétaire : `owner=organization:<orgId>:<dep>` (`<dep>` = `-` pour la racine de l'organisation seule, `*` ou rien pour la racine et tous les départements ; plusieurs propriétaires séparés par des virgules ; un `-` en tête exclut, par exemple `owner=-organization:<orgId>:<dep>`) (`ownerFilters`, `misc/utils/find.ts`).
- `mine=true` restreint au compte actif de la session, département compris ; `401` sans session.

## Permissions

`PUT /datasets/{id}/permissions` (idem pour `/applications/{id}/permissions`) remplace toute la liste. Une entrée : `{ type, id, department?, roles?, classes?, operations? }` ; sans `type`/`id` = public. Les `classes` se développent en opérations (`list`, `read`, `readAdvanced`, `write`…), `operations` ajoute des opérations isolées.

Qui obtient quoi (`misc/utils/permissions.ts`) :

- **Droits implicites liés à la propriété** : un admin du compte propriétaire peut tout faire ; un contributeur du propriétaire n'obtient que `post` (créer des ressources), pas même la lecture de celle-ci ; un utilisateur n'obtient rien. Tout le reste vient d'entrées explicites.
- **Racine de l'organisation et départements** : un membre de la racine de l'organisation est traité comme membre de chaque département avec le même rôle, donc un contributeur de la racine obtient les permissions données aux contributeurs d'un département. Un membre d'un département ne correspond qu'aux entrées de la racine ouvertes à tous les départements et à celles de son propre département.
- **`department` d'une entrée** : absent ou `'*'` = la racine et tous les départements ; `'-'` = la racine seule ; `'<dep>'` = ce département **et la racine**.
- **`roles`** : vide ou absent = tous les rôles ; sinon le rôle actif doit être listé, les admins correspondent toujours.
- Une entrée `type: 'user'` (par `id` ou `email`) s'applique quel que soit le compte actif. Les listes (`filterCan`) appliquent les mêmes règles que les lectures unitaires.
- **Valeurs par défaut à la création** (propriétaire organisation) : `{ roles: ['contrib'], classes: ['write'], operations: ['delete'] }` et `{ roles: ['contrib'], classes: ['list', 'read', 'readAdvanced'] }`, avec `department` = le département du propriétaire ou `'-'` (`initResourcePermissions`). Un **transfert de propriétaire** remet la liste à ces valeurs par défaut, en gardant les entrées publiques et, au sein de la même organisation, les entrées d'utilisateurs et d'autres organisations (`ownerChangePermissions`).
- **Jeu visible sans ses données** (catalogue, page, métadonnées) : une entrée **sans classe** avec les opérations `['list', 'readDescription']`. Dans le dialogue des permissions, cocher la classe « Lister » ajoute d'office la classe « Lecture » (lignes et téléchargements), et les préréglages « Qui peut consulter cette ressource ? » posent aussi `list` + `read` : passer par les actions détaillées (« Lister » ajoute alors seulement `readDescription`).
- **Vérifier ce qu'obtient un visiteur** sans seconde identité : `GET /datasets?asVisitor=<visiteur>` (idem `/applications`), avec `anonymous`, `connected`, `role:<rôle>[:<dep>]` ou `member:<id>:<email>:<rôle>[:<dep>]`, renvoie la liste telle qu'il la voit avec ses `userPermissions` calculées. Réservé à un admin de l'organisation active (ou au mode admin), refusé avec une clé d'API (`misc/utils/as-visitor.ts`).
- **Contributeurs autorisés seulement à mettre à jour les données** d'un jeu fichier : remplacer l'entrée `write` des contributeurs par `{ type: 'organization', id, department, roles: ['contrib'], classes: [], operations: ['writeData', 'cancelDraft'] }`, à côté de l'entrée de lecture. `writeData` (`POST`/`PUT /datasets/{id}`) et `cancelDraft` n'existent que sur les jeux fichier ; les écritures de lignes d'un jeu REST sont d'autres opérations de la classe `write`.

## Cloisonnement par ligne

Ne montrer à chaque lecteur que ses propres lignes d'une table partagée, sans la dupliquer :

- **Côté lecture, jeu virtuel** : une colonne de la source porte le concept `x-refersTo: https://github.com/data-fair/lib/account` (vocabulaire `accountRef`), valeurs `user:<id>` ou `organization:<orgId>` / `organization:<orgId>:<dep>`, plusieurs valeurs permises. Un jeu virtuel par-dessus avec `virtual.filterActiveAccount: true` (la colonne doit être dans son schéma) ne renvoie que les lignes dont la colonne correspond à l'un des comptes du lecteur (`datasets/middlewares.ts`, `es/commons.ts`) :
  - la source elle-même ne filtre pas : restreindre ses propres permissions et ouvrir le jeu virtuel ;
  - le lecteur doit être authentifié (`401` sinon), et obtient les lignes de toutes ses appartenances : `user:<id>` plus `organization:<orgId>[:<dep>]` par appartenance. La correspondance est exacte : une ligne marquée `organization:<orgId>` n'est pas renvoyée à un membre d'un département ;
  - tout membre du propriétaire du jeu virtuel voit toutes les lignes ;
  - `?account=a,b` restreint à certains des comptes du lecteur, un compte hors de ceux-ci répond `403` ;
  - ces réponses ne sont jamais mises en cache ; un tel jeu virtuel ne peut pas être l'enfant d'un autre jeu virtuel (`501`).
- **Côté écriture, jeu REST** : `rest.lineOwnership: true` ajoute les colonnes calculées `_owner` (`<type>:<id>[:<dep>]`) et `_ownerName`, et les routes `/datasets/{id}/own/<type>:<id>[:<dep>]/lines…` (lecture, création, mise à jour, patch, suppression, bulk, révisions). Le segment `<owner>` doit être exactement le compte actif (ou l'utilisateur), sinon `403`. Donner la classe `manageOwnLines` aux contributeurs : ils gèrent leurs lignes sans la classe `write` sur tout le jeu. Refusé tant que l'intégrité est active.

## Jeux REST et pièces jointes de lignes

- Créés avec `POST /datasets` et `{ isRest: true, title, schema, rest: { history?, lineOwnership?, storeUpdatedBy?, ttl? } }`. `rest.history: true` garde les révisions de chaque ligne (`GET …/lines/{lineId}/revisions`).
- Un fichier attaché à une ligne demande une colonne portant le concept `http://schema.org/DigitalDocument` (le back-office la nomme `attachmentPath`). Envoyer la ligne en `multipart/form-data`, le fichier dans le champ `attachment` et les autres colonnes en champs de formulaire (ou en JSON dans un champ `_body`), vers `POST …/lines`, `PUT` ou `PATCH …/lines/{lineId}`. La réponse porte le chemin stocké dans cette colonne : `<lineId>/<md5>/<nom du fichier>` (`manageAttachment`, `datasets/utils/rest.ts`). Sans `history`, les fichiers précédents de la ligne sont supprimés.

## Pièces jointes de métadonnées

`attachments` d'un jeu (`PATCH /datasets/{id}`), trois `type` (`api/types/dataset/schema.js`) :

- `file` : téléversé avec `POST /datasets/{id}/metadata-attachments` (multipart), puis référencé par son `name` ;
- `url` : un simple lien, rien n'est téléchargé ;
- `remoteFile` : `name` (avec une extension correspondant au format) et `targetUrl`. Data-fair télécharge la cible par un **GET**, conditionnel sur ETag / Last-Modified, et la sert depuis `GET /datasets/{id}/metadata-attachments/<name>` (cache de 5 s par défaut, `remoteAttachmentCacheDuration`). Un téléchargement en échec répond `502`. `targetUrl` est en écriture seule (il peut contenir un secret) : il n'est jamais relu, le laisser hors d'un `PATCH` ultérieur sauf si le `name` change, auquel cas il faut le renvoyer.

`includeInCatalogPublications` (`false` par défaut) décide si une pièce jointe `url` ou fichier est recopiée dans les publications sur les catalogues distants (plugins udata, CKAN).

## Données de référence et jeux virtuels d'autres comptes

- `masterData.virtualDatasets.active: true` propose le jeu comme enfant des jeux virtuels **d'autres comptes** (il est alors aussi listé dans le back-office d'un site de publication). Ces comptes doivent quand même pouvoir le lire : les enfants d'un jeu virtuel sont résolus avec les droits de son propriétaire (`recurseDescendants`, `datasets/utils/virtual.ts`), donc la source doit être publique ou porter une permission pour eux. Écrire `masterData` exige un admin de la racine de l'organisation propriétaire (`manageMasterData` ; un admin de département reçoit `403`).
- Chaque jeu de données de référence est synchronisé vers un service distant `dataset:<id>` (`remote-services/service.ts`). Son drapeau `public` et `virtualDatasets.storageRatio` sont écrits par un superadmin (`PATCH /remote-services/dataset:<id>`) et conservés d'une resynchronisation à l'autre. Quand il n'est pas public, seuls le propriétaire et les organisations de `masterData.shareOrgs` peuvent utiliser ses actions d'extension.
- `storageRatio` (de 0 à 1, 0 par défaut) facture au jeu virtuel d'un autre compte une part de la taille indexée de l'enfant : `taille indexée de l'enfant × storageRatio × lignes qu'il expose / lignes de l'enfant` (`datasets/utils/storage.ts`). Les enfants du même propriétaire ne sont pas facturés.

## Routes de reprise superadmin

Avec `user.adminMode` seulement (`403` sinon, `datasets/routes/misc.ts`) :

- `POST /datasets/{id}/_refinalize` : remet le jeu (ou son brouillon) en `indexed` pour que le worker relance la finalisation, pour un jeu bloqué avant `finalized` ;
- `POST /datasets/{id}/_reindex` : réindexation complète ;
- `DELETE /datasets/{id}/_lock` : supprime les verrous d'un jeu dont le `409` ne finit jamais.
