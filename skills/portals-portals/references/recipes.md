# Scripts — configuration d'un portail

Tous les appels au gestionnaire se font en **same-origin depuis l'hôte du gestionnaire** (ex. `https://koumoul.com/data-fair/...` ou `/portals-manager`), session en cookies, via `browser_evaluate`. Les appels `/portal/api/...` se font sur **l'hôte du portail**.

## Lire → modifier → publier

```js
async () => {
  const api = '/portals-manager/api'
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const id = '<portalId>'
  const portal = await (await fetch(`${api}/portals/${id}`, { headers })).json()
  const cfg = structuredClone(portal.draftConfig)   // toujours la config COMPLÈTE

  // modifications ciblées
  cfg.navBar = { ...cfg.navBar, fluid: false, tabsStyle: ['boldTitle'] }
  cfg.allowRobots = true

  let r = await fetch(`${api}/portals/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ draftConfig: cfg }) })
  if (!r.ok) return { step: 'patch', status: r.status, error: (await r.text()).slice(0, 1500) }
  r = await fetch(`${api}/portals/${id}/draft`, { method: 'POST', headers })
  return { publish: r.status }   // 204
}
```

Pour isoler une erreur de validation : repartir de `portal.config` (valide par construction) et n'y greffer qu'une section modifiée à la fois.

## Thème : couleurs assistées puis retouche manuelle (deux PATCH)

```js
async () => {
  const api = '/portals-manager/api', id = '<portalId>'
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const patch = async cfg => {
    const r = await fetch(`${api}/portals/${id}`, { method: 'PATCH', headers, body: JSON.stringify({ draftConfig: cfg }) })
    if (!r.ok) throw new Error(r.status + ' ' + await r.text())
    return (await r.json()).draftConfig
  }
  let cfg = (await (await fetch(`${api}/portals/${id}`, { headers })).json()).draftConfig

  // 1. le serveur calcule les quatre palettes (et remet background/surface/info… aux valeurs par défaut)
  cfg.theme = { ...cfg.theme, assistedMode: true, assistedModeColors: { primary: '#003B80', secondary: '#FFC300', accent: '#E4032E' } }
  cfg = await patch(cfg)

  // 2. retouches exactes : sortir du mode assisté, sinon elles seraient écrasées
  cfg.theme.assistedMode = false
  cfg.theme.colors.background = '#F5F7FA'
  cfg = await patch(cfg)

  await fetch(`${api}/portals/${id}/draft`, { method: 'POST', headers })
  return { colors: cfg.theme.colors, dark: cfg.theme.dark }
}
```

## Uploader une image de portail (SVG compris)

La session doit être sur le compte **et le département** propriétaires du portail.

```js
async () => {
  // exemple : un SVG récupéré en same-origin ; pour un fichier local, passer par <input type=file> + browser_file_upload
  const svgText = await (await fetch('<url same-origin du svg>')).text()
  const file = new File([svgText], 'logo.svg', { type: 'image/svg+xml' })   // type MIME obligatoire, sinon rastérisé en webp
  const fd = new FormData()
  fd.append('body', JSON.stringify({ resource: { type: 'portal', _id: '<portalId>' } }))
  fd.append('image', file, file.name)
  const r = await fetch('/portals-manager/api/images', { method: 'POST', body: fd })
  if (!r.ok) return { status: r.status, error: await r.text() }   // 404 linked portal not found = mauvais compte actif
  const { _id, name, mimeType, mobileAlt } = await r.json()
  return { _id, name, mimeType, ...(mobileAlt ? { mobileAlt } : {}) }   // à poser dans config.logo, favicon, etc.
}
```

## Créer les pages standard d'un portail créé par l'API

```js
async () => {
  const api = '/portals-manager/api'
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  const portalId = '<portalId>'
  const portal = await (await fetch(`${api}/portals/${portalId}`, { headers })).json()
  const owner = portal.owner   // même type/id que le portail, sinon le portail ne sert pas la page
  const pages = [
    ['home', 'Accueil'], ['datasets', 'Données'], ['applications', 'Visualisations'],
    ['contact', 'Contact'], ['legal-notice', 'Mentions légales'], ['privacy-policy', 'Politique de confidentialité'], ['accessibility', 'Accessibilité']
  ]
  const out = []
  for (const [type, title] of pages) {
    let r = await fetch(`${api}/pages`, { method: 'POST', headers,
      body: JSON.stringify({ type, owner, title: `${title} - ${portal.config.title}`, config: { title, elements: [] } }) })
    const page = await r.json()
    if (!r.ok) { out.push({ type, step: 'create', status: r.status, page }); continue }
    // rattacher par PATCH : déclenche le remplacement d'une éventuelle page du même type
    r = await fetch(`${api}/pages/${page._id}`, { method: 'PATCH', headers, body: JSON.stringify({ portals: [portalId] }) })
    out.push({ type, id: page._id, attach: r.status })
  }
  return out
}
```

Les catalogues reçoivent leur élément par défaut ; `home`, `contact` et les pages légales sont vides : leur contenu relève de `portals-pages`. Ajouter ensuite les entrées du menu (`{ type: 'standard', subtype: 'datasets', title: 'Données' }`…) et les liens du pied de page.

## Détecter la forme du pied de page attendue

```js
async () => {
  const api = '/portals-manager/api'
  const info = await fetch(`${api}/admin/info`)   // superadmin en mode admin seulement
  const { results } = await (await fetch(`${api}/portals?size=5&select=_id,config.footer,legacyFooter`)).json()
  return {
    build: info.ok ? await info.json() : `admin/info ${info.status}`,
    footers: results.map(p => ({ _id: p._id, rows: !!p.config?.footer?.rows, legacy: !!p.config?.footer?.links, migrated: !!p.legacyFooter }))
  }
}
```

`rows: true` → forme en lignes (≥ 2.34) ; `legacy: true` → forme `links/importantLinks/extraLogos` (≤ 2.33.1).

## Recette sur l'hôte du portail

```js
async () => {
  const j = async u => { const r = await fetch(u, { headers: { Accept: 'application/json' } }); return r.ok ? r.json() : r.status }
  const { config, draft } = await j('/portal/api/portal')
  const hashes = await j('/simple-directory/api/sites/_hashes')
  const html = await (await fetch('/', { cache: 'no-store' })).text()
  const servedHash = html.match(/sites\/([^/]+)\/_theme\.css/)?.[1]
  return {
    draft,
    title: config.title,
    assisted: config.theme.assistedMode,
    primary: config.theme.colors.primary, textSecondary: config.theme.colors['text-secondary'],
    footerShape: config.footer.rows ? 'rows' : 'legacy',
    allowRobots: !!config.allowRobots,
    standardPages: await j('/portal/api/pages/standard-exists'),
    themeCssUpToDate: servedHash === hashes.themeCss,   // false = cache du portail (≤ 1 min)
    robots: (await (await fetch('/robots.txt')).text()).split('\n').slice(0, 2)
  }
}
```

Puis le rendu en contexte anonyme (checklist de `data-fair-browse` §4) : thèmes `default` et `dark`, desktop et mobile, `/datasets`, une fiche de jeu, une fiche de visualisation, entête et pied de page.
