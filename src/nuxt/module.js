import { defineNuxtModule, addPlugin, addVitePlugin, createResolver, extendViteConfig, installModule, addImports } from '@nuxt/kit'

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
    /** @type {boolean | import('@nuxtjs/i18n').ModuleOptions} */
    i18n: true,
    localeDayjs: true,
    reactiveSearchParams: true,
    /** @type {boolean | import('@nuxt/eslint').ModuleOptions} */
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

    for (const util of ['throwFatalError', 'withFatalError']) {
      addImports({
        name: util,
        from: '@data-fair/lib/nuxt/utils.js'
      })
    }

    if (moduleOptions.session) {
      addPlugin(resolve('./session/plugin.js'))
      for (const composable of ['useSession', 'useSessionAuthenticated']) {
        addImports({
          name: composable,
          from: '@data-fair/lib/vue/session.js'
        })
      }
    }
    if (moduleOptions.vuetify) {
      addPlugin(resolve('./vuetify/plugin.js'))
      const vuetifyModule = await import('vite-plugin-vuetify')

      /** @type {import('@vuetify/loader-shared').Options} */
      const defaultVuetifyModuleOptions = {}
      // building components styles in dev mode is too slow
      // comment the "if" to see the customized styles in dev mode
      if (process.env.NODE_ENV !== 'development') {
        defaultVuetifyModuleOptions.styles = { configFile: resolve('./vuetify/settings.scss') }
      }
      const vuetifyModuleOptions = typeof moduleOptions.vuetify === 'boolean'
        ? defaultVuetifyModuleOptions
        : { ...defaultVuetifyModuleOptions, ...moduleOptions.vuetify }
      addVitePlugin(vuetifyModule.default(vuetifyModuleOptions))
    }
    if (moduleOptions.reactiveSearchParams) {
      addPlugin(resolve('./reactive-search-params/plugin.js'))
      for (const composable of ['useReactiveSearchParams', 'useStringSearchParam', 'useBooleanSearchParam', 'useNumberSearchParam', 'useStringsArraySearchParam']) {
        addImports({
          name: composable,
          from: '@data-fair/lib/vue/reactive-search-params.js'
        })
      }
    }
    if (moduleOptions.i18n) {
      /** @type {import('@nuxtjs/i18n').ModuleOptions} */
      const defaultI18NModuleOptions = {
        locales: ['fr', 'en'],
        defaultLocale: 'fr',
        strategy: 'no_prefix',
        detectBrowserLanguage: {
          useCookie: true,
          cookieKey: 'i18n_lang'
        }
      }
      const i18nModuleOptions = typeof moduleOptions.i18n === 'boolean'
        ? defaultI18NModuleOptions
        : { ...defaultI18NModuleOptions, ...moduleOptions.i18n }

      await installModule('@nuxtjs/i18n', i18nModuleOptions)
    }
    if (moduleOptions.localeDayjs) {
      addPlugin(resolve('./locale-dayjs/plugin.js'))
      addImports({
        name: 'useLocaleDayjs',
        from: '@data-fair/lib/vue/locale-dayjs.js'
      })
    }
    if (moduleOptions.eslint) {
      /** @type {import('@nuxt/eslint').ModuleOptions} */
      const defaultEslintModuleOptions = {
        config: {
          stylistic: {
            commaDangle: 'never'
          }
        }
      }
      const eslintModuleOptions = typeof moduleOptions.eslint === 'boolean'
        ? defaultEslintModuleOptions
        : { ...defaultEslintModuleOptions, ...moduleOptions.eslint }
      await installModule('@nuxt/eslint', eslintModuleOptions)
    }

    addImports({
      name: 'useWS',
      from: '@data-fair/lib/vue/ws.js'
    })

    // without this hack the auto imports to our composables do not work
    // the import paths are relative instead of simply using the module name
    // and as we use exports and the export paths do not match with the physical file paths
    // these relative paths do not work
    nuxt.hook('app:templates', (tpls) => {
      for (const tpl of tpls.templates) {
        if (tpl.filename === 'types/imports.d.ts') {
          if (tpl.getContents) {
            const originalGetContents = tpl.getContents
            tpl.getContents = async (data) => {
              const contents = await originalGetContents(data)
              return contents.replace(/import\('(\.\.\/\.\.\/\.\.\/node_modules\/@data-fair\/lib)\//g, 'import(\'@data-fair/lib/')
            }
          }
        }
      }
    })
  }
})
