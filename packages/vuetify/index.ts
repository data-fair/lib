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

export function defaultOptions (searchParams: Record<string, string>, darkCookie = false):VuetifyOptions {
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
      locale: 'fr',
      messages: { fr, en }
    }, // TODO: sync this with the i18n locale
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
