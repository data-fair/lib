import { defineNuxtPlugin } from '#app'
import { useRoute } from '#imports'
import { createSession } from '@data-fair/lib/vue/session.js'

export default defineNuxtPlugin(async (nuxtApp) => {
  nuxtApp.vueApp.use(await createSession({ req: nuxtApp.ssrContext?.event.node.req, route: useRoute() }))
})
