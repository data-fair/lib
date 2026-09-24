import { useAsyncAction } from '@data-fair/lib-vue/async-action.js'

const { execute: submitForm, loading, error } = useAsyncAction(
  async (data: FormData) => {
    await ofetch('/api/submit', { method: 'POST', body: data })
  },
  {
    success: { msg: 'Sauvegarde réussie', type: 'success' },
    error: 'Erreur lors de la sauvegarde'
  }
)

// Dans le template
// <v-btn @click="submitForm(formData)" :loading="loading">{{ error || 'Envoyer' }}</v-btn>
