<script setup>
import { ref, watch } from 'vue'
import { ofetch } from 'ofetch'
import { useDebounceFn } from '@vueuse/core'

defineProps({
  variant: { type: String, default: undefined }
})
const emit = defineEmits(['selected'])
const model = defineModel({ type: String })

/** @type {import('vue').Ref<any[]>} */
const addressesList = ref([])
const loadingAddresses = ref(false)
/** @type {import('vue').Ref<any>} */
const address = ref(null)

const findAdresses = useDebounceFn(async (/** @type {string} */search, /** @type {string} */selectedId) => {
  loadingAddresses.value = true
  if (!search || search.length < 3) {
    addressesList.value = address.value ? [address.value] : []
  } else {
    const params = { q: search }
    const result = (await ofetch('https://api-adresse.data.gouv.fr/search/', { params }))
    addressesList.value = result.features.map((/** @type {any} */f) => ({
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
}, 300)

if (model.value && model.value.length) {
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
    @update:search="search => findAdresses(search)"
  />
</template>
