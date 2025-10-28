<template>
  <v-autocomplete
    v-model="address"
    :items="addressesList"
    :loading="loadingAddresses"
    no-filter
    :clearable="true"
    return-object
    hide-no-data
    hide-details
    label="Adresse"
    placeholder="Saisissez une adresse"
    :variant="variant"
    density="compact"
    menu-icon=""
    @update:search="(search: string) => findAdresses(search)"
  />
</template>


<script setup lang="ts">
import type { VAutocomplete } from 'vuetify/components/VAutocomplete'
import { ref, watch } from 'vue'
import { ofetch } from 'ofetch'
import { useDebounceFn } from '@vueuse/core'

defineProps<{variant?: VAutocomplete['variant']}>()
const emit = defineEmits(['selected'])
const model = defineModel({ type: String })

const addressesList = ref<any[]>([])
const loadingAddresses = ref(false)
const address = ref<any>(null)

const findAdressesFn = async (search: string, selectedId?: string) => {
  loadingAddresses.value = true
  if (!search || search.length < 3) {
    addressesList.value = address.value ? [address.value] : []
  } else {
    const params = { q: search }
    const result = (await ofetch('https://api-adresse.data.gouv.fr/search/', { params }))
    addressesList.value = result.features.map((f: any) => ({
      title: f.properties.label,
      value: {
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        ...f.properties
      }
    }))
  }
  if (selectedId) {
    address.value = addressesList.value.find(a => a.value.id === selectedId)
  }
  loadingAddresses.value = false
}

const findAdresses = useDebounceFn(findAdressesFn, 300) as typeof findAdressesFn

if (model.value && model.value.length) {
  // @ts-ignore
  findAdresses(...JSON.parse(`[${model.value}]`))
}

watch(
  address,
  (addr) => {
    if (addr) {
      model.value = JSON.stringify([addr.title, addr.value.id]).slice(1, -1)
    } else {
      model.value = undefined
      addressesList.value = []
    }
    emit('selected', addr ? addr.value : undefined)
  }
)
</script>