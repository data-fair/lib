---
name: data-fair-browse
description: >
  Use when an agent drives a running data-fair platform through a browser
  (Playwright MCP) under a non-human identity provided by
  `@data-fair/nhi-proxy`: how to pick the right level of interaction —
  in-page WebMCP tools first (`navigator.modelContext.listTools()` /
  `callTool()`), then direct HTTP API calls, and raw Playwright clicks last —
  which WebMCP tools each surface exposes (portail public, back-office
  data-fair, portals-manager, simple-directory), what the NHI proxy session
  implies (cookies on the target host only, identity fixed by the profile,
  401/403 = missing role), and how to verify a real rendering. Triggers:
  "outils WebMCP d'une page", `navigator.modelContext`, "modelContext",
  "outils d'agent de la page", "identité NHI", "nhi-proxy", "piloter la
  plateforme au navigateur", "remplir le formulaire via l'agent", "vérifier
  le rendu". This is about *using* a deployed platform, not developing its
  services.
---

# Piloter une plateforme data-fair au navigateur

Pour un agent qui **utilise** une plateforme data-fair déployée via un navigateur (MCP Playwright) sous une **identité non humaine** (NHI). Le fil conducteur : la page connaît déjà ses propres opérations, il faut les lui demander avant de simuler un humain.

Cet skill ne couvre **pas** le développement des services (→ `data-fair-session`, `data-fair-ws`, `vjsf`), ni le contenu éditorial des pages de portail (→ `portals-pages`, qui s'appuie sur celui-ci).

## 1. L'identité NHI

Le navigateur est lancé derrière `@data-fair/nhi-proxy`, qui échange une clé NHI contre des sessions simple-directory courtes et injecte les cookies. Le **câblage** (profils, `--proxy`, pin SPKI, CA) est documenté dans `nhi-proxy/docs/usage.md` — ne pas le redécouvrir. Ce qu'il faut savoir côté agent :

- les cookies (`id_token`, `id_token_sign`, `id_token_org`, `id_token_dep`…) sont injectés sur **l'hôte cible uniquement** ; tout autre hôte est tunnelé tel quel. Un sous-domaine de portail est donc vu en **visiteur anonyme** — c'est le bon contexte pour vérifier un rendu public, et la raison pour laquelle un appel d'API lancé depuis cette page part sans session ;
- l'identité (organisation, département, rôle) est **figée par le profil du proxy** ; les cookies injectés écrasent ceux posés par `document.cookie`, donc **aucune bascule de contexte par cookie**. Pour créer une ressource dans un autre compte, poser `owner` (avec `department`) **à la création** ;
- la session est **renouvelée automatiquement**. Un `401`/`403` persistant signale un **rôle manquant sur l'identité**, pas une session expirée : demander le rôle à un admin plutôt que réessayer ;
- certaines opérations d'administration exigent en plus le **mode admin** du compte (`user.adminMode`) ;
- sonde valable partout : `GET /simple-directory/api/auth/me` → `200` + le compte. `/auth/me` sans préfixe répond `404` même connecté : ne pas s'en servir comme sonde ;
- **cible en local** (`http://localhost:5600`) : curl et Chromium contournent le proxy pour localhost, la requête part sans cookies et la réponse anonyme ressemble à un bug. Voir les deux contournements dans `nhi-proxy/docs/usage.md`.

## 2. L'échelle de recours

Trois barreaux, du plus fiable au plus coûteux. **Ne pas descendre d'un barreau sans avoir constaté que celui du dessus ne couvre pas le besoin.**

### ① Les outils WebMCP de la page

Les interfaces data-fair enregistrent leurs propres opérations sur `navigator.modelContext` (standard WebMCP). Elles partagent l'état de la page : un `setFieldValue` met à jour le formulaire affiché, passe par la validation du schéma et renvoie les erreurs — là où un `browser_type` se contente d'écrire du texte dans un input.

```js
// dans browser_evaluate
navigator.modelContext.listTools().map(t => t.name)
await navigator.modelContext.callTool({ name: 'list_datasets', arguments: { size: 10 } })
```

**Toujours commencer par lister.** Le jeu d'outils dépend de la route courante (§3) et l'enregistrement est **asynchrone** : naviguer, attendre que l'outil visé apparaisse, puis appeler. Snippets prêts à coller dans `references/webmcp.md`.

### ② L'appel d'API direct

Quand aucun outil ne couvre l'opération, ou pour un travail en volume / déterministe (créer 30 pages, patcher un schéma, lire un état exact) :

- **`fetch` same-origin depuis la page** (`browser_evaluate`) : les cookies NHI partent automatiquement. C'est la voie normale quand on est déjà dans le navigateur ;
- **`curl --proxy` depuis le shell** : plus court pour une lecture ponctuelle, indépendant de l'état de la page.

Dans les deux cas l'authentification vient de la session injectée par le proxy — pas d'en-tête à poser. Certaines API n'acceptent d'ailleurs **que** la session : celle du gestionnaire de portails refuse les clés d'API (`401`).

**Piège numéro un** : l'origine. Une API n'existe que sur l'hôte qui la sert (`/portals-manager/api` sur l'hôte du gestionnaire, jamais sur le sous-domaine du portail). Après avoir navigué ailleurs pour vérifier un rendu, un `fetch` relatif part sur la mauvaise origine et renvoie le HTML de la SPA → `Unexpected end of JSON input`. Revenir sur l'hôte de l'API, ou passer une URL absolue avec `curl`.

### ③ Playwright brut

Clics, saisies, captures. Réservé à trois cas :

- **vérifier un rendu réel** — c'est toujours le dernier mot, quel que soit le barreau utilisé pour produire le résultat (§4) ;
- **rejouer un cas fonctionnel complet** tel qu'un utilisateur le vit (parcours, permissions, messages d'erreur d'interface) ;
- **une fonctionnalité sans outil et sans API** (réglage purement client, interaction de composant).

## 3. Carte des surfaces

Ce qui existe où. Les noms ci-dessous sont ceux réellement enregistrés ; la liste exhaustive par page est dans `references/webmcp.md`.

| Surface | Outils WebMCP |
| --- | --- |
| **Portail public** (`portals/portal`) | Toujours actifs, **même si le chat de l'agent est désactivé** (`agentChat.active: false`) : `list_datasets`, `describe_dataset`, recherche/agrégation de données, `navigate`, `list_pages`, `get_current_location`, `pageFilters_get`/`pageFilters_set`, `list_applications`/`list_events`/`list_news`/`list_reuses`, `get_user_geolocation`. |
| **Back-office data-fair** (`/data-fair`) | Un socle posé par le layout (navigation, jeux de données, données, applications, connecteurs, géo) **plus** des outils propres à la route : métadonnées, schéma, annotation sémantique, libellés de colonnes, expressions, configuration de propriété, création de jeu de données ou d'application, guidage de page. **Le jeu change à chaque navigation.** |
| **Gestionnaire de portails** (`/portals-manager`) | Les formulaires VJSF exposent leur état : `pageConfig_*` sur l'édition d'une page, `portalConfig_*` sur la configuration d'un portail (§5). |
| **Simple Directory** | Aucun outil WebMCP. Passer au barreau ②. |
| **Applications embarquées** (`<d-frame>`) | Les outils d'une iframe ne sont **pas** dans le registre de la frame du haut (§5). |

## 4. Vérifier

Une réponse `200` n'est pas une vérification. Pour tout résultat visible par un utilisateur, finir par le barreau ③ :

1. ouvrir la page avec un paramètre anti-cache (`?v=N`) ;
2. console sans erreur (hors `favicon.ico`) ;
3. images chargées (`naturalWidth > 0`) — un `404` trahit une référence pointant vers une autre instance ;
4. intégration d'application : un `<d-frame>` avec une iframe dans son **shadow root**, et le contenu réellement rendu dedans ;
5. **contexte anonyme** (`browser.newContext()`, ou simplement un hôte que le proxy ne touche pas) : ce que voit un visiteur, pas l'identité NHI ;
6. capture en **desktop (1440 px) et en mobile** — les tailles de titre et les grilles ne se jugent pas autrement.

## 5. Pièges

- **Outil absent juste après la navigation** → l'enregistrement est asynchrone (imports dynamiques). Attendre son apparition dans `listTools()` au lieu de conclure qu'il n'existe pas.
- **`subagent_*` ne rend pas un résultat** → ces outils renvoient un JSON `{ prompt, tools, model }` : une consigne et la liste des outils à employer, destinée à un sous-agent. C'est à l'agent appelant de faire le travail avec les outils cités. Ne pas attendre une réponse métier.
- **Chemins des formulaires VJSF** → `setFieldValue` prend un chemin dans l'état du formulaire, qui inclut les conteneurs de mise en page (`/$comp-1/title`, pas `/title`). Les lire dans `getData`/`describeState` ; commencer par `<prefix>fillFormSkill`, qui renvoie le mode d'emploi du formulaire courant.
- **Outils d'une iframe invisibles** → chaque frame tient son propre registre (un serveur MCP par frame sur un `BroadcastChannel`) ; seul le chat de la plateforme les agrège. Évaluer dans la frame propriétaire.
- **`Tool already registered`** → le registre est global à la page et les outils sont libérés au démontage du composant. Recharger la page plutôt que d'insister.
- **`browser_type` / `browser_fill_form` concatènent** avec le contenu existant. Vider le champ ou recharger le formulaire avant de le re-remplir — ou utiliser l'outil WebMCP, qui remplace la valeur.
- **Rôle modifié mais toujours refusé** → le JWT en cookie est périmé ; recharger une page de l'hôte pour déclencher le keepalive.

## Références

- `references/webmcp.md` — snippets (attente, listing, appel, appel dans une iframe, `fetch` same-origin, `curl` via proxy), inventaire des outils par surface, outils des formulaires VJSF.
- `nhi-proxy/docs/usage.md` — câblage du proxy (profils, Playwright MCP, curl, pièges localhost).
- `portals-pages` — contenu des pages de portail, qui applique cette échelle.
