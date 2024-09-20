<template lang="html">
  <v-row>
    <v-col>
      <template v-if="status === 'loading'">
        <v-progress-linear
          indeterminate
          color="primary"
        />
      </template>
      <template v-if="status === 'ok'">
        <p>{{ message || t('message') }}</p>
        <v-radio-group
          v-if="model"
          v-model="model"
          class="my-3 ml-2"
        >
          <v-radio
            v-for="(owner, $index) in owners"
            :key="$index"
            :label="getLabel(owner)"
            :value="owner"
          />
        </v-radio-group>
      </template>
    </v-col>
  </v-row>
</template>

<i18n lang="yaml">
fr:
  yourself: Compte personnel
  org: Organisation
  message: Choisissez un propriétaire
en:
  yourself: Personal account
  org: Organization
  message: Choisissez un propriétaire
</i18n>

<script setup>
import { watch, computed } from 'vue'
import { computedAsync } from '@vueuse/core'
import { ofetch } from 'ofetch'
import { useI18n } from 'vue-i18n'
import { useSessionAuthenticated } from '@data-fair/lib/vue/session.js'

const { t } = useI18n({ useScope: 'local' })

const props = defineProps({
  otherAccounts: { type: Boolean, default: false },
  hideSingle: { type: Boolean, default: true },
  message: { type: String, default: null }
})

const model = defineModel({ type: Object, default: null })
const ready = defineModel('ready', { type: Boolean, default: false })

const session = useSessionAuthenticated()

const owners = computedAsync(async () => {
  const user = session.state.user

  /** @type {import('../shared/session').Account[]} */
  const owners = []
  if (props.otherAccounts || session.state.account.type === 'user') {
    owners.push({ type: 'user', id: user.id, name: user.name })
  }
  for (const o of user.organizations.filter(o => ['contrib', 'admin'].includes(o.role))) {
    if (!props.otherAccounts) {
      if (session.state.account.type !== 'organization' || o.id !== session.state.account.id) {
        continue
      }
      if (session.state.account.department && session.state.account.department !== o.department) {
        continue
      }
    }
    if (o.department && !owners.find(ow => ow.type === 'organization' && ow.id === o.id && ow.department === o.department)) {
      owners.push({ type: 'organization', id: o.id, name: o.name, department: o.department, departmentName: o.departmentName || '' })
    }
    if (!o.department) {
      const org = await ofetch(`/simple-directory/api/organizations/${o.id}`)
      owners.push({ type: 'organization', id: o.id, name: o.name })
      if (!org.departments) continue
      for (const dep of org.departments) {
        if (!owners.find(ow => ow.type === 'organization' && ow.id === o.id && ow.department === dep.id)) {
          owners.push({ type: 'organization', id: o.id, name: o.name, department: dep.id, departmentName: dep.name })
        }
      }
    }
  }

  return owners
})

/**
 * @param {import('../shared/session').Account} owner
 */
const getLabel = (owner) => {
  if (owner.type === 'user' && owner.id === session.state.user?.id) return t('yourself')
  if (owner.type === 'organization') {
    if (owner.department) return `${t('org')} ${owner.name} / ${owner.departmentName || owner.department}`
    else return `${t('org')} ${owner.name}`
  }
  return owner.name
}

watch(owners, () => {
  if (!model.value && owners.value?.length) {
    model.value = owners.value[0]
  }
  if (owners.value) {
    ready.value = true
  }
})

const status = computed(() => {
  if (!owners.value) return 'loading'
  if (owners.value.length === 0) return 'hidden'
  if (props.hideSingle && owners.value.length === 1) return 'hidden'
  return 'ok'
})

</script>
