<!-- eslint-disable vue/no-v-html -->
<template>
  <div
    class="df-themed-svg"
    v-html="themedSource"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from 'vuetify'
import { themeSvgSource } from './themed-svg-source.js'

const { source, color = 'primary' } = defineProps<{ source: string, color?: string }>()
const theme = useTheme()

const themedSource = computed(() => themeSvgSource(source, theme.current.value.colors as Record<string, string>, color))
</script>

<style lang="css">
div.df-themed-svg {
  height: 100%;
}
div.df-themed-svg svg {
  height: inherit;
  width: inherit;
}
.isolated-svg { isolation: isolate; }
</style>
