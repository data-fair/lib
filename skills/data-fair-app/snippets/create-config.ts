import { computed, inject, provide, ref, type App, type Ref } from 'vue'
import type { Application, Dataset, Field } from '@data-fair/lib-common-types'
import createDFrameAdapter from '@data-fair/frame/lib/vue-reactive/state-change-adapter.js'
import reactiveSearchParams from '@data-fair/lib-vue/reactive-search-params-global.js'

export interface ConfigState {
  application: Application
  config: Ref<any>
  setConfig: (newConfig: any) => void
  notifyConfigChange: (field: string, value: unknown) => void
  dataset: Ref<Dataset | undefined>
  datasets: Ref<Dataset[]>
  fields: Ref<Record<string, Field>>
  datasetUrl: Ref<string | undefined>
  finalizedAt: Ref<string | undefined>
  accessKey: Ref<string | null>
  dFrameAdapter: ReturnType<typeof createDFrameAdapter>
  error: Ref<string | null>
}

export function createConfig () {
  const application = window.APPLICATION as Application & { href: string; apiUrl: string; wsUrl: string }
  const config = ref<any>(application?.configuration || {})

  // Dataset principal (visus simples)
  const dataset = computed(() => config.value?.datasets?.[0] as Dataset | undefined)
  // Tous les datasets (visus multi-datasets comme atelier-carto ou data-fair-metrics)
  const datasets = computed(() => config.value?.datasets || [])

  const fields = computed(() => {
    const schema = dataset.value?.schema || []
    return schema.reduce((acc: Record<string, Field>, field: Field) => {
      if (field.key) acc[field.key] = field
      return acc
    }, {})
  })

  const datasetUrl = computed(() => dataset.value?.href)
  const finalizedAt = computed(() => dataset.value?.finalizedAt)

  // AccessKey pour les liens partagés (propagation des droits aux embeds)
  const last = window.APPLICATION?.exposedUrl?.split('/').pop()
  const toks = last?.split('%3A')
  const accessKey = ref<string | null>((toks?.length === 2) ? toks[0] : null)

  // Adapter d-frame pour synchroniser les params avec les vues embarquées
  const dFrameAdapter = createDFrameAdapter(reactiveSearchParams)

  const error = computed(() => {
    if (!config.value) return 'Il n\'y a pas de configuration définie'
    if (!dataset.value) return 'Veuillez sélectionner une source de données'
    return null
  })

  function setConfig (newConfig: any) {
    config.value = newConfig
  }

  function notifyConfigChange (field: string, value: unknown) {
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'set-config',
        content: { field, value }
      }, window.location.origin)
    }
  }

  function setByPath (obj: Record<string, unknown>, path: string, value: unknown) {
    const keys = path.split('.')
    let current: any = obj
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i]
      if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {}
      } else {
        current[key] = Array.isArray(current[key]) ? [...current[key]] : { ...current[key] }
      }
      current = current[key]
    }
    current[keys[keys.length - 1]] = value
  }

  return {
    install (app: App) {
      app.provide('data-fair-app-config', {
        application,
        config,
        setConfig,
        notifyConfigChange,
        dataset,
        datasets,
        fields,
        datasetUrl,
        finalizedAt,
        accessKey,
        dFrameAdapter,
        error
      })

      window.addEventListener('message', (event) => {
        if (event.data?.type === 'set-config' && event.data?.content) {
          const { content } = event.data
          // Formats réellement émis par l'UI DataFair (application-config.vue) :
          // - UI → app : la config complète directement dans content
          // - app → UI : { field, value } (update par path)
          // La branche content.configuration est une tolérance défensive
          // (format enveloppé, jamais émis par l'UI actuelle).
          if (content.configuration) {
            config.value = content.configuration
          } else if (content.chart || content.datasets || content.layers || content.metrics) {
            // Fusionner plutôt qu'écraser : certains émetteurs n'envoient
            // qu'un sous-arbre modifié (perte des champs frères sinon).
            config.value = { ...config.value, ...content }
          } else if (content.field && 'value' in content) {
            // Update par path (ex: 'chart.colors.0')
            const newConfig = JSON.parse(JSON.stringify(config.value))
            setByPath(newConfig, content.field, content.value)
            config.value = newConfig
          }
        }
      })
    }
  }
}

export function useConfig (): ConfigState {
  const config = inject<ConfigState>('data-fair-app-config')
  if (!config) throw new Error('useConfig requires using the plugin createConfig')
  return config
}

export default useConfig
