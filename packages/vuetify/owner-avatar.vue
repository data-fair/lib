<template>
  <v-tooltip
    v-if="showTooltip"
    location="top"
  >
    <template #activator="{ props: tooltipProps }">
      <span
        v-bind="tooltipProps"
        class="text-body-2"
      >
        <v-avatar
          :size="size"
          :image="avatarUrl"
          class="bg-transparent"
        />
      </span>
    </template>
    {{ label }}
  </v-tooltip>
  <span v-else>
    <v-avatar
      :size="size"
      :image="avatarUrl"
      class="bg-transparent"
    />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  owner: Record<string, any>
  size?: number
  /** If true, a tooltip with the owner's name and department will be shown (default: true) */
  showTooltip?: boolean
  /** If true, the owner's name will be omitted from the tooltip when the department is present */
  omitOwnerName?: boolean
}>(), {
  size: 28,
  showTooltip: true,
  omitOwnerName: false
})

const avatarUrl = computed(() => {
  if (props.owner.department) return `/simple-directory/api/avatars/${props.owner.type}/${props.owner.id}/${props.owner.department}/avatar.png`
  else return `/simple-directory/api/avatars/${props.owner.type}/${props.owner.id}/avatar.png`
})

const label = computed(() => {
  let label = ''
  if (!props.omitOwnerName || !props.owner.department) label += props.owner.name
  if (props.owner.department) label += (!props.omitOwnerName ? ' - ' : '') + (props.owner.departmentName || props.owner.department)
  if (props.owner.role) label += ` (${props.owner.role})`
  return label
})
</script>

<style>
</style>
