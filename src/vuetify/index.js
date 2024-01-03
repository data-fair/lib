import { fr, en } from 'vuetify/locale'

/**
 * @param {Record<string, string>} [searchParams]
 * @returns {import('vuetify').VuetifyOptions}
 */
export const defaultOptions = (searchParams) => {
  return {
    ssr: false,
    locale: {
      locale: 'fr',
      messages: { fr, en }
    }, // TODO: sync this with the i18n locale
    theme: {
      defaultTheme: 'light',
      themes: {
        light: {
          dark: false,
          colors: {
            primary: searchParams?.primary || '#1E88E5', // blue.darken1
            secondary: searchParams?.secondary || '#42A5F5', // blue.lighten1,
            accent: '#FF9800', // orange.base
            error: '#FF5252', // red.accent2
            info: '#2196F3', // blue.base
            success: '#4CAF50', // green.base
            warning: '#E91E63', // pink.base
            admin: '#E53935' // red.darken1
          }
        }
      }
    }
  }
}
