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
      <template #activator="{props}">
        <v-btn
          text
          class="px-0"
          :title="t('openPersonalMenu')"
          v-bind="props"
        >
          <avatar show-account />
          <v-icon v-if="user.pd" color="warning" style="position:absolute;">
            mdi-alert
          </v-icon>
        </v-btn>
      </template>

      <v-list
        outlined
        class="py-0"
      >
        <!-- current account, not actionable -->
        <v-list-item disabled :style="account.type !== 'user' ? 'padding-left:0' : ''">
          <avatar show-account style="margin-right: 16px;" />

          <v-list-item-content class="text--secondary">
            <v-list-item-title>
              {{ account.type === 'user' ? t('personalAccount') : account.name }}
            </v-list-item-title>
            <v-list-item-subtitle v-if="account.department">
              {{ account.departmentName || account.department }}
            </v-list-item-subtitle>
            <v-list-item-subtitle>{{ user.name }}</v-list-item-subtitle>
          </v-list-item-content>
        </v-list-item>

        <!-- cancel a planned deletion ? -->
        <template v-if="user.pd">
          <v-alert
            :value="true"
            type="warning"
            tile
            :outlined="$vuetify.theme.current.dark"
            style="max-width:440px;"
          >
            {{ t('plannedDeletion', {name: user.name, plannedDeletion: $d(new Date(user.pd))}) }}
          </v-alert>

          <v-row class="justify-center ma-0 mb-2">
            <v-btn
              color="warning"
              text
              @click="session.cancelDeletion"
            >
              {{ t('cancelDeletion') }}
            </v-btn>
          </v-row>
        </template>

        <!-- account switching (personal account and organizations) -->
        <template v-if="user.organizations.length > 1 || (user.organizations.length === 1 && (!user.ipa || account.type === 'user'))">
          <v-subheader v-t="'switchAccount'" style="height: 24px" />
          <v-list-item
            v-if="account.type !== 'user' && !user.ipa"
            id="toolbar-menu-switch-user"
            @click="session.switchOrganization(null)"
          >
            <v-list-item-action class=" my-0">
              <v-avatar :size="28">
                <img :src="`${session.options.directoryUrl}/api/avatars/user/${user.id}/avatar.png`">
              </v-avatar>
            </v-list-item-action>
            <v-list-item-title v-t="'personalAccount'" />
          </v-list-item>
          <v-list-item
            v-for="organization in switchableOrganizations"
            :id="'toolbar-menu-switch-orga-' + organization.id"
            :key="organization.id"
            @click="session.switchOrganization(organization.id + ':' + (organization.department || ''))"
          >
            <v-list-item-action class="my-0">
              <v-avatar :size="28">
                <img v-if="organization.department" :src="`${session.options.directoryUrl}/api/avatars/organization/${organization.id}/${organization.department}/avatar.png`">
                <img v-else :src="`${session.options.directoryUrl}/api/avatars/organization/${organization.id}/avatar.png`">
              </v-avatar>
            </v-list-item-action>
            <v-list-item-content>
              <v-list-item-title>
                {{ organization.name }}
              </v-list-item-title>
              <v-list-item-subtitle v-if="organization.department">
                {{ organization.departmentName || organization.department }}
              </v-list-item-subtitle>
            </v-list-item-content>
          </v-list-item>
        </template>

        <v-divider />

        <slot name="actions-before" />

        <!-- toggle admin mode -->
        <v-list-item v-if="user.isAdmin" dense>
          <v-list-item-action><v-icon>mdi-shield-alert</v-icon></v-list-item-action>
          <v-list-item-title style="overflow: visible;">
            <v-switch
              v-model="user.adminMode"
              color="admin"
              hide-details
              class="mt-0"
              :label="t('adminMode')"
              @change="session.setAdminMode"
            />
          </v-list-item-title>
        </v-list-item>

        <!-- get back to normal admin session after impersonating a user -->
        <v-list-item v-if="user.asAdmin" color="admin" @click="session.asAdmin(null)">
          <v-list-item-action><v-icon>mdi-account-switch-outline</v-icon></v-list-item-action>
          <v-list-item-title>{{ t('backToAdmin') }}</v-list-item-title>
        </v-list-item>

        <!-- switch dark mode -->
        <v-list-item
          v-if="darkModeSwitch"
          dense
        >
          <v-list-item-action><v-icon>mdi-weather-night</v-icon></v-list-item-action>
          <v-list-item-title style="overflow: visible;">
            <v-switch
              :input-value="$vuetify.theme.current.dark"
              hide-details
              class="mt-0"
              :label="t('darkMode')"
              color="white"
              @change="session.switchDark"
            />
          </v-list-item-title>
        </v-list-item>

        <!-- logout button -->
        <v-divider />
        <v-list-item @click="session.logout">
          <v-list-item-action><v-icon>mdi-logout</v-icon></v-list-item-action>
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
import {Session} from '../vue/use-session'

const props = withDefaults(
  defineProps<{darkModeSwitch?: boolean, session: Session}>(),
  { darkModeSwitch: false }
)

const { t } = useI18n({ useScope: 'local' })
const { user, account } = toRefs(props.session.state)
const switchableOrganizations = computed(() => {
  const { user, account } = props.session.state
  if (!user || !account) return
  return user.organizations.filter(o => account.type === 'user' || account.id !== o.id || (account.department || null) !== (o.department || null))
})
</script>

<style>

</style>
