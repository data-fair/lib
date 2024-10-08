<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps({
  min: { type: String, default: undefined },
  max: { type: String, default: undefined },
  label: { type: String, default: undefined }
})

const model = defineModel({ type: String })
const initialValue = (model.value || '').split(',')
const start = ref((initialValue.length && initialValue[0]) || props.min)
const end = ref((initialValue.length && initialValue[initialValue.length - 1]) || props.max)

watch(model, (val) => {
  const value = (val || '').split(',')
  start.value = value.length ? value[0] : undefined
  end.value = value.length ? value[value.length - 1] : undefined
})

watch(start, (val) => {
  const value = [end.value]
  if (val !== end.value) value.unshift(val)
  model.value = value.join(',')
})

watch(end, (val) => {
  const value = [start.value]
  if (val !== start.value) value.push(val)
  model.value = value.join(',')
})
</script>

<template>
  <label
    v-if="props.label"
    class="text-body-2 text-medium-emphasis ml-2"
  >{{ label }}</label>
  <v-row
    v-if="model && model.length"
    class="date-range-picker"
    align="center"
  >
    <v-col class="pr-0">
      <v-text-field
        v-model="start"
        :min="min"
        :max="max"
        type="date"
        density="compact"
      />
    </v-col>
    <span class="pb-6">~</span>
    <v-col class="pl-0">
      <v-text-field
        v-model="end"
        :min="min"
        :max="max"
        type="date"
        density="compact"
      />
    </v-col>
  </v-row>
</template>

<style>
.date-range-picker .v-input__control input{
  padding-left: 8px;
  padding-right: 8px;
}

.date-range-picker .v-input__control label{
  left: -8px;
  right: -8px;
}
</style>
