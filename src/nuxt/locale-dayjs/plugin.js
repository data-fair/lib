import { defineNuxtPlugin } from '#app'
import { createLocaleDayjs } from '@data-fair/lib/vue/locale-dayjs.js'

export default defineNuxtPlugin((app) => {
  app.vueApp.use(createLocaleDayjs(app.$i18n?.locale))
})
