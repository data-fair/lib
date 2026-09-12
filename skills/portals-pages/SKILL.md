---
name: portals-pages
description: >
  Use when creating or editing a content page on a data-fair **portals v2**
  portal ("page de portail", "page de contenu", page libre) from the manager
  served at `/portals-manager`: page-config API, admin/contrib permission
  model, page element blocks (title, text, alert, Mermaid diagram,
  application embed, iframe, button), editing standard pages (home,
  contact…), publishing and moving/transferring a page between portals or
  departments, and live browser verification. Triggers: "page de portail",
  "page de contenu", "élément de page", "diagramme Mermaid", "/portals-manager",
  bloc application/iframe, "publier une page", "déplacer une page",
  "accueil du portail", "transférer une page", sommaire d'une page. Use ONLY
  for portals v2 (manager + portal service major 2); portals v1 (legacy
  Nuxt 2 pages) is out of scope.
---

# Pages de contenu Portals v2

Créer et modifier des **pages de contenu** sur un portail **portals v2** : page libre (`type: 'generic'`), blocs de contenu, diagramme Mermaid, intégration d'applications DataFair, publication et déplacement entre portails.

## Périmètre

Cet skill couvre :

- la page libre (`generic`) et ses blocs : titres, textes, alertes, Mermaid, images, iframes, intégration d'applications, boutons, conteneurs ;
- les **pages standard** (`home`, `contact`, `datasets`, `applications`…) : édition de la page existante, SEO de page, remplacement ;
- la construction dans un département sandbox puis le **transfert** vers le département/portail cible ;
- le modèle de permissions (admin/contrib, départements) et le workflow de publication ;
- la vérification du rendu dans un navigateur.

Cet skill ne couvre **pas** :

- **portals v1** (ancien module Nuxt 2, par ex. `koumoul.com` à la racine pendant la migration) : pas de gestionnaire v2, pas de bloc Mermaid, iframe brut toléré dans le markdown. Si la page est demandée sur un site v1, le dire et proposer soit une page v2, soit un rendu Mermaid en image ;
- la configuration du portail elle-même (thème, menu, en-tête, pied de page) hors `allowedFrameSources` ;
- le contenu des pages catalogue / réutilisation / événement / actualité (hors pages standard d'accueil de catalogue) ;
- le développement du code de portals (dépôt `data-fair/portals`).

**Version minimale** : le bloc `mermaid` existe depuis portals **2.33.0**. Le gestionnaire et le portail d'une cible se mettent à jour ensemble (image `:2`), donc vérifier la disponibilité du bloc avant de le proposer, et prévoir un repli en image si la cible est plus ancienne.

## 1. Situer le gestionnaire et le portail

- **Gestionnaire** : `https://<hôte>/portals-manager` (ex. `https://koumoul.com/portals-manager`). Son API est `https://<hôte>/portals-manager/api`.
- L'API du gestionnaire n'existe **que sur l'hôte du gestionnaire**, jamais sur le sous-domaine du portail. Un `fetch('/portals-manager/api/...')` lancé depuis `https://<id>.portal.koumoul.com` ou `https://docs.koumoul.com` échoue (HTML de la SPA). Utiliser l'origine du gestionnaire, ou passer par le back-office DataFair `https://<hôte>/data-fair/pages` (iframes du gestionnaire) qui est sur la même origine.
- **URL d'un portail** : `portal.ingress.url` s'il est défini, sinon `config.portalUrlPattern` (`https://{subdomain}.portal.koumoul.com` en production). Des portails ont un domaine dédié (`docs.koumoul.com`, `demo.koumoul.com`).
- **Identifier un portail à partir d'un id** (par ex. depuis `publicationSites: ["data-fair-portals:<id>"]` d'une application DataFair) :

  ```bash
  curl -s https://<hôte>/portals-manager/api/portals/<id>/public
  # => { "_id": "...", "title": "Portail de démonstration", "owner": {...}, "url": "https://demo.koumoul.com" }
  ```

  Cette route est **non authentifiée** : elle sert à retrouver le nom et l'URL d'un portail sans droits particuliers.
- **Vérifier qu'une application à embarquer existe sur l'instance DataFair du portail** : `GET https://<hôte>/data-fair/api/v1/applications/<id>` (renvoie `slug`, `public`/`visibility`, `url`). Le bloc `application` résout l'app relativement à l'instance du portail, pas du gestionnaire.

## 2. Permissions

Les comptes (Simple Directory) portent un rôle `admin` ou `contrib`. La règle effective pour une page donnée :

| Action | Rôle requis |
| --- | --- |
| Créer une page (`POST /pages`) | `admin` sur le propriétaire (`owner`) de la page |
| Lister ses pages / ses portails (`GET /pages`, `GET /portals`) | `admin` sur le compte courant |
| Éditer le brouillon (`PATCH /pages/:id`, `GET /pages/:id`) | `admin` ou `contrib` sur le propriétaire de la page |
| Publier un brouillon (`POST /pages/:id/draft`) | `admin` ou `contrib` sur le propriétaire de la page |
| Publier la page sur un portail (`portals`) | `admin` sur le propriétaire du **portail** |
| Demander une publication (`requestedPortals`) | `contrib` sur le propriétaire du portail (valable pour une page dont le propriétaire est une organisation) |

Points d'attention :

- Un département (ex. `organization:<orgId>:test`) est un propriétaire distinct : être admin de `test` ne donne **aucun** droit sur un portail du département `marketing`. Un rôle au niveau de l'organisation (sans département) couvre en revanche tous les départements.
- `portal.config.contributorDepartments` peut accorder un rôle `contrib` implicite aux membres de certains départements : c'est le mécanisme prévu pour qu'une équipe puisse demander la publication d'une page sur le portail d'une autre équipe. Un admin du portail valide ensuite (interrupteur « Publication demandée par un contributeur » → « Publié »).
- **Départager les droits dans le navigateur** : la session est un JWT en cookies. Décoder `id_token` (payload base64) donne `organizations[{id, department, role}]` ; `id_token_org`, `id_token_dep`, `id_token_role` donnent le contexte courant. Le jeton est rafraîchi par keepalive : après une modification de rôle dans Simple Directory, **recharger une page** de l'hôte pour que le nouveau rôle soit pris en compte.
- Messages d'erreur typiques : `requires admin role(s)`, `requires admin, contrib role(s)`, `requires super admin only`. Ils signifient « bon endpoint, mauvais rôle », pas « mauvais endpoint ».

## 3. Créer / modifier une page

Le chemin fiable est l'**API du gestionnaire appelée en same-origin depuis la session Playwright** (cookies inclus automatiquement) : plus rapide et déterministe que de remplir les formulaires VJSF. Voir `references/api-workflow.md` pour le script complet et les payloads exacts.

Séquence en trois appels :

1. **Créer l'entrée** — `POST /portals-manager/api/pages`

   ```json
   {
     "type": "generic",
     "owner": { "type": "organization", "id": "<orgId>", "name": "Koumoul", "department": "test", "departmentName": "Test et développement" },
     "title": "Publier et valoriser des données GTFS",
     "config": { "title": "Publier et valoriser des données GTFS", "elements": [] }
   }
   ```

   - `owner.name` est **obligatoire** dans le schéma `Account` : l'omettre produit un `400` avec un corps souvent vide.
   - Le `slug` de la page est auto-généré depuis le titre ; pour le fixer, passer `config.genericMetadata.slug` (minuscules, tirets). URL finale : `/pages/<slug>` (ou `/pages-<groupe>/<slug>` si la page est dans un groupe).

2. **Remplir le brouillon** — `PATCH /portals-manager/api/pages/<id>`

   ```json
   { "draftConfig": { "title": "...", "description": "...", "genericMetadata": { "slug": "..." }, "elements": [ /* blocs */ ] }, "portals": ["<portalId>"] }
   ```

   Le serveur recalcule `_html` des blocs `text`/`alert` (markdown sanitisé) et `_toc` des titres ancrés, puis stocke le brouillon. `portals` ne doit être envoyé que si les droits sur le portail sont acquis.

3. **Publier** — `POST /portals-manager/api/pages/<id>/draft` (`204`). Copie `draftConfig` dans `config`.

Autres opérations :

- **Déplacer une page** : `PATCH` avec le nouveau tableau `portals` (retirer l'ancien id, ajouter le nouveau). Exiger le rôle admin sur le propriétaire du portail cible.
- **Annuler un brouillon** : `DELETE /pages/<id>/draft`.
- **Dupliquer** : `POST /pages` avec `sourcePageId` (les `uuid` des blocs sont régénérés).
- **Secours UI** : `/portals-manager/pages/new` → « Page libre » → groupe → « Page blanche » → titre + propriétaire → éditeur `edit-config`. La publication se fait dans l'onglet **Publication** de la page.

## 4. Pages standard et transfert entre départements

### Pages standard (types prédéfinis)

Les types `home`, `contact`, `accessibility`, `terms-of-service`, `legal-notice`, `privacy-policy`, `cookie-policy`, `datasets`, `applications`, `reuses`, `event-catalog`, `news-catalog` existent **déjà** pour chaque portail (créées avec lui), propriété du propriétaire du portail. Il n'y a **qu'une page publiée par type et par portail**.

- Les lister : `GET /portals-manager/api/pages?size=100&select=_id,title,type,owner,portals` puis filtrer sur `type`.
- Leur contenu est exposé publiquement sur `/portal/api/pages/<type>/<slug>` (accueil : `/portal/api/pages/home/home`, page standard : `<slug>` = type, ex. `/portal/api/pages/contact/contact`).
- URL standard : accueil = `/`, les autres = `/<type>` (`/contact`, `/mentions-legales`… selon la config du portail).
- `showBreadcrumbs` est **toujours masqué sur l'accueil**, quel que soit le réglage.
- SEO de page : `description` (meta) et `thumbnail` (image de partage, référence médiathèque) sont supportés par toutes les pages ; `genericMetadata` (slug, groupe) n'existe que pour `generic`.

**Remplacement automatique** : attacher une page standard à un portail (`PATCH /pages/:id` avec `portals`) détache automatiquement la page du même type déjà publiée sur ce portail (`switchStandardPages`). Une page `home` ne peut pas être dépubliée de son portail (`You cannot unpublish home page`). Donc **ne jamais attacher une page d'accueil de test à un portail de production** : la bascule est immédiate et silencieuse.

### Construire dans un département sandbox, puis transférer

Quand on n'a des droits que sur un département (ex. `test`) et que la cible est un portail d'un autre département (`marketing`, `plateforme`) :

1. Construire et publier sur le portail du département où l'on a les droits (ou sur la page standard de ce portail), pour vérification réelle.
2. Vérifier l'URL publique du portail sandbox (title, meta, H1, images, liens, console).
3. Faire transférer par un humain admin du département cible :
   - **Transfert de propriétaire** : `PATCH /pages/<id>` avec `owner` — exige `admin` sur l'ancien **et** le nouveau propriétaire.
   - **Attachement au portail cible** : `PATCH /pages/<id>` avec `portals: ["<targetPortalId>"]` (rappel : remplace la page standard existante du même type).
   - **Publication du contenu** : `POST /pages/<id>/draft` si le contenu publié doit suivre (le transfert/attachement ne publie pas le brouillon).
4. Documenter dans la page/livrable : ids page/portail source et cible, réglages de portail à appliquer par l'admin cible.

**Images portables** : une référence `image: { _id, name, mimeType }` n'est résolue que dans la médiathèque de la page/instance courante — sur un autre portail elle renvoie `404`. Pour une page destinée à être transférée, référencer l'image par `url` absolue (ex. `https://datafair.cloud/portal/api/pages/home/home/images/<id>`) ou prévoir de la re-uploader sur la page cible. Ne pas recopier une référence `image` d'un portail à l'autre.

## 5. Contenu de la page

Le catalogue des blocs et leurs champs sont dans `references/elements.md`. À retenir d'emblée :

- Chaque bloc porte un `uuid` (généré à la création : `crypto.randomUUID()`) ; l'`uuid` sert aussi d'identifiant de synchronisation d'URL pour les applications.
- `text` et `alert` acceptent du **markdown sanitisé** (gras, liens, listes, tableaux) mais **pas d'iframe** — le sanitizer la retire ; pour intégrer, utiliser les blocs `application` ou `iframe`.
- `title` : `titleSize` visuel (`h1`…`h6` → classes `text-h1`…`text-h6`) et `titleTag` sémantique (`h1`…`h6`, `div`) sont indépendants. Le layout rend le titre du portail en `<h1>` **uniquement si l'entête est affichée** (`GET /portal/api/portal` → `config.header.show`) : vérifier avant de choisir `titleTag`. Pour un hero d'accueil (long titre), viser `titleSize: 'h2'` + `titleTag: 'h1'` ; pour une page de contenu, `titleSize: 'h3'` + `titleTag: 'h2'` (et pas de `<h1>` si l'entête en affiche déjà un).
- `title` avec `anchor: { enabled: true, inToc: true }` alimente le sommaire (`_toc`) affiché par le portail.
- Structure éditoriale éprouvée : titre → alerte « Pour qui ? » → intro (enjeu/réglementation) → diagramme Mermaid → une section par étape du cas d'usage → intégration(s) → « Pour aller plus loin » (liens) → bouton CTA.
- Renseigner `config.description` (SEO, cartes de partage) et `config.thumbnail` (og:image) ; garder les libellés en **casse de phrase** française.
- Blocs `card` (utilisés dans les grilles) : `children` et `actions` sont **requis** (tableaux, même vides) ; le lien de carte est `link` (variante sans libellé) et la carte entière devient cliquable.

## 6. Diagramme Mermaid

Bloc dédié `{ "type": "mermaid", "code": "...", "description": "..." }`, rendu **côté client** avec `securityLevel: 'strict'` et le thème du portail ; `description` alimente l'`aria-label` (accessibilité). Détails, règles de lisibilité et exemple complet dans `references/mermaid.md`.

Le piège principal est la **mise à l'échelle** : le SVG est affiché à `width: 100%` plafonné à sa largeur naturelle ; un diagramme naturellement large (LR avec beaucoup de colonnes) est réduit à ~35 % et sa police devient illisible. Viser une largeur naturelle ≤ largeur de la colonne de contenu (~700-750 px) : `flowchart TB`, libellés courts, peu de branches parallèles, `fontSize: 16px`.

## 7. Intégrer une visualisation

- **Bloc `application`** (recommandé quand l'app est sur l'instance DataFair du portail) : pas de réglage CSP, hauteur/ratio, boutons plein écran/sources. Il résout `/data-fair/api/v1/applications/<id>` et affiche `/data-fair/app/<slug>?d-frame=true`.
- **Bloc `iframe`** pour une URL externe : le domaine doit être autorisé dans la configuration du portail (`allowedFrameSources`, sinon le CSP `frame-src` bloque l'iframe) ; le bloc n'a pas de champ hauteur propre.

Détails et checklist dans `references/embeds.md`.

## 8. Vérifier

Après publication, vérifier **le rendu réel**, pas seulement la réponse API (voir `references/api-workflow.md` pour les snippets) :

1. ouvrir la page publique (accueil `/` pour une page `home`) avec un paramètre anti-cache (`?v=N`) ;
2. SEO : `<title>`, meta description, **un seul H1** (compter aussi le `<h1>` du bandeau si l'entête est affichée), `og:image` présent, JSON-LD ;
3. images : toutes chargées (`naturalWidth > 0`) — une image `404` signale une référence média d'une autre instance ;
4. diagramme : `[role="img"][aria-label*="..."] svg` présent et sans `.error-icon` ;
5. intégration : un élément `<d-frame>` avec un iframe dans son **shadow root**, canvas de carte chargé, compteur temps réel (`N véhicules`) ;
6. tuiles de carte : requêtes `/tileserver/...` en `200` ;
7. console : aucune erreur hors `favicon.ico` ;
8. capture d'écran en viewport desktop (1440 px) **et** mobile pour juger les tailles de titre et les grilles ;
9. tester en **contexte anonyme** (`browser.newContext()`) : HTTP 200, diagramme et intégration rendus.

## 9. Pièges déjà rencontrés

- **`owner` sans `name`** → `400` avec un corps vide : toujours fournir `{ type, id, name, department?, departmentName? }`.
- **API appelée sur la mauvaise origine** → réponse HTML/`Unexpected end of JSON input` : l'API n'existe que sur l'hôte du gestionnaire. Piège fréquent : naviguer vers le portail pour vérifier le rendu, puis enchaîner un appel API sans revenir sur l'hôte du gestionnaire.
- **Rôle modifié mais toujours refusé** → le JWT en cookie est périmé ; recharger une page de l'hôte pour déclencher le keepalive.
- **Deux `<h1>`** → seulement si l'entête du portail est affichée (`config.header.show`) ; dans ce cas utiliser `titleTag: 'h2'` pour les titres de page.
- **`og:image` relatif** → la `thumbnail` de page est rendue en chemin relatif (`/portal/api/pages/...`) dans `og:image` ; la plupart des robots sociaux ne le résolvent pas. Aucun contournement par le gestionnaire (la `thumbnail` n'accepte qu'une référence média) : le signaler et prévoir une correction dans `portals/portal/app/composables/use-image-src.ts`.
- **Pas d'injection JSON-LD personnalisée** → la config du portail n'expose pas de champ `head`/JSON-LD ; seuls les schémas automatiques (WebSite, WebPage, BreadcrumbList) sont émis. Ne pas promettre un JSON-LD `SoftwareApplication` via le gestionnaire.
- **Page standard attachée au mauvais portail** → `switchStandardPages` détache automatiquement la page du même type déjà publiée ; une page `home` ne peut plus être dépubliée. Ne jamais tester une page d'accueil sur un portail de production.
- **Image `404` après transfert** → référence média résolue localement ; utiliser `url` absolue ou re-uploader sur la page cible.
- **Mermaid illisible** → largeur naturelle trop grande ; passer en `TB` et raccourcir les libellés.
- **Fonds jaune/orange sur le diagramme** → le thème `base` de Mermaid dérive ses fonds de grappes du thème du portail ; neutraliser avec une directive `%%{init: ...}%%` (voir `references/mermaid.md`).
- **Publication cross-département impossible** → être admin du propriétaire du portail visé, ou passer par `contributorDepartments` + validation par un admin du portail ; pour un transfert durable, transférer l'`owner` de la page (admin requis des deux côtés).
- **Iframe externe bloquée** → ajouter le domaine dans `allowedFrameSources` ; pour une app de la même instance, préférer le bloc `application`.

## Références

- `references/api-workflow.md` — endpoints et payloads exacts, script de création complet, découverte des droits, déplacement de page, snippets de vérification.
- `references/elements.md` — catalogue des blocs utiles : champs requis, propriétés courantes, conventions de contenu.
- `references/mermaid.md` — règles de lisibilité, directive de thème, exemple de diagramme de bout en bout.
- `references/embeds.md` — `application` vs `iframe`, CSP, multi-instance, boutons d'action.
