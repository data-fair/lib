<!-- inspired by https://github.com/vuetifyjs/vuetify/blob/8bb752b210d25fbebcea12cd073d2ce4986f5e12/packages/docs/src/layouts/default/FabToTop.vue -->

<template>
  <v-fab-transition>
    <v-btn
      v-show="show"
      :title="t('scrollToTop')"
      color="primary"
      fixed
      style="z-index: 6; position: absolute; right: 24px; bottom: 24px;"
      :icon="mdiChevronUp"
      @click="toTop"
    />
  </v-fab-transition>
</template>

<i18n lang="yaml">
  en:
    scrollToTop: 'Scroll to top'
  fr:
    scrollToTop: 'Remonter au début de la page'
</i18n>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { mdiChevronUp } from '@mdi/js'
import { useI18n } from 'vue-i18n'
import { useGoTo } from 'vuetify'

const { selector } = defineProps({ selector: { type: String, required: false, default: '.v-main__scroller' } })

const route = useRoute()
const router = useRouter()
const goTo = useGoTo()
const { t } = useI18n()

let _scrollElement: Element | Window | null
const show = ref(false)

const onScroll: EventListener = (e: any) => {
  const top = selector ? e.target.scrollTop : (window.pageYOffset || document.documentElement.offsetTop || 0)
  show.value = top > 300
}

onMounted(async () => {
  _scrollElement = selector ? document.querySelector(selector) : window
  if (!_scrollElement) console.error(`[scroll-to-top] selector ${selector} not found`)
  else _scrollElement.addEventListener('scroll', onScroll)
})

onUnmounted(() => {
  if (_scrollElement) _scrollElement.removeEventListener('scroll', onScroll)
})

const toTop = () => {
  if (selector) {
    _scrollElement?.scrollTo({ top: 0, left: 0, behavior: 'smooth' })
  } else {
    if (route.hash) router.push({ hash: '' })
    goTo(0)
  }
}
</script>
