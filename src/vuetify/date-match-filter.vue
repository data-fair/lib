<!-- produces a string compatible with the _c_date_match filter of data-fair -->

<template>
  <v-menu
    v-model="menu"
    :close-on-content-click="false"
    offset-y
    min-width="auto"
  >
    <template #activator="{ props }">
      <v-btn
        v-model="date"
        icon
        color="white"
        density="comfortable"
        class="mx-1 mt-1"
        v-bind="props"
      >
        <v-icon color="primary">
          mdi-calendar
        </v-icon>
      </v-btn>
    </template>
    <v-sheet>
      <h3
        v-if="rangeMode"
        class="text-h6 px-2"
      >
        Sélectionnez un interval entre 2 dates
      </h3>
      <h3
        v-else
        class="text-h6 px-2"
      >
        Sélectionnez une date
      </h3>
      <v-date-picker
        v-model="date"
        :multiple="rangeMode"
        hide-header
        show-adjacent-months
        flat
      />
    </v-sheet>
  </v-menu>
</template>

<script>
// 1 => 01, 12 => 12
const padTimeComponent = (/** @type {number} */val) => {
  const s = '' + val
  return s.length === 1 ? '0' + s : s
}

// get the the date and short time components expected by date-time picker from a full date
// 2020-04-03T21:07:43+02:00 => ['2020-04-03', '19:07']
const getDateTimeParts = (/** @type {Date} */date) => {
  return [`${date.getFullYear()}-${padTimeComponent(date.getMonth() + 1)}-${padTimeComponent(date.getDate())}`, `${padTimeComponent(date.getHours())}:${padTimeComponent(date.getMinutes())}`]
}

export default {
  props: {
    modelValue: {
      type: String,
      default: null
    },
    rangeMode: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  data: () => ({
    menu: false
  }),
  computed: {
    date: {
      /**
       * @returns {Date | Date[] | null}
       */
      get () {
        if (!this.modelValue) return null
        if (this.rangeMode) return this.modelValue.split(',').map(v => new Date(v))
        return this.modelValue ? new Date(this.modelValue) : null
      },
      /**
       * @param {Date | Date[]} value
       */
      set (value) {
        console.log('SET', value)
        if (Array.isArray(value)) {
          const dates = value.map(v => getDateTimeParts(v)[0])
          dates.sort()
          const newValue = dates[0] + ',' + dates[dates.length - 1]
          if (newValue !== this.modelValue) {
            this.$emit('update:modelValue', dates[0] + ',' + dates[dates.length - 1])
            if (dates.length >= 2) this.menu = false
          }
        } else {
          const newValue = getDateTimeParts(value)[0] === this.modelValue ? undefined : getDateTimeParts(value)[0]
          this.$emit('update:modelValue', newValue)
          this.menu = false
        }
      }
    }
  }
}
</script>

<style lang="css">
</style>
