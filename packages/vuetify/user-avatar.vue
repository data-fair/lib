<template>
  <div
    class="sd-avatar"
    :class="{'has-secondary-avatar': showSecondAvatar}"
  >
    <v-avatar
      v-if="showAccount && session.state.account && session.state.account.type === 'user'"
      class="primary-avatar"
      :size="36"
    >
      <img
        :src="userAvatarUrl"
        aria-hidden
        alt=""
      >
    </v-avatar>
    <v-avatar
      v-else
      class="primary-avatar"
      :size="36"
    >
      <img
        :src="accountAvatarUrl"
        aria-hidden
        alt=""
      >
    </v-avatar>
    <v-avatar
      v-if="showSecondAvatar"
      class="secondary-avatar"
      :size="28"
    >
      <img
        :src="userAvatarUrl"
        aria-hidden
        alt=""
      >
    </v-avatar>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useSession } from '@data-fair/lib-vue/session.js'

const props = defineProps({
  showAccount: { type: Boolean, default: false }
})

const session = useSession()
const userAvatarUrl = computed(() => session.state.user && `${session.options.directoryUrl}/api/avatars/user/${session.state.user.id}/avatar.png`)
const accountAvatarUrl = computed(() => {
  if (!session.state.account) return
  let url = `${session.options.directoryUrl}/api/avatars/${session.state.account.type}/${session.state.account.id}`
  if (session.state.account.department) url += `/${session.state.account.department}`
  url += '/avatar.png'
  return url
})
const showSecondAvatar = computed(() => props.showAccount && session.state.account && session.state.account.type !== 'user')

</script>

  <style>
  .sd-avatar {
    width: 36px;
    text-indent: 0;
  }
  .sd-avatar.has-secondary-avatar {
    width: 56px;
    height: 40px;
    position: relative;
    margin-left: 8px;
    margin-right: 8px;
  }
  .sd-avatar.has-secondary-avatar .primary-avatar {
    position: absolute;
    left: 0;
    top: 0
  }
  .sd-avatar .secondary-avatar {
    position:absolute;
    right:0px;
    bottom:0;
  }
  </style>
