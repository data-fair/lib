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

<script>
import { ofetch } from 'ofetch'
import debounce from 'debounce'

export default {
  emits: ['goTo'],
  data: () => ({
    addressesList: [],
    searchAddress: '',
    loadingAddresses: false,
    address: null
  }),
  watch: {
    searchAddress () {
      // @ts-ignore
      this.debouncedFindAddress()
    },
    address (addr) {
      if (addr) {
        this.$emit('goTo', addr.value)
      }
    }
  },
  created () {
    // @ts-ignore
    this.debouncedFindAddress = debounce(this.findAdresses, 300)
  },
  methods: {
    async findAdresses () {
      this.loadingAddresses = true
      if (!this.searchAddress || this.searchAddress.length < 3) {
        this.addressesList = this.address ? [this.address] : []
      } else {
        const params = {
          q: this.searchAddress
        }
        const result = (await ofetch('https://api-adresse.data.gouv.fr/search/', { params }))
        this.addressesList = result.features.map((/** @type {any} */f) => ({
          title: f.properties.label,
          value: {
            lat: f.geometry.coordinates[1],
            lon: f.geometry.coordinates[0],
            ...f.properties
          }
        }))
      }
      this.loadingAddresses = false
    }
  }
}
</script>
