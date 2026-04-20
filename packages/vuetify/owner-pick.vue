<template>
  <template v-if="status === 'loading'">
    <v-progress-linear
      indeterminate
      color="primary"
    />
  </template>
  <template v-if="status === 'ok'">
    <p v-if="!hideMessage">
      {{ message || t('message') }}
    </p>
    <v-radio-group
      v-if="model"
      v-model="model"
      class="my-2 ml-2"
      hide-details
    >
      <v-radio
        v-for="(owner, i) in owners"
        :key="i"
        :label="getLabel(owner)"
        :value="owner"
      />
    </v-radio-group>
  </template>
</template>

<i18n lang="yaml">
fr:
  yourself: Compte personnel
  org: Organisation
  message: Choisissez un propriétaire
en:
  yourself: Personal account
  org: Organization
  message: Choose an owner
</i18n>

<script setup lang="ts">
import { watch, computed } from 'vue'
import { computedAsync } from '@vueuse/core'
import { ofetch } from 'ofetch'
import { useI18n } from 'vue-i18n'
import { useSessionAuthenticated, type Account } from '@data-fair/lib-vue/session.js'

const { t } = useI18n({ useScope: 'local' })

const props = defineProps({
  otherAccounts: { type: Boolean, default: false },
  hideSingle: { type: Boolean, default: true },
  hideMessage: { type: Boolean, default: false },
  message: { type: String, default: null }
})

const model = defineModel({ type: Object, default: null })
const ready = defineModel('ready', { type: Boolean, default: false })

const session = useSessionAuthenticated()

const owners = computedAsync(async () => {
  const user = session.state.user

  const owners: Account[] = []
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
      org.departments.sort((d1: any, d2: any) => d1.name.localeCompare(d2.name))
      for (const dep of org.departments) {
        if (!owners.find(ow => ow.type === 'organization' && ow.id === o.id && ow.department === dep.id)) {
          owners.push({ type: 'organization', id: o.id, name: o.name, department: dep.id, departmentName: dep.name })
        }
      }
    }
  }

  return owners
})

const getLabel = (owner: Account) => {
  if (owner.type === 'user' && owner.id === session.state.user?.id) return t('yourself')
  if (owner.type === 'organization') {
    if (owner.department) return `${t('org')} ${owner.name} / ${owner.departmentName || owner.department}`
    else return `${t('org')} ${owner.name}`
  }
  return owner.name
}

watch(owners, () => {
  if (owners.value?.length) {
    if (model.value) {
      const match = owners.value.find(o =>
        o.type === model.value!.type &&
        o.id === model.value!.id &&
        (o.department || null) === (model.value!.department || null)
      )
      if (match) model.value = match
    } else {
      model.value = owners.value[0]
    }
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
