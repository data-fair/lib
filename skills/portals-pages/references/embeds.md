# Intégrer une visualisation dans une page

Deux blocs, deux usages. Le choix se fait sur **l'hôte de l'application**, pas sur le type de contenu.

| | Bloc `application` | Bloc `iframe` |
| --- | --- | --- |
| Cible | application DataFair de la **même instance** que le portail | URL externe quelconque |
| Résolution | `/data-fair/api/v1/applications/<id>` puis `/data-fair/app/<slug>?d-frame=true` (relatif au portail) | URL fournie telle quelle |
| CSP | aucun réglage | domaine à autoriser dans `allowedFrameSources` |
| Hauteur | `displayMode` + `ratio`/`maxHeight`/`height` | aucune (déduite par `d-frame`, ratio largeur) |
| Boutons | plein écran, capture, intégration, sources de données | aucun |
| État/params | `syncParams` (cloisonné ou filtres partagés), `staticFilters` (filtres par défaut, couleurs) | non |

## Bloc `application`

```json
{
  "type": "application", "uuid": "…",
  "application": { "id": "<appId>", "title": "<titre>", "slug": "<slug>" },
  "syncParams": "none",
  "displayMode": "fixed-height",
  "height": 600,
  "actionButtons": { "items": ["fullscreen", "datasets"] }
}
```

À faire avant de l'utiliser :

1. vérifier que l'app existe sur l'instance du portail :

   ```bash
   curl -s https://<hôte>/data-fair/api/v1/applications/<appId> | head -c 400
   ```

2. vérifier qu'elle est visible par un visiteur anonyme (`public: true` / `visibility: "public"`), sinon la page cassera pour les visiteurs non connectés ;
3. renseigner `slug` — c'est lui qui construit l'URL `/data-fair/app/<slug>`.

Champs utiles :

- `displayMode: "auto-resize"` (défaut) : la visu prend la hauteur nécessaire (les cartes se comportent comme en ratio) ;
- `displayMode: "aspect-ratio"` + `ratio` (`auto`, `16/9`, `4/3`, `1/1`, `3/2`, `21/9`) + `maxHeight` ;
- `displayMode: "fixed-height"` + `height` (min 150) : utile pour une carte (600 px) ; à éviter pour du responsive strict ;
- `syncParams: "sandboxed"` préfixe les paramètres d'URL par le `uuid` du bloc ; `"shared-filters"` partage les filtres `_c`/`_d` avec les autres blocs de la page.

### Filtres par défaut et couleurs (`staticFilters`)

```json
"staticFilters": [
  { "key": "_c_codeCommune_in", "value": "86194" },
  { "key": "_t_primary", "value": "#1E88E5" }
]
```

- Paires `{ key, value }` ajoutées à l'URL de l'iframe seulement : `d-frame` ne remonte pas dans l'URL de la page un paramètre resté égal à sa valeur initiale. Ce sont des valeurs par défaut invisibles, que le visiteur peut changer si la visu le permet (portals ≥ 2.34.0).
- `key` commence par `_c_` (concept, `_c_<concept>_<opérateur>`), `_d_` (`_d_<jdd>_<colonne>_<opérateur>`) ou `_id_`, ou vaut exactement `_t_primary` / `_t_secondary` ; toute autre clé échoue à la validation. Opérateurs : `eq`, `neq`, `in`, `nin` (valeurs séparées par des virgules), `lt`, `lte`, `gt`, `gte`, `starts`, `exists`, `nexists`, `contains`, `search`.
- **Sélection reçue** : un `_c_`/`_d_` posé sur le champ de sélection que déclare la visu la fait **mettre l'entité en évidence** au lieu de restreindre ses données (une carte garde toutes ses géométries). Convention : skill `data-fair-app`, `references/filters-url-convention.md`. Le marqueur `_s_` est refusé depuis portals 2.37.2 et retiré des pages existantes à la mise à jour.
- **Couleurs** : `_t_primary` / `_t_secondary` (hexadécimal à 6 chiffres, `#` facultatif) remplacent les couleurs du portail dans cette visu seulement. Toute autre valeur est refusée par le schéma, car simple-directory la rejetterait et la visu perdrait son thème. Le portail les recopie en `primary` / `secondary` pour les visus anciennes, qui ne lisent que ces paramètres.
- Un tableau de bord ne relaie les `_t_*` à ses sous-applications (et à leurs captures) qu'à partir d'`app-dashboards` 1.1.1 : avant, le cadre prend les couleurs du bloc, les graphiques gardent celles du portail.
- Versions : les couleurs passent par `_t_*` depuis portals 2.37.2. En 2.37.0 et 2.37.1, c'était un champ `colors { primary, secondary }` du bloc, converti en `_t_*` à la mise à jour : sur une version plus récente, un `colors` écrit par l'API n'a aucun effet.

Sous le capot, le bloc rend un `<d-frame>` dont l'iframe est dans le **shadow root**. Vérification :

```js
() => {
  const frame = document.querySelector('d-frame')
  const iframe = frame?.shadowRoot?.querySelector('iframe')
  return { src: iframe?.getAttribute('src'), title: frame?.getAttribute('iframe-title') }
}
```

## Bloc `iframe`

```json
{ "type": "iframe", "uuid": "…", "title": "Carte temps réel", "url": "https://…", "scroll": false }
```

Le CSP du portail est construit depuis `config.allowedFrameSources` (plugin `portal/server/plugins/csp.ts`, directive `frame-src`) : **vide = aucune iframe externe autorisée**. Pour autoriser un domaine, être admin du portail et publier le retour :

```js
async () => {
  const id = '<portalId>'
  const get = await fetch('/portals-manager/api/portals/' + id, { headers: { Accept: 'application/json' } })
  const portal = await get.json()
  const cfg = portal.draftConfig ?? portal.config
  cfg.allowedFrameSources = [...new Set([...(cfg.allowedFrameSources ?? []), 'https://exemple.com'])]
  const patch = await fetch('/portals-manager/api/portals/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ draftConfig: cfg })
  })
  if (!patch.ok) return { step: 'patch', status: patch.status, error: (await patch.text()).slice(0, 500) }
  const pub = await fetch('/portals-manager/api/portals/' + id + '/draft', { method: 'POST', headers: { Accept: 'application/json' } })
  return { patchStatus: patch.status, publishStatus: pub.status, allowedFrameSources: cfg.allowedFrameSources }
}
```

Le même réglage existe dans le gestionnaire : portail → **Paramètres généraux → Sécurité → Sources d'iframe autorisées**.

## Cas d'une application sur une autre instance

Le bloc `application` ne résout que sur l'instance du portail. Pour une app d'une autre instance DataFair (autre tenant, `demo.koumoul.com` depuis un portail de `koumoul.com`, etc.) : utiliser le bloc `iframe` avec l'`exposedUrl` de l'app et autoriser le domaine dans `allowedFrameSources`.

- URL publique d'une app DataFair : `https://<instance>/data-fair/app/<slug ou id>` (ajouter `?d-frame=true` pour le comportement d-frame complet).
- Si l'app est protégée par un lien de partage (clé d'accès), l'URL porte la clé préfixée : `/data-fair/app/<accessKey>%3A<appId>`. Vérifier le rendu en anonyme avant de publier — détails dans le skill `data-fair-app` (`references/embeds-params.md`).
- Vérifier la portabilité lors d'un **déplacement de page** : une page conçue pour `demo.koumoul.com` (bloc `application` sur une app de cette instance) reste valable si l'instance ne change pas ; en cas de changement d'instance, repasser par un `iframe` ou reconfigurer le bloc.

## Vérifier

1. `<d-frame>` présent, iframe dans son shadow root, `src` attendu.
2. Pour une carte : `canvas` présent dans la frame, compteur temps réel (`N véhicules`) si GTFS-RT, requêtes `/tileserver/...` en `200`.
3. Test en **contexte anonyme** : l'app est publique et le CSP laisse passer.
4. Ne pas se fier à une capture pleine page pour la carte : le canvas WebGL n'y est pas rendu.
