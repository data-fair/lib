// ─────────────────────────────────────────────────────────────────────────────
// ⚠️ DÉPRÉCIÉ — Synchroniser les filtres statiques vers DataFair en mode draft
// ─────────────────────────────────────────────────────────────────────────────

// ❌ Ancien mécanisme (abandonné) : on calculait un `qsFilter` à partir des
// `staticFilters` et on le poussait vers le parent via postMessage, pour que
// l'utilisateur voie le filtre effectif dans le formulaire de config.

// ✅ Nouvelle approche : les `staticFilters` sont la SEULE source de vérité.
// - Le champ de config `qsFilter` est obsolète : à retirer des schémas d'app.
// - Plus de conversion en `qs` : les filtres statiques se transmettent via les
//   params REST suffixés (_in, _nin, _gte, _lte, _starts, _exists, _nexists)
//   produits par `filters2params` (@data-fair/lib-utils/filters).
// - En mode draft, les staticFilters sont directement éditables dans le formulaire
//   (champ de config classique) : aucun push « dérivé » n'est nécessaire.
//
// Seul le paramètre `qs` des requêtes datasets (syntaxe Lucene query_string) reste
// contractuel côté API, réservé aux logiques de filtrage complexes.

import { filters2params } from '@data-fair/lib-utils/filters/index.js'
import { normalizeStaticFilters } from '@/utils/staticFilters'

// Exemple du nouveau flux, sans postMessage :
const params: Record<string, any> = { size: 0, finalizedAt }
const sf = normalizeStaticFilters(config.value?.staticFilters as any)
if (sf.length) Object.assign(params, filters2params(sf as any))
// puis useFetch(() => datasetUrl + '/lines', { query: params })
