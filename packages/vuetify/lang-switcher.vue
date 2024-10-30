<template lang="html">
  <v-toolbar-items class="lang-switcher">
    <v-speed-dial
      v-if="locales.length > 1"
      direction="bottom"
      transition="fade-transition"
    >
      <template #activator="{props}">
        <v-btn
          v-bind="props"
        >
          {{ session.lang.value }}
        </v-btn>
      </template>
      <v-btn
        v-for="locale in locales.filter(l => l !== session.lang.value)"
        :key="locale"
        icon
        @click="setLocale(locale)"
      >
        {{ locale }}
      </v-btn>
    </v-speed-dial>
    </v-toolbar-items>
  </template>
  
  <script lang="ts" setup>
  import { useI18n } from 'vue-i18n'
  import useSession from '@data-fair/lib-vue/session.js'
  
  const i18n = useI18n()
  const session = useSession()
  
  const {locales} = defineProps({
    locales: {
      type: Array as () => string[],
      default: ['fr', 'en']
    }
  })

  const setLocale = (locale: string) => {
    session.switchLang(locale)
    window.location.reload()
  }
  </script>
  
  <style lang="css">
  </style>