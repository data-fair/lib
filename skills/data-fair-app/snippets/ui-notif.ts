import { createUiNotif, useUiNotif, getErrorMsg, getErrorCode } from '@data-fair/lib-vue/ui-notif.js'

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Plugin createUiNotif  (obligatoire dans main.ts)
// ═══════════════════════════════════════════════════════════════════════════════

// app.use(createUiNotif())

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Composant global <DfUiNotif />  (recommandation par défaut)
// ═══════════════════════════════════════════════════════════════════════════════

// Placer une seule fois dans App.vue (ou le layout racine).
// Ce composant de @data-fair/lib-vuetify gère :
//   - couleur selon le type (error, success, warning, info)
//   - timeout adaptatif (infini pour les erreurs)
//   - z-index : 2600 (au-dessus des overlays classiques)
//   - transmission au parent iframe si embeddé

/*
<template>
  <div>
    <RouterView />
    <DfUiNotif />
  </div>
</template>

<script setup lang="ts">
import DfUiNotif from '@data-fair/lib-vuetify/ui-notif.vue'
</script>
*/

// Props optionnelles :
//   snackbarProps : { tile: true, right: true, bottom: true, timeout: 30000 }

// ═══════════════════════════════════════════════════════════════════════════════
// 3. Envoyer une notification depuis le code
// ═══════════════════════════════════════════════════════════════════════════════

const { sendUiNotif } = useUiNotif()

// Types supportés : 'default' | 'info' | 'success' | 'warning' | 'error'
sendUiNotif({ type: 'success', msg: 'Sauvegarde réussie' })

// Erreur API : getErrorMsg / getErrorCode extraient proprement le message/code
sendUiNotif({
  type: 'error',
  msg: `Échec du chargement (HTTP ${getErrorCode(err)})`,
  error: err
})

// String raccourci :
sendUiNotif('Opération terminée')

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Alerte inline (pas de toast) : <DfUiNotifAlert />
// ═══════════════════════════════════════════════════════════════════════════════

// À utiliser quand l'erreur doit être affichée dans le flux de la page
// plutôt qu'en snackbar global (ex: erreur de validation d'un formulaire).

/*
<template>
  <DfUiNotifAlert
    v-if="notif"
    :notif="notif"
    :alert-props="{ variant: 'outlined', closable: true }"
  />
</template>

<script setup lang="ts">
import { shallowRef } from 'vue'
import DfUiNotifAlert from '@data-fair/lib-vuetify/ui-notif-alert.vue'
import type { UiNotif } from '@data-fair/lib-vue/ui-notif.js'

const notif = shallowRef<UiNotif | null>(null)
notif.value = { type: 'error', msg: 'Champ invalide' }
</script>
*/

// ═══════════════════════════════════════════════════════════════════════════════
// 5. API de useUiNotif — rappel des noms corrects
// ═══════════════════════════════════════════════════════════════════════════════

// ❌ INCORRECT :
// const { notif } = useUiNotif()         // 'notif' n'existe pas
// const { sendNotif } = useUiNotif()     // 'sendNotif' n'existe pas

// ✅ CORRECT :
// const { notification, sendUiNotif } = useUiNotif()
//   - notification  → shallowRef<UiNotif | null>
//   - sendUiNotif   → (partialNotif: PartialUiNotif) => void
