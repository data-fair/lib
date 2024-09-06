import { defineNuxtModule, addPlugin, addVitePlugin, createResolver, extendViteConfig, installModule, addImports } from '@nuxt/kit'

const defaultVuetifyModuleOptions = {
  autoImport: true,
  styles: { configFile: new URL('vuetify/settings.scss', import.meta.url).pathname }
}

const defaultI18NModuleOptions = {
  locales: ['fr', 'en'],
  defaultLocale: 'fr',
  strategy: 'no_prefix',
  detectBrowserLanguage: {
    useCookie: true,
    cookieKey: 'i18n_lang'
  }
}

const defaultEslintModuleOptions = {
  config: {
    stylistic: {
      commaDangle: 'never'
    }
  }
}

export default defineNuxtModule({
  meta: {
    name: '@data-fair/lib/nuxt.js',
    configKey: 'dataFairLib',
    compatibility: {
      nuxt: '>=3.0.0'
    }
  },
  defaults: {
    session: true,
    /** @type {boolean | object} */
    vuetify: true,
    /** @type {boolean | object} */
    i18n: true,
    localeDayjs: true,
    reactiveSearchParams: true,
    /** @type {boolean | object} */
    eslint: true
  },
  hooks: {},
  async setup (moduleOptions, nuxt) {
    // Create resolver to resolve relative paths
    const { resolve } = createResolver(import.meta.url)

    extendViteConfig(async (config) => {
      config.optimizeDeps = config.optimizeDeps ?? {}
      config.optimizeDeps.include = config.optimizeDeps.include ?? []
      config.optimizeDeps.include.push('debug')
      config.optimizeDeps.include.push('cookie')

      if (moduleOptions.localeDayjs) {
        config.optimizeDeps.include.push('dayjs')
        config.optimizeDeps.include.push('dayjs/locale/en')
        config.optimizeDeps.include.push('dayjs/locale/fr')
        config.optimizeDeps.include.push('dayjs/plugin/localizedFormat.js')
        config.optimizeDeps.include.push('dayjs/plugin/relativeTime.js')
      }
    })

    if (moduleOptions.vuetify) {
      nuxt.options.build.transpile.push('vuetify')

      nuxt.options.vite.vue = nuxt.options.vite.vue ?? {}
      nuxt.options.vite.vue.template = nuxt.options.vite.vue.template ?? {}
      const vuetifyModule = await import('vite-plugin-vuetify')
      nuxt.options.vite.vue.template.transformAssetUrls = vuetifyModule.transformAssetUrls
    }

    await installModule('@nuxtjs/google-fonts', { families: { Nunito: true } })

    if (moduleOptions.session) {
      console.log(resolve('../../types/vue/session.d.ts'))
      addPlugin(resolve('./session/plugin.js'))
      addImports({
        name: 'useSession',
        as: 'useSession',
        from: '@data-fair/lib/vue/session.js'
      })
    }
    if (moduleOptions.vuetify) {
      addPlugin(resolve('./vuetify/plugin.js'))
      const vuetifyModule = await import('vite-plugin-vuetify')
      const vuetifyModuleOptions = typeof moduleOptions.vuetify === 'boolean'
        ? defaultVuetifyModuleOptions
        : { ...defaultVuetifyModuleOptions, ...moduleOptions.vuetify }
      addVitePlugin(vuetifyModule.default(vuetifyModuleOptions))
    }
    if (moduleOptions.reactiveSearchParams) {
      addPlugin(resolve('./reactive-search-params/plugin.js'))
      addImports({
        name: 'useReactiveSearchParams',
        as: 'useReactiveSearchParams',
        from: '@data-fair/lib/vue/reactive-search-params.js'
      })
    }
    if (moduleOptions.i18n) {
      const i18nModuleOptions = typeof moduleOptions.i18n === 'boolean'
        ? defaultI18NModuleOptions
        : { ...defaultI18NModuleOptions, ...moduleOptions.i18n }
      await installModule('@nuxtjs/i18n', i18nModuleOptions)
    }
    if (moduleOptions.localeDayjs) {
      addPlugin(resolve('./locale-dayjs/plugin.js'))
      addImports({
        name: 'useLocaleDayjs',
        as: 'useLocaleDayjs',
        from: '@data-fair/lib/vue/locale-dayjs.js'
      })
    }
    if (moduleOptions.eslint) {
      const eslintModuleOptions = typeof moduleOptions.eslint === 'boolean'
        ? defaultEslintModuleOptions
        : { ...defaultEslintModuleOptions, ...moduleOptions.eslint }
      await installModule('@nuxt/eslint', eslintModuleOptions)
    }
  }
})
