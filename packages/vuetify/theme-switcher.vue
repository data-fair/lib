<template>
  <v-toolbar-items class="theme-switcher" v-if="session.fullSite.value?.theme.dark || session.fullSite.value?.theme.hc">
    <v-menu
      offset-y
      nudge-left
    >
      <template #activator="{props: activatorProps}">
        <v-btn
          class="px-0"
          :icon="mdiThemeLightDark"
          :title="t('themeSwitch')"
          v-bind="activatorProps"
        />
      </template>

      <v-list class="border-sm">
        <v-list-item density="compact" class="pl-0">
          <v-radio-group
            :model-value="session.theme.value"
            density="comfortable"
            color="primary"
            hide-details
            :label="t('themeSwitch')"
            @update:modelValue="value => session.switchTheme(value as 'default' | 'dark' | 'hc')"
          >
            <v-radio :label="t('theme.default')" value="default"></v-radio>
            <v-radio :label="t('theme.dark')" value="dark"></v-radio>
            <v-radio :label="t('theme.hc')" value="hc"></v-radio>
          </v-radio-group>
        </v-list-item>
      </v-list>
    </v-menu>
  </v-toolbar-items>
</template>

<i18n lang="yaml">
fr:
  themeSwitch: Changer de thème
  theme:
    default: par défaut
    dark: sombre
    hc: contraste élevé
en:
  themeSwitch: Change theme
  theme:
    default: default
    dark: dark
    hc: high contrast
</i18n>

<script setup lang="ts">
import { useSession } from '@data-fair/lib-vue/session.js'
import { useI18n } from 'vue-i18n'
import { mdiThemeLightDark } from '@mdi/js'


const session = useSession()

const { t } = useI18n({ useScope: 'local' })
</script>

<style>

</style>
