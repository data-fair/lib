<template>
  <!-- Right-side navigation drawer for larger screens -->
  <v-navigation-drawer
    v-if="display.lgAndUp.value"
    color="background"
    class="pt-6"
    location="right"
    permanent
    floating
  >
    <template #default>
      <v-list
        data-iframe-height
        bg-color="background"
        density="compact"
      >
        <v-defaults-provider :defaults="defaults">
          <slot />
        </v-defaults-provider>
      </v-list>
    </template>
  </v-navigation-drawer>

  <!-- Floating action button for smaller screens -->
  <v-fab
    v-else
    size="small"
    color="primary"
    location="top right"
    app
    icon
  >
    <v-icon
      :icon="mdiDotsVertical"
    />
    <v-menu
      activator="parent"
      :close-on-content-click="false"
    >
      <v-card
        max-width="300"
        class="mt-2"
      >
        <v-list
          data-iframe-height
          density="compact"
        >
          <v-defaults-provider :defaults="defaults">
            <slot />
          </v-defaults-provider>
        </v-list>
      </v-card>
    </v-menu>
  </v-fab>
</template>

<script setup lang="ts">
import { mdiDotsVertical } from '@mdi/js'
import { useDisplay } from 'vuetify'

const display = useDisplay()

const defaults = {
  VListItem: {
    rounded: true
  },
  VAutocomplete: {
    color: 'primary',
    density: 'compact',
    variant: 'outlined',
    clearable: true,
    hideDetails: true,
    rounded: true,
  },
  VSelect: {
    color: 'primary',
    density: 'compact',
    variant: 'outlined',
    clearable: true,
    hideDetails: true,
    rounded: true
  },
  VSwitch: {
    hideDetails: true
  }
}
</script>
