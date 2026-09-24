import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

// ─────────────────────────────────────────────────────────────────────────────
// Pattern recommandé pour les apps DataFair (client-side, pas de SSR)
// ─────────────────────────────────────────────────────────────────────────────

// Importez directement le singleton global — aucun plugin à installer dans main.ts.
// L'objet est réactif : modifier une propriété met à jour l'URL,
// et changer l'URL (back/forward) met à jour l'objet.

reactiveSearchParams.metric = 'avg'
reactiveSearchParams['sort-by'] = 'value'
delete reactiveSearchParams['sort-field']

// Dans un composant : accès direct sans setup
const metric = reactiveSearchParams.metric

// ─────────────────────────────────────────────────────────────────────────────
// Variante : helpers type-safe (nécessitent le plugin)
// ─────────────────────────────────────────────────────────────────────────────

// Si vous préférez des helpers computed get/set (useStringSearchParam, etc.),
// vous DEVEZ installer le plugin dans main.ts :
//
//   import { createReactiveSearchParams } from '@data-fair/lib-vue/reactive-search-params.js'
//   app.use(createReactiveSearchParams())
//
// Puis dans un composant :
//
//   import { useStringSearchParam, useBooleanSearchParam, useNumberSearchParam } from '@data-fair/lib-vue/reactive-search-params.js'
//   const searchQuery = useStringSearchParam('q')
//   const isStacked = useBooleanSearchParam('stacked')
//   const page = useNumberSearchParam('page')

// ─────────────────────────────────────────────────────────────────────────────
// Quel pattern choisir ?
// ─────────────────────────────────────────────────────────────────────────────
//
// • Global (recommandé) : plus simple, pas de plugin, suffisant pour 90% des cas.
// • Helpers + plugin    : utile si vous voulez des computed avec valeur par
//   défaut, ou si vous partagez le code avec une app SSR (Nuxt).
