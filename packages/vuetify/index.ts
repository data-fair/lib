import { type Session } from '@data-fair/lib-vue/session.js'
import { VuetifyOptions } from 'vuetify'
import { fr, en } from 'vuetify/locale'

const baseColors = {
  primary: '#1E88E5', // blue.darken1
  secondary: '#42A5F5', // blue.lighten1,
  accent: '#FF9800', // orange.base
  error: '#FF5252', // red.accent2
  info: '#2196F3', // blue.base
  success: '#4CAF50', // green.base
  warning: '#E91E63', // pink.base
  admin: '#E53935' // red.darken1
}
const baseDarkColors = {
  primary: '#2196F3', // blue.base
  success: '#00E676' // green.accent3
}

export function vuetifySessionOptions (session: Session): VuetifyOptions {
  const colors = { ...baseColors, ...session.site.value?.colors }
  return {
    ssr: false,
    locale: {
      locale: session.lang.value,
      messages: { fr, en }
    },
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          dark: false,
          colors
        }
      }
    },
    defaults: {
      VCard: {
        // grey outlined card by default
        variant: 'outlined',
        // TODO: replace this with a cleaner border-opacity prop https://vuetifyjs.com/en/styles/borders/#theme-colors ?
        style: 'border-color: rgba(var(--v-theme-on-surface), var(--v-focus-opacity)) !important;'
      }
    }
  }
}

// TODO: deprecate this in favor of sessionVuetifyOptions
export function defaultOptions (searchParams: Record<string, string>, darkCookie = false, locale: string = 'fr'):VuetifyOptions {
  console.warn('vuetify.defaultOptions is deprecated, use sessionVuetifyOptions')

  const dark = searchParams?.dark ? searchParams.dark === 'true' : darkCookie

  const searchParamsColors: Record<string, string> = {}
  for (const colorCode of ['primary', 'secondary']) {
    if (searchParams?.[colorCode]) searchParamsColors[colorCode] = searchParams[colorCode]
  }

  const lightColors = { ...baseColors, ...searchParamsColors }
  const darkColors = { ...baseColors, ...baseDarkColors, ...searchParamsColors }

  const defaultTheme = dark ? 'dark' : 'light'

  return {
    ssr: false,
    locale: {
      locale,
      messages: { fr, en }
    },
    theme: {
      defaultTheme,
      themes: {
        light: {
          dark: false,
          colors: lightColors
        },
        dark: {
          dark: true,
          colors: darkColors
        }
      }
    },
    defaults: {
      VCard: {
        // grey outlined card by default
        variant: 'outlined',
        style: 'border-color: rgba(var(--v-theme-on-surface), var(--v-focus-opacity)) !important;'
      }
    }
  }
}
