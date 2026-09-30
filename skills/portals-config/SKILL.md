---
name: portals-config
description: >
  Use when configuring a **portals v2 portal itself** through the
  portals-manager API (`/portals-manager/api/portals`): creating or
  duplicating a portal, editing and publishing its draft config (theme and
  colours, assisted mode, dark/high-contrast themes, fonts, logos, favicon,
  header, nav bar and menu, breadcrumb, footer, contact informations, social
  links, dataset/application cards and pages, defaults, robots, iframe
  sources), uploading portal images, understanding what is synced to
  data-fair / simple-directory / ingress, and verifying the published result.
  Triggers: "configurer le portail", "thème du portail", "couleurs du
  portail", "mode assisté", "pied de page", "footer", "menu du portail",
  "barre de navigation", "entête", "logo du portail", "favicon", "police du
  portail", "vignettes de jeux de données", "page d'un jeu de données",
  "créer un portail", "dupliquer un portail", "brouillon du portail",
  "publier la config", "draftConfig", "_theme.css", "allowRobots",
  "/datasets Page not found". Portals v2 only; page content stays in
  portals-pages.
---

# Configuration d'un portail Portals v2

Créer un portail v2 et régler **sa configuration** (thème, polices, logos, entête, menu, pied de page, catalogues, contact…) par l'API du gestionnaire, sans tomber dans les pièges déjà rencontrés.

## Périmètre

Ce skill couvre :

- la création (et la duplication) d'un portail, le cycle brouillon → publication de sa configuration ;
- chaque section de `config` : thème, polices, images, navigation, pied de page, vignettes et pages de jeux de données / visualisations, contact, réseaux sociaux, sécurité ;
- ce que le gestionnaire propage vers data-fair, simple-directory et l'ingress, et les délais qui en découlent ;
- la vérification du résultat publié.

Ce skill ne couvre **pas** :

- le **contenu des pages** (accueil, pages libres, blocs, pages standard) : voir le skill **`portals-pages`**. Seule la *création/rattachement* des pages standard indispensables au portail est rappelée ici (§3) ;
- portals v1 (Nuxt 2) ;
- l'identité NHI, les outils WebMCP et la mécanique navigateur : voir **`data-fair-browse`** ;
- le développement du dépôt `data-fair/portals`.

Code de référence (dépôt `data-fair/portals`) : `api/src/portals/router.ts` et `service.ts`, `api/types/portal-config*/schema.*`, `portal/app` (rendu), `portal/server` (API publique `/portal/api`, cache du thème). Thème : `lib/packages/common-types/theme/index.ts`. CSS du thème : `simple-directory/api/src/utils/theme.ts`.

## 1. Vérifier la version avant de choisir une forme de config

La production peut tourner une version plus ancienne que `master`. Cas vécu le 29/09/2026 : la prod refusait le pied de page en `rows` et `copyright: true`, et attendait l'ancienne forme `copyright: 'text' | 'logo'` + `links` / `importantLinks` / `extraLogos` / `logoPrimaryType`.

- Le pied de page en lignes/colonnes/blocs arrive avec le commit `fba9cbb9` (24/09/2026), **après** le tag `v2.33.1` : il sort dans la version suivante (2.34), avec la migration `upgrade/2.33.1/footer-rows.ts` qui convertit les pieds de page existants et garde l'ancien dans `legacyFooter` / `legacyDraftFooter`.
- **Lire la version** : `GET /portals-manager/api/admin/info` (réservé superadmin, mode admin actif) renvoie le `BUILD.json`. Sans superadmin, lire un portail existant : `GET /portals-manager/api/portals/<id>` → `config.footer.rows` présent = nouvelle forme ; `config.footer.links` / `copyright: 'text'` = ancienne forme. Un `legacyFooter` au niveau du portail prouve que la migration a tourné.
- En dernier recours, les erreurs de schéma trahissent la version (`copyright doit être de type string` = ancienne).

Ne jamais recopier une forme de `master` sur une cible sans ce contrôle.

## 2. Le modèle : un portail, deux configs

Un portail (`mongo.portals`) porte `config` (publiée) et `draftConfig` (brouillon), plus des champs hors config : `owner`, `ingress`, `staging`, `contributorDepartments`, `whiteLabel`, `isReference`, `md2Compat`.

| Méthode | Route (`/portals-manager/api`) | Rôle | Effet |
| --- | --- | --- | --- |
| `GET` | `/portals?size=100&select=_id,title,owner,ingress` | admin du compte courant | lister (`isReference=true` : portails de référence) |
| `GET` | `/portals/:id` | admin/contrib du propriétaire | portail complet |
| `GET` | `/portals/:id/public` | public | `{_id, title, owner, url}` |
| `POST` | `/portals` | admin sur `owner` | créer (§3) |
| `PATCH` | `/portals/:id` | admin | `draftConfig`, `owner`, `staging`, `contributorDepartments` ; `whiteLabel`/`isReference`/`md2Compat` = superadmin |
| `POST` | `/portals/:id/draft` | admin | publier : `config = draftConfig` (`204`) |
| `DELETE` | `/portals/:id/draft` | admin | annuler : `draftConfig = config` |
| `POST` | `/portals/:id/ingress` | **superadmin** (mode admin) | domaine dédié, redirections, certificat |
| `POST` | `/images` | session = propriétaire | uploader une image (§8) |

L'API s'appelle en same-origin depuis l'hôte du gestionnaire avec la session navigateur (voir `portals-pages` §1 et `data-fair-browse`) ; elle refuse les clés d'API.

**Le PATCH remplace `draftConfig` en entier** (`{ ...portal, ...patch }` puis `$set`) : pas de fusion profonde. Toujours `GET` → modifier l'objet → renvoyer **tout** `draftConfig` → `POST /draft`. Envoyer `{ draftConfig: { theme } }` seul échoue sur les propriétés requises, ou pire efface le reste si le schéma passe.

Un PATCH de `draftConfig` :

1. valide le corps (schéma `portal-config`, `unevaluatedProperties: false` : toute clé inconnue est rejetée) ;
2. (nouvelle version) refuse un pied de page sans mention Koumoul si le portail n'est pas en marque blanche (§7) ;
3. **recalcule le thème** (`fillTheme`, §4) et le HTML des champs markdown (`contactInformations.infos_html`, blocs texte du pied de page) ;
4. **propage avant d'enregistrer** (§10) : si data-fair ou simple-directory refuse, le PATCH échoue en entier (`data-fair error (403): …`, `simple-directory error (…)`).

`POST /draft` repasse par la propagation puis **supprime les images du portail** qu'aucune des deux configs ne référence plus.

### Erreurs de validation

Corps `400` en texte, messages ajv traduits en français, joints par `, ` : `body/draftConfig/footer doit avoir la propriété requise rows, body/draftConfig/menu/children/0 doit correspondre exactement à un schéma de "oneOf", …`. Les `oneOf` (items de menu, liens, blocs) produisent une cascade d'erreurs par branche : **lire le chemin le plus profond**, ignorer les « doit correspondre à un schéma de oneOf » en amont. Pour isoler : renvoyer la config publiée (`portal.config`) en ne changeant qu'une section à la fois ; celle qui fait échouer est la coupable.

**Taille** : l'API parse le JSON avec `express.json()` sans option, donc **100 ko** maximum ; au-delà, `413 request entity too large`. Les gros contributeurs sont les icônes MDI (`icon.mdi` exige `name`, `svg` **et** `svgPath`) répétées dans le menu, les thématiques et les liens : limiter le nombre d'icônes, aucune option ne relève la limite.

## 3. Créer un portail

```json
POST /portals-manager/api/portals
{ "owner": { "type": "organization", "id": "<orgId>", "name": "Koumoul", "department": "marketing", "departmentName": "Marketing" },
  "config": { "title": "Portail de démonstration" } }
```

- `owner` est optionnel (défaut : compte courant) mais s'il est fourni `name` est **obligatoire** (schéma `account`).
- `config` n'accepte **que `title` et `menu`**. Le serveur part d'une config initiale (`router.ts`), puis applique la config dupliquée (`sourcePortalId`), puis `body.config`, par **fusion de premier niveau** : un `menu` fourni remplace celui du portail source.
- Config initiale : `authentication: 'optional'`, thème par défaut rempli, `header: { show: true, showTitle: true }`, `navBar: {}`, `breadcrumb: {}` (fil d'Ariane masqué), `linksConfig.underline: 'always'`, pied de page avec copyright + lien « Plan du site », `datasets.card: {}` et `datasets.page.metadata.actionButtons` complet, `applications/reuses/events/news` vides, `socialShares` complet. **Absents** : `allowRobots` (portail non indexé, §9), `defaults` (cartes plates), `logo`, `favicon`, `topics`.
- **Duplication** : `sourcePortalId` copie la config publiée d'un portail dont on est admin ou d'un portail de référence (`isReference`) : images dupliquées, menu et styles repris, **pas les pages**.
- `config === draftConfig` à la création : rien à publier.

### Les pages standard ne sont pas créées par l'API

`POST /portals` ne crée **aucune page**. C'est l'assistant du gestionnaire (`ui/src/pages/portals/new.vue`) qui crée ensuite `home` (toujours) et, si on les choisit, `datasets` et `applications`. Par l'API, un portail neuf n'a donc ni accueil ni catalogue : `/datasets` répond « Page not found » tant qu'aucune page `datasets` n'est rattachée (`portal/app/pages/datasets/index.vue` lit `/portal/api/pages/datasets/datasets`). Même chose pour `/contact`, `/legal-notice`, etc.

Créer chaque page utile (`home`, `datasets`, `applications`, puis `contact`, `legal-notice`, `privacy-policy`, `accessibility`…) :

```json
POST /portals-manager/api/pages
{ "type": "datasets", "owner": { …même compte que le portail… }, "title": "Catalogue de données - <portail>",
  "config": { "title": "Données", "elements": [] } }
```

puis `PATCH /pages/<id> { "portals": ["<portalId>"] }`.

- Avec `elements: []`, le serveur insère l'élément catalogue par défaut pour `datasets`, `applications`, `reuses`, `event-catalog`, `news-catalog` ; les autres types restent vides.
- **Rattacher par `PATCH`, pas dans le `POST`** : seul le PATCH déclenche `switchStandardPages` (une seule page d'un type par portail). Un `POST` avec `portals` rattache sans détacher l'existante, et le portail sert alors l'une des deux au hasard.
- Le portail ne sert que les pages dont `owner.type` / `owner.id` sont **ceux du portail** (le département peut différer). Un portail `staging` sert les pages de `requestedPortals`, pas de `portals`.
- Pages de référence réutilisables : `GET /pages?type=datasets&isReference=true`, puis `sourcePageId` au `POST`.
- Contrôle : `GET https://<portail>/portal/api/pages/standard-exists` → `{ datasets: true, contact: false, … }`.

Le contenu de ces pages relève de `portals-pages`.

## 4. Thème et couleurs

`config.theme` suit le schéma `lib/packages/common-types/theme` : `colors` (requis), `dark` + `darkColors`, `hc` + `hcColors`, `hcDark` + `hcDarkColors`, `assistedMode` + `assistedModeColors { primary, secondary, accent }`.

**Le serveur recalcule le thème à chaque PATCH de `draftConfig`** (`fillTheme` dans `patchPortal`) :

- `assistedMode: true` : les **quatre palettes sont remises aux valeurs par défaut** (dont `background` `#FAFAFA`, `surface`, `info`, `warning`…), puis `primary/secondary/accent` et leurs `on-*` sont posés, et les `text-primary/secondary/accent` sont **assombris** (ou éclaircis en sombre) jusqu'au contraste AA (AAA en contraste élevé). Exemple vérifié : secondaire `#FFC300` → `text-secondary` `#8a6900`, `on-secondary` `#000000`. Toute couleur saisie à la main dans `colors` est écrasée.
- `assistedMode: false` (ou absent) : les palettes sont gardées **telles quelles** ; seul `assistedModeColors` est réaligné sur `colors`.

Donc :

- pour une couleur exacte (fond `background` personnalisé, `text-secondary` imposé par une charte), passer en `assistedMode: false` et écrire `colors` / `darkColors` explicitement ;
- pour partir du mode assisté puis retoucher, faire **deux PATCH** : le premier en assisté (le serveur calcule), relire, puis le second en `assistedMode: false` avec les retouches. Un seul PATCH « assisté + retouches » perd les retouches.

`dark`, `hc`, `hcDark` activent chaque variante **et** le sélecteur de thème ; un visiteur dont le système est en sombre bascule automatiquement sur `dark` si elle est activée (`portal/app/plugins/03-vuetify.ts`). Relire les avertissements de contraste : `GET https://<portail>/simple-directory/api/sites/_/_theme_warnings` (le site est résolu par l'hôte, le segment `_` est ignoré).

### D'où vient chaque couleur (et pourquoi certaines changent en retard)

- Les variables `--v-theme-*` (fond, `bg-primary`, boutons…) sont construites **à chaque requête** depuis la config du portail : effet immédiat après publication.
- Les classes `text-primary`, `text-secondary`…, les liens `simple-link` et les **polices** viennent de la feuille `/simple-directory/api/sites/<hash>/_theme.css` du site simple-directory du portail. Le portail met en cache le hash de cette feuille **1 minute** (`memoize maxAge: 60000` dans `portal/server/plugins/sd-resources.ts`, par pod). Un changement de `text-*` ou de police apparaît donc jusqu'à ~1 min après le reste. Le fichier haché est `immutable` : un nouveau hash = une nouvelle URL, pas de cache navigateur à vider.

## 5. Polices

`bodyFontFamily` et `headingFontFamily` (vide = police principale). Valeurs possibles : `GET /portals-manager/api/fonts` = les polices chargées par le compte (`/portals-manager/font-assets`, rangées par `owner.type/id`) puis la liste standard `api/assets/fonts.json` : **Montserrat, Noto Sans, Nunito, Pacifico, Roboto**. Sans réglage, simple-directory applique Nunito. Un nom inconnu produit un `@font-face` vide : la police de repli du navigateur s'affiche sans erreur. Les polices passent par la feuille simple-directory, d'où le délai d'~1 min (§4).

## 6. Navigation

- **Menu** `menu.children[]` : `standard` (`subtype` : `home`, `contact`, `datasets`, `applications`, `reuses`, `event-catalog`, `news-catalog`, `legal-notice`, `privacy-policy`, `cookie-policy`, `accessibility`, `terms-of-service`, `sitemap`, `catalog-api-doc`), `generic` (`pageRef { slug, title, group? }`), `event` / `news` (`pageRef`), `external` (`title`, `href`), `submenu` (`title`, `children`). Chaque item : `title`, `icon`, `target`. Les URL sont fixes : `/legal-notice`, `/privacy-policy`, `/event`, `/news`… (`portal/app/utils/nav-active.ts`). Un item standard vers un type sans page publiée mène à une 404.
- **`navBar`** (et `navBarHome` si `navBarHomeActive`) : `fluid` vaut **pleine largeur quand absent** → poser `fluid: false` pour aligner les onglets sur le contenu ; `align` `left`/`center` (absent = centré) ; `tabsStyle` ⊂ `['boldTitle', 'uppercaseTitle', 'largerFont']` ; `color`, `sliderColor` ; `transparent`, `keepOnScroll` ; `logoType` `default`/`local`/`hidden`.
- **`loginColor`** ne règle que le **fond** du bouton de connexion (`bg-<couleur>`, texte en `on-<couleur>`) ; vide = couleur de la barre. La couleur de l'icône ne se règle pas : icône seule quand l'entête est masquée ou sur mobile, texte « Se connecter » sinon.
- **`header`** (et `headerHome`) : `show`, `showTitle`, `logoPrimaryType` `default` (logo global) / `local` / `hidden`, `logoPrimaryCentered`, `logoSecondary`, `color`, `keepOnScroll`, `showSocial`. Le titre du portail est rendu en **`<h1>`** si `show && showTitle && !logoPrimaryCentered` : en tenir compte pour les titres des pages (`portals-pages`).
- **`breadcrumb.position`** : `none` (absent = masqué), `below-nav`, `above-footer`, `both` ; jamais sur l'accueil.

## 7. Pied de page

Deux formes selon la version (§1). Détails des champs : `references/config.md`.

- **Ancienne (≤ 2.33.1)** : requis `color`, `copyright` (`'text'` = « ©année — Koumoul » en bas, `'logo'` = logo Koumoul parmi les logos), `logoPrimaryType` (`default` | `header` | `local` | `hidden`), `extraLogos[] { logo, label, link? }`, `linksMode` (`lines`|`columns`), `links[]`, `importantLinks[]` (boutons) ; options `slogan`, `text` (markdown), `backgroundImage`, `socialPosition`, positions/alignements. La mention Koumoul est toujours affichée.
- **Nouvelle (lignes)** : requis `copyright` (booléen), `background { color, image?, imageLocation? }`, `rows[]` ; chaque ligne `columns` 1|2|3, `blocks` / `blocks2` / `blocks3`, `disposition`, `gutter`, `align`, `background` ; blocs `images`, `text`, `links`, `buttons`, `social`, `divider` (`additionalProperties: false`, `type` + `align` requis).
- **Mention Koumoul obligatoire** hors marque blanche : `copyright: true`, ou un bloc `images` avec un item `source: 'koumoul'`. Sinon `400 Le pied de page doit afficher la mention Koumoul…`. `whiteLabel` ne se pose qu'en superadmin.

## 8. Images du portail

`POST /portals-manager/api/images`, multipart : champ `body` = `{"resource":{"type":"portal","_id":"<portalId>"}}`, fichier `image`, query optionnelle `width`/`height`. Réponse `{ _id, name, mimeType, width, height, mobileAlt? }` à poser dans `logo`, `logoDark`, `favicon`, `header.logoPrimary`, `navBar.logo`, `datasets.card.thumbnail.default`, `topics[].thumbnail`, images du pied de page…

- **Le compte actif de la session doit être le propriétaire exact** du portail (type, id **et département**) : sinon `404 linked portal not found`, même en étant admin de l'organisation. Basculer la session sur le bon département avant l'upload.
- **SVG** (`image/svg+xml`) : stocké **tel quel**, net à toute taille, `width`/`height` renvoyés à `0`. Envoyer le `Blob` avec ce type MIME, sinon sharp le rastérise.
- Tout autre format (PNG, JPEG, GIF, ICO) est **converti en webp** ; au-delà de 1536 px de large, une variante `-mobile` (1280 px) est créée et `mobileAlt: true` renvoyé (garder tel quel pour une image de portail).
- Une image de portail n'est servie que par ce portail (`/portal/api/images/<id>`) et disparaît à la publication suivante si plus rien ne la référence.
- `logoDark` n'est utilisé que si le thème sombre courant est actif (`dark` ou `hcDark`) ; sinon `logo`.

## 9. Catalogues, contact, sécurité

**Les `default` des schémas ne sont pas appliqués au rendu.** Le formulaire du gestionnaire les remplit à l'ouverture d'une section ; l'API, non. Un portail configuré par l'API avec `datasets.card: {}` affiche des vignettes sans résumé, sans image, sans propriétaire et **sans boutons d'action**. Poser chaque valeur voulue explicitement. Récapitulatif et valeurs dans `references/config.md`.

- **Vignettes** `datasets.card`, `applications.card` : `actionsLocation` (`right`/`bottom`/`none`), `actionsStyle` (`icon`/`full`/`text` ; absent = texte seul), `thumbnail { show, location, crop, default, useTopic, useApplication, useSummary }`, `topics { show, showIcon, … }`, `keywords { show, … }`, `titleLinesCount`, `showSummary` (champ `summary` du jeu, jamais sa description), `showDepartment`. `reuses.card` et `news.card` n'ont **pas** de boutons d'action.
- **Icônes des thématiques** : elles viennent des paramètres de l'organisation dans data-fair (`topics[].icon { name, svg, svgPath }`, tirés du jeu `icons-mdi-latest`), pas du portail ; `showIcon` ne fait qu'afficher ce qui existe.
- **`defaults`** (`elevation`, `density`, `rounded`, `hover`) : hérités par vignettes, boutons, blocs et onglets quand ils ne fixent rien. Absent sur un portail neuf.
- **Page d'un jeu de données** `datasets.page` : `applications.display` (`none`/`card`/`full-list`/`side-by-side`), `reuses.display`, `relatedDatasets.display`, `metadata.location` (`right`/`top`/`bottom` ; absent = pleine largeur), `metadata.actionsStyle`, `metadata.actionButtons`, `metadata.showDepartment`. **Sans `display` explicite, la section n'est pas rendue.**
- **Page d'une visualisation** `applications.page` : `datasets.display: 'card'` pour « Données utilisées », `metadata.showBaseApplication` (affiché sauf `false`), `metadata.actionsStyle: 'full'` pour icône + texte.
- **`contactInformations`** : `email` (jamais exposé publiquement, synchronisé vers `mails.contact` du site simple-directory : c'est la destination du bloc « formulaire de contact » ; **vide, les messages partent à l'adresse de contact globale de la plateforme**), `phone`, `website`, `infos` (markdown).
- **`socialLinks`** : **identifiants, pas URL** (`linkedin: 'koumoul'` → `https://linkedin.com/company/koumoul`) ; une URL complète donne un lien cassé.
- **`allowRobots: true`** pour être indexé : absent, `robots.txt` répond `Disallow: /` (et toujours sur le brouillon).
- **`allowedFrameSources`** (CSP `frame-src` des iframes de pages), **`allowedFrameAncestors`** (sites autorisés à intégrer le portail). **`authentication`** `none`/`optional`/`required` (`required` rend le site de publication data-fair privé).

## 10. Propagation vers les autres services

`syncPortalUpdate` (appelé à chaque PATCH et publication, avant l'écriture en base) :

- **data-fair** : `POST /data-fair/api/v1/settings/<type>/<id[:dept]>/publication-sites` avec **le cookie de l'utilisateur** : site `data-fair-portals:<portalId>` (titre, URL, `datasetUrlTemplate`…, `private`, `staging`). Il faut donc aussi les droits d'admin sur les paramètres data-fair du propriétaire. Envoyé seulement si titre, URL, authentification, staging ou départements contributeurs changent.
- **simple-directory** (clé secrète) : deux sites, `data-fair-portals:draft-<id>` (brouillon, `tmp`) et `data-fair-portals:<id>` (`tmp` tant qu'il n'y a pas d'`ingress`), avec thème, logo, polices et `contact`. Le site principal ne change qu'à la **publication**.
- **ingress manager** : brouillon `<id>.draft` sur `portalUrlPattern`, et domaine dédié si `ingress` (posé uniquement par un superadmin via `POST /portals/:id/ingress` ; `controller: 'manual'` = géré à la main).

URL du portail : `ingress.url`, sinon `portalUrlPattern` avec l'id (`https://<id>.portal.koumoul.com`). **Brouillon** : même motif avec `<id>.draft` ; il sert `draftConfig`, exige une connexion (session propre à cet hôte) et interdit l'indexation.

## 11. Recette de vérification

Après `POST /draft` (snippets dans `references/recipes.md`) :

1. **Config publiée** : `GET https://<portail>/portal/api/portal` → `{ _id, owner, config, draft: false, … }` ; comparer `config` à ce qui a été envoyé (le thème recalculé, `infos_html`, etc.).
2. **Pages** : `GET /portal/api/pages/standard-exists` ; `GET /portal/api/pages/home/home` ; ouvrir `/datasets`, `/applications` et chaque cible du menu.
3. **Thème** : dans le HTML, `<link href="/simple-directory/api/sites/<hash>/_theme.css">` ; comparer `<hash>` à `GET https://<portail>/simple-directory/api/sites/_hashes` (`themeCss`). Différent = cache du portail, attendre ~1 min et recharger.
4. **Rendu** : en anonyme, thèmes `default` et `dark` (si activé), desktop et mobile ; vignettes (actions, résumé, image), page d'un jeu, entête (un seul `<h1>`), pied de page (mention Koumoul), `robots.txt`.

## 12. Pièges déjà rencontrés

- **Forme de pied de page refusée par la prod** → version plus ancienne que `master` : vérifier (§1) avant d'écrire `rows` ou `copyright: true`.
- **Section entière effacée** → PATCH avec un `draftConfig` partiel ; toujours lire-modifier-renvoyer.
- **Couleur de fond ou `text-*` revenue à l'ancienne valeur** → `assistedMode: true` réécrit toutes les palettes à chaque PATCH ; passer en `assistedMode: false`.
- **Jaune de charte devenu brun dans les textes** → `text-secondary` assombri pour le contraste AA : c'est voulu ; imposer une autre valeur exige le mode manuel (et accepter l'avertissement de contraste).
- **Couleur de texte ou police qui « ne prend pas »** → cache du hash de `_theme.css` (1 min) ; les fonds, eux, changent tout de suite.
- **`/datasets` → « Page not found »** → aucune page `datasets` rattachée : l'API ne crée pas les pages standard.
- **Deux pages d'accueil ou de catalogue qui alternent** → rattachement fait dans le `POST /pages` ; rattacher par `PATCH` pour déclencher le remplacement.
- **Vignettes sans boutons ni résumé, sections « Visualisations » absentes** → valeurs par défaut du schéma non appliquées ; tout expliciter.
- **Boutons d'action sans icône** → `actionsStyle` absent = texte ; `full` pour icône + texte.
- **Barre de navigation bord à bord** → `fluid` absent vaut pleine largeur ; `fluid: false`.
- **Portail invisible sur les moteurs** → `allowRobots` absent.
- **`404 linked portal not found` à l'upload** → la session n'est pas sur le compte/département propriétaire du portail.
- **SVG rastérisé et flou** → `Blob` envoyé sans `type: 'image/svg+xml'`.
- **Liens sociaux cassés** → URL complète au lieu de l'identifiant.
- **`413`** → corps > 100 ko (`express.json()`), en pratique trop d'icônes SVG.
- **`data-fair error (403)` au PATCH** → la propagation du site de publication se fait avec la session de l'utilisateur, qui n'a pas les droits sur les paramètres data-fair du propriétaire.
- **Brouillon qui redemande la connexion** → l'hôte `<id>.draft` a sa propre session ; se connecter sur cet hôte.

## Références

- `references/config.md` — catalogue des sections de `config` : champs, valeurs, défauts effectifs au rendu, les deux formes de pied de page, config initiale.
- `references/recipes.md` — scripts : lire-modifier-publier, thème en deux passes, upload d'image de portail, création des pages standard, détection de version, recette.
- `portals-pages` — contenu des pages (accueil, pages libres, blocs, pages standard).
- `data-fair-browse` — session NHI, outils WebMCP, vérification d'un rendu.
