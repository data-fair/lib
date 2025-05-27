<template>
  <v-toolbar-items class="personal-menu">
    <v-btn
      v-if="!user || !account"
      v-t="'login'"
      depressed
      color="primary"
      :href="session.loginUrl()"
    />
    <v-menu
      v-else
      offset-y
      nudge-left
      max-height="700"
    >
      <template #activator="{props: activatorProps}">
        <v-btn
          class="px-0"
          :title="t('openPersonalMenu')"
          v-bind="activatorProps"
        >
          <user-avatar show-account />
          <v-icon
            v-if="user.pd"
            color="warning"
            style="position:absolute;"
            :icon="mdiAlert"
          />
        </v-btn>
      </template>

      <v-list
        outlined
        class="py-0 border-sm"
      >
        <!-- current account, not actionable -->
        <v-list-item
          disabled
          :style="account.type !== 'user' ? 'padding-left:0' : ''"
          class="text--secondary"
        >
          <template #prepend>
            <user-avatar
              show-account
              style="margin-right: 16px;"
            />
          </template>

          <v-list-item-title>
            {{ account.type === 'user' ? t('personalAccount') : account.name }}
          </v-list-item-title>
          <v-list-item-subtitle v-if="account.department">
            {{ account.departmentName || account.department }}
          </v-list-item-subtitle>
          <v-list-item-subtitle>{{ user.name }}</v-list-item-subtitle>
        </v-list-item>

        <!-- cancel a planned deletion ? -->
        <!-- not really necessary as it is handled by SD directly after login
        <template v-if="user.pd">
          <v-alert
            :value="true"
            type="warning"
            tile
            :outlined="theme.current.value.dark"
            style="max-width:440px;"
          >
            {{ t('plannedDeletion', {name: user.name, plannedDeletion: $d(new Date(user.pd))}) }}
          </v-alert>

          <v-row class="justify-center ma-0 mb-2">
            <v-btn
              color="warning"
              @click="session.cancelDeletion"
            >
              {{ t('cancelDeletion') }}
            </v-btn>
          </v-row>
        </template>
        -->

        <!-- account switching (personal account and organizations) -->
        <template v-if="user.organizations.length > 1 || (user.organizations.length === 1 && (!user.ipa || account.type === 'user'))">
          <v-list-subheader
            v-t="'switchAccount'"
            style="height: 24px"
          />
          <v-list-item
            v-if="account.type !== 'user' && !user.ipa"
            id="toolbar-menu-switch-user"
            @click="session.switchOrganization(null)"
          >
            <template #prepend>
              <v-avatar
                :size="28"
                :image="`${session.options.directoryUrl}/api/avatars/user/${user.id}/avatar.png`"
              />
            </template>
            <v-list-item-title v-t="'personalAccount'" />
          </v-list-item>
          <v-list-item
            v-for="organization in switchableOrganizations"
            :id="'toolbar-menu-switch-orga-' + organization.id"
            :key="organization.id"
            @click="session.switchOrganization(organization.id , organization.department, organization.role)"
          >
            <template #prepend>
              <v-avatar
                :size="28"
                :image="organization.department ? `${session.options.directoryUrl}/api/avatars/organization/${organization.id}/${organization.department}/avatar.png` : `${session.options.directoryUrl}/api/avatars/organization/${organization.id}/avatar.png`"
              />
            </template>
            <v-list-item-title>
              {{ organization.name }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="organization.department || organization.roleLabel">
              {{ organization.departmentName || organization.department }} {{ organization.roleLabel }}
            </v-list-item-subtitle>
          </v-list-item>
        </template>

        <v-divider />

        <slot name="actions-before" />

        <!-- toggle admin mode -->
        <v-list-item
          v-if="user.isAdmin"
          density="compact"
          class="personal-menu-switch-list-item"
        >
          <template #prepend>
            <v-icon :icon="mdiShieldAlert" color="admin" />
          </template>
          <v-list-item-title>
            <v-switch
              :model-value="!!user.adminMode"
              color="admin"
              hide-details
              class="mt-0"
              density="compact"
              :label="t('adminMode')"
              @change="session.setAdminMode(!user.adminMode)"
            />
          </v-list-item-title>
        </v-list-item>

        <!-- get back to normal admin session after impersonating a user -->
        <v-list-item
          v-if="user.asAdmin"
          color="admin"
          density="compact"
          @click="session.asAdmin(null)"
        >
          <template #prepend>
            <v-icon :icon="mdiAccountSwitchOutline" />
          </template>
          <v-list-item-title>{{ t('backToAdmin') }}</v-list-item-title>
        </v-list-item>

        <!-- logout button -->
        <v-divider />
        <v-list-item
          @click="() => session.logout()"
        >
          <template #prepend>
            <v-icon :icon="mdiLogout" />
          </template>
          <v-list-item-title v-t="'logout'" />
        </v-list-item>
      </v-list>
    </v-menu>
  </v-toolbar-items>
</template>

<i18n lang="yaml">
fr:
  login: Se connecter / S'inscrire
  logout: Se déconnecter
  openPersonalMenu: Ouvrez le menu personnel
  personalAccount: Compte personnel
  switchAccount: Changer de compte
  adminMode: mode admin
  backToAdmin: Revenir à ma session administrateur
  darkMode: mode nuit
  plannedDeletion: La suppression de l'utilisateur {name} et toutes ses informations est programmée le {plannedDeletion}.
  cancelDeletion: Annuler la suppression de l'utilisateur
en:
  login: Login / Sign up
  logout: Logout
  openPersonalMenu: Open personal menu
  personalAccount: Personal account
  switchAccount: Switch account
  adminMode: admin mode
  backToAdmin: Return to administrator session
  darkMode: night mode
  plannedDeletion: The deletion of the user {name} and all its data is planned on the {plannedDeletion}.
  cancelDeletion: Cancel the deletion of the user
</i18n>

<script setup lang="ts">
import { computed, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSession } from '@data-fair/lib-vue/session.js'
import UserAvatar from './user-avatar.vue'
import { mdiAlert, mdiShieldAlert, mdiLogout, mdiAccountSwitchOutline } from '@mdi/js'

const session = useSession()

const { t } = useI18n({ useScope: 'local' })
const { user, account } = toRefs(session.state)
const switchableOrganizations = computed(() => {
  const { user, account, accountRole } = session.state
  if (!user || !account) return
  return user.organizations.filter(o => account.type === 'user' || account.id !== o.id || (account.department || null) !== (o.department || null) || (accountRole || null) !== (o.role || null))
})
</script>

<style>
.personal-menu-switch-list-item .v-list-item__content {
  overflow: visible!important;
}
.personal-menu-switch-list-item .v-list-item__content .v-list-item-title {
  overflow: visible!important;
}
</style>
