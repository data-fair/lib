import { createApp } from 'vue'
// global.scss REMPLACE 'vuetify/styles' — jamais les deux.
// Il compile Vuetify avec $body-font-family: var(--d-body-font-family), variable
// posée par _theme.css : c'est ce qui applique la police du site à la visualisation.
// Nécessite sass-embedded en devDependencies.
import '@data-fair/lib-vuetify/style/global.scss'
import { createVuetify } from 'vuetify'
import { createI18n } from 'vue-i18n'
import { createSession } from '@data-fair/lib-vue/session.js'
import { vuetifySessionOptions } from '@data-fair/lib-vuetify'
import { createUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import { createLocaleDayjs } from '@data-fair/lib-vue/locale-dayjs.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { createConfig } from './composables/config'
import App from './App.vue'
import { aliases, mdi } from 'vuetify/iconsets/mdi-svg'

// Expose reactiveSearchParams au shim v-iframe-compat injecté par DataFair
// pour éviter le rechargement complet quand l'app est elle-même embedded
// dans un d-frame parent (portail, dashboard, autre app via <d-frame>).
// Sans ce bloc, le shim tombe dans son fallback window.location.href = src
// à chaque updateSrc → rechargement → clignotement.
// À mettre au niveau module, AVANT createApp().
;(window as any).vIframeOptions = { reactiveParams: reactiveSearchParams }

async function init () {
  // vuetifySessionOptions lève sans session.site.value : le <script> _public.js
  // d'index.html pose window.__PUBLIC_SITE_INFO, lu sans fetch ; siteInfo déclenche
  // refreshSiteInfo, déprécié, et ne reste qu'en repli si le script n'a pas été servi
  const session = await createSession({
    directoryUrl: '/simple-directory',
    siteInfo: !window.__PUBLIC_SITE_INFO
  })

  // createI18n APRÈS la session, avec la locale définitive.
  // - useI18n() ne s'exécute que dans un setup(), donc aucune raison de créer
  //   l'instance au niveau module ; il suffit de app.use(i18n) avant mount().
  // - legacy: false → vue-i18n 11 démarre sinon en mode legacy, déprécié et
  //   retiré en v12.
  // - fallbackLocale: 'en' → le défaut est la valeur de locale, donc aucun repli.
  //   simple-directory sert fr/en/es/pt/it/de, les blocs <i18n> de lib-vuetify
  //   n'ont que fr et en : sans repli, une session de affiche les clés brutes.
  // - ne JAMAIS réassigner i18n.global.locale.value : en legacy c'est une string
  //   (TypeError), et c'est inutile car un changement de langue recharge la page.
  // - numberFormats : uniquement les pourcentages. Intl groupe déjà par trois et
  //   prend la marque décimale de la locale, mais style 'percent' seul arrondit à
  //   l'unité (46 % pour 0.4566). Les options sont indépendantes de la locale, donc
  //   le même jeu est enregistré pour toutes les langues. Un nombre simple ne
  //   demande rien : n(valeur) suffit.
  const percentFormats = {
    percent: { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 },
    percentPrecise: { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 }
  } as const
  const i18n = createI18n({
    legacy: false,
    locale: session.lang.value,
    fallbackLocale: 'en',
    numberFormats: { fr: percentFormats, en: percentFormats }
  })

  const vuetify = createVuetify({
    ...vuetifySessionOptions(session),
    icons: { defaultSet: 'mdi', aliases, sets: { mdi } }
  })

  const app = createApp(App)
  app.use(vuetify)
    .use(session)
    .use(i18n)
    .use(createLocaleDayjs(session.lang.value))
    .use(createUiNotif())
    .use(createConfig())
  app.mount('#app')
}

init()
