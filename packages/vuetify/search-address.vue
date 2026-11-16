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
    :placeholder="t('placeholder')"
    :variant="variant"
    density="compact"
    menu-icon=""
    @update:search="(search: string) => findAdresses(search)"
  >
    <template #label>
      {{ t('label') }} <span class="d-sr-only">{{ t('srHelp') }}</span>
    </template>
  </v-autocomplete>
</template>

<i18n lang="yaml">
  en:
    placeholder: Type an address
    label: Address
    srHelp: When results are available, use the up and down arrows to browse them and press Enter to select. On a touch device, explore by touch or with swipe gestures.
  fr:
    placeholder: Saisissez une adresse
    label: Adresse
    srHelp: Lorsque des résultats sont disponibles, utilisez les flèches haut et bas pour les parcourir et appuyez sur Entrée pour sélectionner. Sur un appareil tactile, explorez par toucher ou avec des gestes de balayage.
</i18n>

<script setup lang="ts">
import type { VAutocomplete } from 'vuetify/components/VAutocomplete'
import { ref, watch } from 'vue'
import { ofetch } from 'ofetch'
import { useDebounceFn } from '@vueuse/core'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

defineProps({variant: String as () => VAutocomplete['variant']})
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
    const result = (await ofetch('https://data.geopf.fr/geocodage/search/', { params }))
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