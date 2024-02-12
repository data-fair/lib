<template>
  <v-autocomplete
    v-model="address"
    v-model:search="searchAddress"
    :items="addressesList"
    :loading="loadingAddresses"
    no-filter
    :clearable="true"
    return-object
    hide-no-data
    hide-details
    placeholder="Saisissez une adresse"
    variant="solo"
    density="compact"
    menu-icon=""
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { ofetch } from 'ofetch'
import { debounceFilter, watchWithFilter } from '@vueuse/core'

const emit = defineEmits(['goTo'])

/** @type {import('vue').Ref<any[]>} */
const addressesList = ref([])
const searchAddress = ref('')
const loadingAddresses = ref(false)
/** @type {import('vue').Ref<any>} */
const address = ref(null)

const findAdresses = async () => {
  loadingAddresses.value = true
  if (!searchAddress.value || searchAddress.value.length < 3) {
    addressesList.value = address.value ? [address] : []
  } else {
    const params = { q: searchAddress.value }
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
  loadingAddresses.value = false
}

watchWithFilter(
  searchAddress,
  () => findAdresses(),
  { eventFilter: debounceFilter(300) }
)

watch(
  address,
  (addr) => {
    if (addr) emit('goTo', addr.value)
  }
)

</script>
