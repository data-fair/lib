<template>
  <v-alert
    v-if="notif"
    class="ui-notif-alert"
    v-bind="fullAlertProps"
  >
    <p v-if="notif.msg">{{ notif.msg }}</p>
    <p
      v-if="notif.type === 'error'"
      :class="notif.msg ? 'ml-3' : ''"
      v-text="notif.errorMsg"
    />
  </v-alert>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { type UiNotif, useUiNotif } from '@data-fair/lib-vue/ui-notif.js'

const {notif, alertProps} = defineProps({
  notif: {
    type: Object as () => UiNotif,
    default: null
  },
  alertProps: {
    type: Object,
    default () { return {} }
  }
})

const fullAlertProps = computed(() => {
  const props = { ...alertProps }
  if (!notif) return props
  if (notif.type === 'error') {
    props.type = notif.clientError ? 'warning' : 'error'
  } else {
    props.type = notif.type
  }
  return props
})

</script>

<style>
</style>
