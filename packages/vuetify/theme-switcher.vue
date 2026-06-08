<template>
  <v-toolbar-items v-if="hasDark || hasHc || hasHcDark">
    <v-menu
      offset-y
      class="ml-n4"
      style="z-index: 2600; /* Higher than agent-chat's 2500 */"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          :title="t('themeSwitch')"
          stacked
        >
          <v-icon :icon="mdiThemeLightDark" />
        </v-btn>
      </template>

      <v-list>
        <v-list-item density="compact" class="pl-0">
          <v-radio-group
            :model-value="session.theme.value"
            density="comfortable"
            color="primary"
            hide-details
            :label="t('themeSwitch')"
            @update:modelValue="value => session.switchTheme(value as 'default' | 'dark' | 'hc' | 'hc-dark' | 'system')"
          >
            <v-radio :label="t('theme.system')" value="system"></v-radio>
            <v-radio :label="t('theme.default')" value="default"></v-radio>
            <v-radio v-if="hasDark" :label="t('theme.dark')" value="dark"></v-radio>
            <v-radio v-if="hasHc" :label="t('theme.hc')" value="hc"></v-radio>
            <v-radio v-if="hasHcDark" :label="t('theme.hcDark')" value="hc-dark"></v-radio>
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
    system: Système
    default: Par défaut
    dark: Sombre
    hc: Contraste élevé
    hcDark: Sombre et contraste élevé
en:
  themeSwitch: Change theme
  theme:
    system: System
    default: Default
    dark: Dark
    hc: High contrast
    hcDark: Dark and high contrast
</i18n>

<script setup lang="ts">
import { computed } from 'vue'
import { useSession } from '@data-fair/lib-vue/session.js'
import { useI18n } from 'vue-i18n'
import { mdiThemeLightDark } from '@mdi/js'

// Optional `theme` lets hosts that don't expose their config through
// session.fullSite (e.g. the public Nuxt portal, where the theme lives in
// portalConfig) drive which radios are shown. Falls back to
// session.fullSite.value?.theme — the historical behaviour for data-fair UIs.
const props = defineProps<{
  theme?: { dark?: boolean, hc?: boolean, hcDark?: boolean }
}>()

const session = useSession()

const effectiveTheme = computed(() => props.theme ?? session.fullSite.value?.theme)
const hasDark = computed(() => !!effectiveTheme.value?.dark)
const hasHc = computed(() => !!effectiveTheme.value?.hc)
const hasHcDark = computed(() => !!effectiveTheme.value?.hcDark)

const { t } = useI18n({ useScope: 'local' })
</script>

<style lang="css">

</style>
