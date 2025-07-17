<template>
  <v-navigation-drawer
    v-if="display.lgAndUp.value"
    class="navigation-right-drawer pl-2"
    location="right"
    permanent
    floating
    position="fixed"
    color="surface"
    style="padding-top: 60px; background-color: transparent;"
  >
    <slot />
  </v-navigation-drawer>
  <div
    v-else
    class="navigation-right-button mt-4"
  >
    <v-menu
      location="bottom left"
      :close-on-content-click="false"
    >
      <template #activator="{ props }">
        <v-btn
          v-bind="props"
          size="small"
          color="primary"
          :icon="mdiDotsVertical"
        />
      </template>
      <slot />
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { mdiDotsVertical } from '@mdi/js'
import { useDisplay } from 'vuetify'

const display = useDisplay()

</script>

<style>
.navigation-right-button {
  z-index: 1000;
  position: fixed;
  right: 20px;
}
</style>
