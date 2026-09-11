# API du gestionnaire — workflow et payloads

Toutes les routes ci-dessous sont relatives à l'API du gestionnaire : `https://<hôte>/portals-manager/api`.
Elles s'appellent en **same-origin** depuis une page de `<hôte>` (session en cookies), par exemple via `browser_evaluate` du MCP Playwright. Aucun en-tête d'authentification à gérer.

## Endpoints

| Méthode | Route | Rôle requis | Usage |
| --- | --- | --- | --- |
| `GET` | `/portals?size=100&select=_id,config.title,owner,ingress.url` | admin du compte courant | lister les portails accessibles |
| `GET` | `/portals/:id` | admin ou contrib sur `portal.owner` | lire la config complète (dont `allowedFrameSources`) |
| `GET` | `/portals/:id/public` | **public** | `{_id, title, owner, url}` — identifier un portail |
| `PATCH` | `/portals/:id` | admin sur `portal.owner` | modifier la config (ex. `allowedFrameSources`) |
| `POST` | `/portals/:id/draft` | admin sur `portal.owner` | valider le brouillon de portail |
| `GET` | `/pages?size=100&select=_id,title,type,owner,portals` | admin du compte courant | lister les pages accessibles |
| `GET` | `/pages/:id` | admin ou contrib sur `page.owner` | lire `config` + `draftConfig` |
| `POST` | `/pages` | admin sur `owner` | créer une page |
| `PATCH` | `/pages/:id` | admin ou contrib sur `page.owner` | modifier le brouillon, publier/dépublier, déplacer |
| `POST` | `/pages/:id/draft` | admin ou contrib sur `page.owner` | publier le brouillon (`204`) |
| `DELETE` | `/pages/:id/draft` | admin ou contrib sur `page.owner` | annuler le brouillon |

L'API DataFair de l'instance est sur `https://<hôte>/data-fair/api/v1/...`.

## Découvrir le contexte et les droits

Décoder le JWT de session (cookies `id_token`, `id_token_org`, `id_token_dep`) :

```js
() => {
  const cookies = Object.fromEntries(document.cookie.split('; ').map(c => {
    const i = c.indexOf('='); return [c.slice(0, i), c.slice(i + 1)]
  }))
  const payload = JSON.parse(atob(cookies.id_token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
  return {
    org: cookies.id_token_org,
    department: cookies.id_token_dep,
    organizations: payload.organizations.map(o => ({ id: o.id, name: o.name, department: o.department, role: o.role }))
  }
}
```

Après une attribution de rôle côté Simple Directory, **recharger une page de l'hôte** avant de refaire ce test : le cookie est rafraîchi par keepalive.

Sonder un portail (403 = existe mais pas de rôle, 404 = id inconnu) :

```js
async () => {
  const r = await fetch('/portals-manager/api/portals/<id>', { headers: { Accept: 'application/json' } })
  return { status: r.status, body: (await r.text()).slice(0, 300) }
}
```

## Créer une page : script complet

À exécuter depuis l'origine du gestionnaire (`https://<hôte>/data-fair/pages` convient). Adapter `owner`, `portals`, le titre et les `elements`.

```js
async () => {
  const api = '/portals-manager/api'
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const pageTitle = 'Publier et valoriser des données de transport GTFS'
  const owner = {
    type: 'organization', id: '<orgId>', name: 'Koumoul',
    department: 'test', departmentName: 'Test et développement'
  }

  // 1. créer l'entrée (owner.name est obligatoire, un 400 avec corps vide sinon)
  let r = await fetch(api + '/pages', {
    method: 'POST', headers,
    body: JSON.stringify({
      type: 'generic', owner, title: pageTitle,
      config: { title: pageTitle, elements: [] }
    })
  })
  const created = await r.json()
  if (!r.ok) return { step: 'create', status: r.status, pageId: undefined, error: created }
  const pageId = created._id

  // 2. remplir le brouillon (et rattacher au portail si les droits sont acquis)
  const config = {
    title: pageTitle,
    description: 'Description SEO de la page…',
    genericMetadata: { slug: 'donnees-transport-gtfs' },
    elements: [ /* blocs, voir references/elements.md */ ]
  }
  r = await fetch(api + '/pages/' + pageId, {
    method: 'PATCH', headers,
    body: JSON.stringify({ draftConfig: config, portals: ['<portalId>'] })
  })
  const patchText = await r.text()
  if (!r.ok) return { step: 'patch', status: r.status, pageId, error: patchText.slice(0, 800) }

  // 3. publier
  r = await fetch(api + '/pages/' + pageId + '/draft', { method: 'POST', headers })
  return { ok: r.ok, pageId, publishStatus: r.status, error: r.ok ? undefined : (await r.text()).slice(0, 500), slug: config.genericMetadata.slug }
}
```

Notes :

- Lire le corps d'erreur avec `res.text()` : la validation serveur peut répondre `400` avec un corps vide ou non JSON.
- `GET /pages/:id` renvoie le brouillon **déjà calculé** : `_html` pour `text`/`alert`, `_toc` pour les ancres, `anchor._slug`. On peut les renvoyer tels quels dans le `PATCH`, le serveur les recalcule — inutile de les nettoyer.
- `POST /pages/:id/draft` répond `204` sans corps en cas de succès.
- Pour modifier un bloc existant sans tout réécrire : `GET /pages/:id`, modifier `page.draftConfig`, `PATCH { draftConfig }`, `POST /pages/:id/draft`.

## Créer une page au nom d'un compte utilisateur

Un utilisateur est toujours admin de son propre compte : `owner: { type: 'user', id: '<userId>', name: '<Nom>' }` permet de créer une page sans rôle d'organisation. En revanche une page personnelle ne peut pas demander sa publication (`requestedPortals` est réservé aux pages owned par une organisation) — publier directement sur un portail exige le rôle admin sur le propriétaire du portail.

## Déplacer une page entre portails

```js
async () => {
  const id = '<pageId>'
  const get = await fetch('/portals-manager/api/pages/' + id, { headers: { Accept: 'application/json' } })
  const page = await get.json()
  const portals = ['<nouveauPortalId>']
  const patch = await fetch('/portals-manager/api/pages/' + id, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ portals })
  })
  if (!patch.ok) return { step: 'patch', status: patch.status, error: (await patch.text()).slice(0, 500) }
  const pub = await fetch('/portals-manager/api/pages/' + id + '/draft', { method: 'POST', headers: { Accept: 'application/json' } })
  return { patchStatus: patch.status, publishStatus: pub.status, pageUrl: 'https://<portail>/pages/' + page.config.genericMetadata.slug }
}
```

Le déplacement n'altère pas le propriétaire de la page : une page owned par le département `test` peut vivre sur un portail du département `marketing`, à condition d'avoir le rôle admin sur ce portail (ou une validation par un admin après demande).

## Vérifier le rendu

Une fois la page publiée, dans le navigateur :

```js
// diagramme Mermaid
() => {
  const el = document.querySelector('[role="img"][aria-label*="Schéma"]')
  const svg = el?.querySelector('svg')
  if (!svg) return { mermaid: false }
  const r = svg.getBoundingClientRect()
  const scale = r.width / svg.viewBox.baseVal.width
  return {
    mermaid: true,
    error: !!el.querySelector('.error-icon'),
    scale: +scale.toFixed(2),
    effectiveFont: Math.round(16 * scale) // viser >= 11 px
  }
}
```

```js
// intégration : le iframe vit dans le shadow root du <d-frame>
() => {
  const frame = document.querySelector('d-frame')
  const iframe = frame?.shadowRoot?.querySelector('iframe')
  return { src: iframe?.getAttribute('src'), title: frame?.getAttribute('iframe-title') }
}
```

Vérification de bout en bout en visiteur anonyme (MCP Playwright) :

```js
async (page) => {
  const ctx = await page.context().browser().newContext()
  const p = await ctx.newPage()
  const errors = []
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text().slice(0, 150)) })
  const resp = await p.goto('https://<portail>/pages/<slug>', { waitUntil: 'networkidle', timeout: 60000 })
  await p.waitForTimeout(6000)
  const mermaid = await p.evaluate(() => !!document.querySelector('[role="img"] svg'))
  let vehicles = null
  const appFrame = p.frames().find(f => f.url().includes('<slug-app>'))
  if (appFrame) vehicles = await appFrame.evaluate(() => document.body.innerText.match(/\d+\s*véhicules?/i)?.[0] || null).catch(() => null)
  await ctx.close()
  return { status: resp?.status(), mermaid, vehicles, errors: errors.filter(e => !e.includes('favicon')) }
}
```

Les canvas WebGL ne sont pas rendus dans les captures pleine page : vérifier la carte via le DOM (canvas présent, compteur temps réel) et les requêtes `/tileserver/...` en `200`, pas via une capture d'écran.
