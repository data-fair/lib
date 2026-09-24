import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createVuetify } from 'vuetify'

async function setupTheme () {
  // vuetifySessionOptions lève 'requires fetching site info in session util' si
  // session.site.value est nul. Le <script> _public.js d'index.html pose
  // window.__PUBLIC_SITE_INFO, lu sans fetch ; siteInfo déclenche refreshSiteInfo,
  // déprécié, et ne reste qu'en repli si le script n'a pas été servi.
  const session = await createSession({
    directoryUrl: '/simple-directory',
    siteInfo: !window.__PUBLIC_SITE_INFO
  })
  const vuetify = createVuetify(vuetifySessionOptions(session))
  return vuetify
}

// vuetifySessionOptions(session) fournit :
// - le thème résolu par resolveTheme parmi QUATRE valeurs : default, dark, hc, hc-dark
//   (réglages du site + cookie theme + prefers-color-scheme + prefers-contrast)
// - les couleurs du site
// - la locale

// Dans index.html, fixer l'ordre des couches puis inclure le CSS du thème.
// Vuetify 4 livre son CSS dans des cascade layers : la priorité y est donnée par
// l'ordre de PREMIÈRE DÉCLARATION des noms de couches, pas par l'ordre des règles.
// Sans cette ligne, l'ordre dépend du chunk CSS chargé en premier — instable entre
// dev et build (code splitting). La déclarer en tête épingle l'ordre et ouvre
// vuetify-overrides / vuetify-utilities pour vos propres styles.
// _theme.css est volontairement hors couche : du CSS non layered l'emporte sur
// tout CSS layered, quel que soit l'ordre.
// <style>@layer vuetify-core, vuetify-components, vuetify-overrides, vuetify-utilities, vuetify-final;</style>
// <link href="/simple-directory/api/sites/_theme.css" rel="stylesheet">
//
// _theme.css n'est pas redondant avec vuetifySessionOptions : il porte les
// variantes de couleurs texte à contraste corrigé (.text-primary, .text-secondary,
// ... en !important), les couleurs de a.simple-link selon le thème et le fond,
// les @font-face du site et une règle @media print.
// → pour du texte, utiliser text-primary plutôt que primary.
//
// Chemin absolu et sans hash : le proxy data-fair ne substitue que %APPLICATION%,
// les placeholders {SITE_PATH} / {THEME_CSS_HASH} des services sont inaccessibles ici.
// Sans hash, le CSS est revalidé toutes les 60 s au lieu d'être immuable.

// Et dans main.ts, importer les styles globaux de la lib À LA PLACE de
// 'vuetify/styles' — jamais les deux, sinon le CSS Vuetify est chargé en double
// et la police du site n'est pas appliquée (rendu en Roboto) :
// import '@data-fair/lib-vuetify/style/global.scss'
// (nécessite sass-embedded en devDependencies)
//
// Et dans vite.config, le configFile doit être celui de la lib, pas un fichier local :
// import { settingsPath } from '@data-fair/lib-vuetify/vite.js'
// Vuetify({ autoImport: true, styles: { configFile: settingsPath } })
// Vérification : le CSS buildé doit contenir font-family:var(--d-body-font-family)
// et non Roboto.

// Le global lu ci-dessus vient de simple-directory, ce que fait chaque service, via
// cette ligne d'index.html :
// <script src="/simple-directory/api/sites/_public.js"></script>
// À déclarer dans types.d.ts plutôt qu'à lire en (window as any) :
// import type { FullSiteInfo } from '@data-fair/lib-vue/session.js'
// declare global { interface Window { __PUBLIC_SITE_INFO?: FullSiteInfo } }
