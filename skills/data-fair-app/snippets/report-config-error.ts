import { watch } from 'vue'
import { ofetch } from 'ofetch'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'
import { useConfig } from './config'

// ─────────────────────────────────────────────────────────────────────────────
// Remonter une erreur de configuration à DataFair (POST /error)
// ─────────────────────────────────────────────────────────────────────────────
//
// Quand l'app détecte une erreur de config (dataset manquant, champ invalide,
// ...), elle peut la signaler à DataFair : en mode draft, le message s'affiche
// dans un v-alert au-dessus du formulaire de configuration du backoffice.
//
// Contrat API (api/src/applications/router.ts) :
//   POST {window.APPLICATION.href}/error   body JSON { message: string }  →  204
//
// Limites à connaître :
// - La route exige la permission `writeConfig` → 403 pour un visiteur anonyme.
//   N'appeler qu'en mode draft : le backoffice envoie les cookies du
//   propriétaire, et le referer contenant `draft=true` route le message vers
//   errorMessageDraft (websocket applications/{id}/draft-error) au lieu de
//   marquer l'application en erreur.
// - Hors draft, un POST réussi passerait l'application en status='error' :
//   à réserver à une décision explicite, jamais à un watcher automatique.
// - Toujours catcher l'échec : une erreur réseau ou un 403 ici ne doit pas
//   casser l'app.

export function useReportConfigError () {
  const { error } = useConfig()

  if (reactiveSearchParams.draft !== 'true') return

  watch(error, (message) => {
    if (!message) return
    ofetch(window.APPLICATION.href + '/error', {
      method: 'POST',
      body: { message }
    }).catch(() => {
      // silencieux : 403 (droits insuffisants) ou erreur réseau — ne jamais propager
    })
  }, { immediate: true })
}
