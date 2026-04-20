<template>
  <v-alert
    v-for="(warning, i) of colorsWarnings"
    :key="i"
    type="warning"
    variant="outlined"
    class="mb-2"
  >
    {{ warning }}
  </v-alert>
  <v-theme-provider
    :theme="'preview-' + colorsKey"
    with-background
  >
    <component
      :is="'style'"
      v-if="colors"
      :nonce="cspNonce"
    >
      {{ getTextColorsCss(colors, 'preview-' + colorsKey) }}
    </component>

    <v-row
      density="compact"
      class="ma-0"
      no-gutters
    >
      <v-col class="pa-1">
        <v-card
          class="h-100"
          :title="t('cardExample.title')"
          :text="t('cardExample.text')"
        />
      </v-col>
      <v-col class="pa-1">
        <v-card
          class="h-100"
          :title="t('cardExample.title')"
          :text="t('cardExample.textInverse')"
          color="surface-inverse"
        />
      </v-col>
    </v-row>

    <v-row
      v-for="color of colorKeys"
      :key="color"
      density="compact"
      class="ma-0"
      no-gutters
    >
      <v-col
        v-for="variant of buttonVariants"
        :key="variant"
        class="pa-1"
      >
        <v-btn
          :color="color"
          :variant="variant"
          class="px-1"
          block
        >
          {{ color }}
        </v-btn>
      </v-col>
    </v-row>
  </v-theme-provider>
</template>

<i18n lang="yaml">
en:
  cardExample:
    title: Card example
    text: Surface color.
    textInverse: Inverse surface color.
fr:
  cardExample:
    title: Vignette
    text: Couleur des surfaces.
    textInverse: Couleur inversée des surfaces.
</i18n>

<script setup lang="ts">
import { computed, watch } from 'vue'
import { useTheme } from 'vuetify'
import { useI18n } from 'vue-i18n'
import type { VBtn } from 'vuetify/components/VBtn'
import type { Colors, Theme } from '@data-fair/lib-common-types/theme/index.js'
import { fillTheme, getTextColorsCss, getColorsWarnings, readableOptions, hcReadableOptions } from '@data-fair/lib-common-types/theme/index.js'

const { t } = useI18n({ useScope: 'local' })
const vuetifyTheme = useTheme()
const { colorsKey, theme, defaultTheme, dark } = defineProps({
  colorsKey: { type: String as () => 'colors' | 'darkColors' | 'hcColors' | 'hcDarkColors', required: true },
  theme: { type: Object as () => Theme, required: true },
  defaultTheme: { type: Object as () => Theme, required: true },
  dark: { type: Boolean, default: false },
  cspNonce: { type: String, default: undefined }
})

const fullTheme = computed(() => {
  return fillTheme(theme, defaultTheme)
})

const colors = computed(() => fullTheme.value?.[colorsKey])

watch(fullTheme, () => {
  if (!fullTheme.value) return
  const key = 'preview-' + colorsKey
  const nextColors = fullTheme.value[colorsKey]
  if (vuetifyTheme.themes.value[key]) {
    for (const color of Object.keys(vuetifyTheme.themes.value[key].colors)) {
      if (nextColors[color as keyof Colors] === undefined) delete vuetifyTheme.themes.value[key].colors[color]
    }
    Object.assign(vuetifyTheme.themes.value[key].colors, nextColors)
  } else {
    vuetifyTheme.themes.value[key] = { dark, colors: nextColors, variables: dark ? vuetifyTheme.themes.value.dark.variables : vuetifyTheme.themes.value.light.variables }
  }
}, { immediate: true })

const buttonVariants: VBtn['variant'][] = ['flat', 'tonal', 'text']
const colorKeys = ['primary', 'secondary', 'accent', 'info', 'warning', 'error', 'success']

const themeNames = {
  colors: 'default',
  darkColors: 'dark',
  hcColors: 'hc',
  hcDarkColors: 'hcDark'
}

const colorsWarnings = computed(() => {
  if (!colors.value) return []
  return getColorsWarnings('fr', colors.value, themeNames[colorsKey], colorsKey.startsWith('hc') ? hcReadableOptions : readableOptions)
})
</script>
