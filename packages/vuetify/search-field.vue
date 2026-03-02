<template>
  <v-text-field
    v-bind="$attrs"
    :append-inner-icon="mdiMagnify"
    :label="t('search')"
    class="mx-4"
    color="primary"
    density="compact"
    variant="outlined"
    autofocus
    hide-details
    clearable
  />
</template>

<script setup lang="ts">
import { mdiMagnify } from '@mdi/js'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

</script>

<i18n lang="yaml">
  en:
    search: Search
  fr:
    search: Rechercher
</i18n>
