<template>
  <v-container
    class="text-center"
    max-width="800"
  >
    <df-themed-svg
      :source="svgSource"
      class="mx-auto mt-8"
      style="max-width: 400px; width: 100%;"
    />
    <p class="text-title-large font-weight-bold mt-4">
      {{ title }}
    </p>
    <p
      v-if="errorMsg"
      class="text-body-medium text-medium-emphasis mt-2"
    >
      {{ errorMsg }}
    </p>
    <div class="d-flex ga-2 justify-center mt-6">
      <slot
        name="actions"
        :error="error"
        :status-code="statusCode"
        :switch-org="switchOrg"
        :do-switch="doSwitch"
      >
        <v-btn
          v-if="switchOrg"
          color="accent"
          variant="flat"
          @click="doSwitch"
        >
          {{ t('switchAccount') }}
        </v-btn>
        <v-btn
          color="primary"
          variant="flat"
          :to="backTo"
          :prepend-icon="mdiChevronLeft"
        >
          {{ backLabel || t('backToHome') }}
        </v-btn>
      </slot>
    </div>
  </v-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mdiChevronLeft } from '@mdi/js'
import { useSession } from '@data-fair/lib-vue/session.js'
import { getErrorMsg } from '@data-fair/lib-vue/ui-notif.js'
import DfThemedSvg from './themed-svg.vue'
import errorNotFoundSvg from './assets/svg/error-not-found.svg?raw'
import errorForbiddenSvg from './assets/svg/error-forbidden.svg?raw'
import errorServerSvg from './assets/svg/error-server.svg?raw'

const { error, backTo = '/', backLabel } = defineProps<{
  error: any
  backTo?: string
  backLabel?: string
}>()

const { t } = useI18n({ useScope: 'local' })
const { switchOrganization, user } = useSession()

const statusCode = computed(() => error?.statusCode ?? error?.status ?? 500)

const errorMsg = computed(() => (error ? getErrorMsg(error) : null))

const svgSource = computed(() => {
  if (statusCode.value === 404) return errorNotFoundSvg
  if (statusCode.value === 401 || statusCode.value === 403) return errorForbiddenSvg
  return errorServerSvg
})

const title = computed(() => {
  if (statusCode.value === 404) return t('notFound')
  if (statusCode.value === 401 || statusCode.value === 403) return t('forbidden')
  return t('error')
})

/**
 * Detects whether the 403 error message references an organization the user belongs to,
 * so we can offer a one-click "switch account" action.
 *
 * The API (data-fair permissions middleware) returns a text/plain 403 with the format:
 *   "...l'organisation {name} ({orgId}) dont vous êtes membre..."
 *
 * The regex captures the orgId between parentheses just before "dont vous êtes membre",
 * then matches it against the user's session organizations to retrieve the full org object
 * (id, department, role) needed by switchOrganization().
 */
const switchOrg = computed(() => {
  const msg = errorMsg.value
  if (!msg || !user.value) return null

  const match = msg.match(/\(([^)]+)\) dont vous êtes membre/)
  if (!match) return null

  const orgId = match[1]
  return user.value.organizations?.find(o => o.id === orgId) ?? null
})

const doSwitch = () => {
  if (!switchOrg.value) return
  switchOrganization(switchOrg.value.id, switchOrg.value.department, switchOrg.value.role)
  window.location.reload()
}
</script>

<i18n lang="yaml">
fr:
  notFound: La ressource demandée n'existe pas
  forbidden: Vous n'avez pas les droits pour accéder à cette ressource
  error: Une erreur indéterminée s'est produite
  switchAccount: Basculer le compte actif
  backToHome: Retour à l'accueil
en:
  notFound: The requested resource does not exist
  forbidden: You do not have permission to access this resource
  error: An unexpected error has occurred
  switchAccount: Switch active account
  backToHome: Back to home
</i18n>
