import { defineNuxtPlugin } from '#app'
import { createReactiveSearchParams } from '@data-fair/lib/vue/reactive-search-params.js'

export default defineNuxtPlugin((app) => {
  app.vueApp.use(createReactiveSearchParams())
})
