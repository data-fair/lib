<template>
  <v-toolbar-items class="lang-switcher">
    <v-speed-dial
      v-if="locales.length > 1"
      direction="bottom"
      transition="fade-transition"
      style="z-index: 2600; /* Higher than agent-chat's 2500 */"
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
  
<script setup lang="ts">
  import useSession from '@data-fair/lib-vue/session.js'
  
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
