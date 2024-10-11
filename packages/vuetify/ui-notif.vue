<template>
  <v-snackbar
    v-if="notification"
    ref="notificationSnackbar"
    v-model="showNotification"
    class="ui-notification"
    v-bind="fullSnackbarProps"
  >
    <p>{{ notification.msg }}</p>
    <p
      v-if="notification.type === 'error'"
      class="ml-3"
      v-text="notification.errorMsg"
    />

    <template #actions>
      <v-btn
        icon
        @click.native="showNotification = false"
      >
        <v-icon :icon="mdiClose" />
      </v-btn>
    </template>
  </v-snackbar>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useUiNotif } from '@data-fair/lib-vue/ui-notif.js'
import inIframe from '@data-fair/lib-utils/in-iframe.js'
import { mdiClose } from '@mdi/js'

const uiNotif = useUiNotif()

const notification = computed(() => uiNotif.notification.value)
const showNotification = ref(false)

watch(() => notification.value, async () => {
  showNotification.value = false
  if (!inIframe && notification.value) {
    await new Promise(resolve => setTimeout(resolve, 300))
    showNotification.value = true
  }
}, {immediate: true})

const { snackbarProps } = defineProps({
  snackbarProps: {
    type: Object,
    default () {
      return { tile: true, right: true, bottom: true, timeout: 30000 }
    }
  }
})

const fullSnackbarProps = computed(() => {
  const props = { ...snackbarProps }
  if (!notification.value) return props
  if (notification.value.type === 'error') props.timeout = -1
  props.color = notification.value.type
  return props
})

</script>

<style>
</style>
