<template>
  <v-tooltip location="top">
    <template #activator="{ props }">
      <span
        v-bind="props"
        class="text-body-2"
      >
        <v-avatar :size="28" :image="avatarUrl" />
      </span>
    </template>
    {{ label }}
  </v-tooltip>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const ownerProps = defineProps({
  owner: {
    type: Object,
    default: null
  }
})

const avatarUrl = computed(() => {
  if (ownerProps.owner.department) return `/simple-directory/api/avatars/${ownerProps.owner.type}/${ownerProps.owner.id}/${ownerProps.owner.department}/avatar.png`
  else return `/simple-directory/api/avatars/${ownerProps.owner.type}/${ownerProps.owner.id}/avatar.png`
})

const label = computed(() => {
  let label = ownerProps.owner.name
  if (ownerProps.owner.department) label += ' - ' + (ownerProps.owner.departmentName || ownerProps.owner.department)
  if (ownerProps.owner.role) label += ` (${ownerProps.owner.role})`
  return label
})
</script>

<style>
</style>
