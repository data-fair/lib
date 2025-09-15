import { type Colors, type Theme } from './.type/index.js'
import clone from '@data-fair/lib-utils/clone.js'
import microTemplate from '@data-fair/lib-utils/micro-template.js'
import tinycolor from 'tinycolor2'

export * from './.type/index.js'

export const defaultTheme = {
  logo: undefined,
  bodyFontFamilyCss: "@font-face{font-family:{FONT_FAMILY};font-style:italic;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXX3I6Li01BKofIMNaORs71cA-Bm_i0Dk1.woff2) format('woff2');unicode-range:U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F}@font-face{font-family:{FONT_FAMILY};font-style:italic;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXX3I6Li01BKofIMNaHRs71cA-Cznx39fA.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}@font-face{font-family:{FONT_FAMILY};font-style:italic;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXX3I6Li01BKofIMNaMRs71cA-CuWrHpFO.woff2) format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}@font-face{font-family:{FONT_FAMILY};font-style:italic;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXX3I6Li01BKofIMNaNRs71cA-D1eeM49Z.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:{FONT_FAMILY};font-style:italic;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXX3I6Li01BKofIMNaDRs4-BbMn9XSX.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}@font-face{font-family:{FONT_FAMILY};font-style:normal;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXV3I6Li01BKofIOOaBXso-BWI5zH9R.woff2) format('woff2');unicode-range:U+0460-052F,U+1C80-1C8A,U+20B4,U+2DE0-2DFF,U+A640-A69F,U+FE2E-FE2F}@font-face{font-family:{FONT_FAMILY};font-style:normal;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXV3I6Li01BKofIMeaBXso-C3IBG1kp.woff2) format('woff2');unicode-range:U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116}@font-face{font-family:{FONT_FAMILY};font-style:normal;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXV3I6Li01BKofIOuaBXso-B55YuedR.woff2) format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB}@font-face{font-family:{FONT_FAMILY};font-style:normal;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXV3I6Li01BKofIO-aBXso-DcJfvmGA.woff2) format('woff2');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}@font-face{font-family:{FONT_FAMILY};font-style:normal;font-weight:200 1000;font-display:swap;src:url({SITE_PATH}/simple-directory/fonts/XRXV3I6Li01BKofINeaB-BaTF6Vo7.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}",
  headingFontFamilyCss: undefined,
  colors: {
    // standard vuetify colors, see https://vuetifyjs.com/en/styles/colors/#material-colors
    background: '#FAFAFA', // grey-lighten-5
    'on-background': '#424242', // grey-darken-3
    surface: '#FFFFFF',
    'on-surface': '#424242', // grey-darken-3
    primary: '#1976D2', // blue-darken-2
    'on-primary': '#FFFFFF',
    'text-primary': '#1565C0',
    secondary: '#81D4FA', // light-blue-lighten-3
    'on-secondary': '#000000',
    'text-secondary': '#0277BD', // light-blue-darken-3
    accent: '#2962FF', // blue-accent-4
    'on-accent': '#FFFFFF',
    'text-accent': undefined,
    info: '#FFE0B2', // orange-lighten-4
    'on-info': '#000000',
    'text-info': '#BF4300',
    success: '#B9F6CA', // green-accent-1
    'on-success': '#000000',
    'text-success': '#2E7D32', // green-darken-3
    error: '#D50000', // red-accent-4
    'on-error': '#FFFFFF',
    'text-error': undefined,
    warning: '#D81B60', // pink-darken-1
    'on-warning': '#FFFFFF',
    'text-warning': undefined,
    admin: '#B71C1C', // red-darken-4
    'on-admin': '#FFFFFF',
    'text-admin': undefined,
  },
  dark: false,
  darkColors: {
    background: '#121212',
    'on-background': '#FFFFFF', // white
    surface: '#212121',
    'on-surface': '#FFFFFF', // white
    primary: '#1976D2', // blue-darken-2
    'on-primary': '#FFFFFF', // white
    'text-primary': '#2196F3', // blue
    secondary: '#BBDEFB', // blue-lighten-4
    'on-secondary': '#000000',
    'text-secondary': undefined,
    accent: '#2962FF', // blue-accent-1
    'on-accent': '#FFFFFF',
    'text-accent': '#82B1FF',
    error: '#D50000', // red-accent-4
    'on-error': '#FFFFFF',
    'text-error': '#FF5252', // red-accent-2
    info: '#FFE0B2',
    'on-info': '#000000',
    'text-info': undefined,
    success: '#B9F6CA', // green-accent-1
    'on-success': '#000000',
    'text-success': undefined,
    warning: '#D81B60', // pink-darken-1
    'on-warning': '#FFFFFF',
    'text-warning': '#FF4081', // pink-accent-2
    admin: '#B71C1C', // red-darken-4
    'on-admin': '#FFFFFF',
    'text-admin': '#FFCDD2'
  },
  hc: false,
  hcColors: {
    // standard vuetify colors, see https://vuetifyjs.com/en/styles/colors/#material-colors
    background: '#FFFFFF',
    'on-background': '#000000',
    surface: '#FFFFFF',
    'on-surface': '#000000',
    primary: '#0D47A1', // blue-darken-4
    'on-primary': '#FFFFFF',
    'text-primary': undefined,
    secondary: '#81D4FA', // light-blue-lighten-3
    'on-secondary': '#000000',
    'text-secondary': '#01579B', // light-blue-darken-3
    accent: '#1d44b3', // blue-accent-4
    'on-accent': '#FFFFFF',
    'text-accent': undefined,
    info: '#FFE0B2', // orange-lighten-4
    'on-info': '#000000',
    'text-info': '#993500',
    success: '#B9F6CA', // green-accent-1
    'on-success': '#000000',
    'text-success': '#1B5E20', // green-darken-4
    error: '#b30000',
    'on-error': '#FFFFFF',
    'text-error': undefined,
    warning: '#880E4F', // pink-darken-4
    'on-warning': '#FFFFFF',
    'text-warning': undefined,
    admin: '#b30000',
    'on-admin': '#FFFFFF',
    'text-admin': undefined,
  },
  hcDark: false,
  hcDarkColors: {
    background: '#121212',
    'on-background': '#FFFFFF', // white
    surface: '#121212',
    'on-surface': '#FFFFFF', // white
    primary: '#0D47A1', // blue-darken-4
    'on-primary': '#FFFFFF', // white
    'text-primary': '#42A5F5', // blue-lighten-1
    secondary: '#BBDEFB', // blue-lighten-4
    'on-secondary': '#000000',
    'text-secondary': undefined,
    accent: '#1d44b3', // blue-accent-1
    'on-accent': '#FFFFFF',
    'text-accent': '#82B1FF',
    error: '#b30000',
    'on-error': '#FFFFFF',
    'text-error': '#FF8A80', // red-accent-1
    info: '#FFE0B2',
    'on-info': '#000000',
    'text-info': undefined,
    success: '#B9F6CA', // green-accent-1
    'on-success': '#000000',
    'text-success': undefined,
    warning: '#880E4F', // pink-darken-4
    'on-warning': '#FFFFFF',
    'text-warning': '#FF80AB', // pink-accent-1
    admin: '#b30000',
    'on-admin': '#FFFFFF',
    'text-admin': '#FFCDD2'
  },
}

export const getTextColorsCss = (colors: Colors, theme: string) => {
  let css = ''
  for (const color of ['primary', 'secondary', 'accent', 'error', 'info', 'success', 'warning', 'admin']) {
    const key = `text-${color}` as keyof Colors
    if (colors[key]) {
      css += `
.v-theme--${theme} .text-${color}:not(.v-btn--disabled) { color: ${colors[key]}!important; }`
    }
  }
  return css
}

export const getReadableColor = (baseColor: string, bgColors: string [], darkMode: boolean, level: 'AA' | 'AAA') => {
  const c = tinycolor(baseColor)
  while (!bgColors.every(bgColor => tinycolor.isReadable(c, bgColor, { level, size: 'small' }))) {
    if (darkMode) {
      if (c.getBrightness() === 255) break
      c.brighten(1)
    } else {
      if (c.getBrightness() === 0) break
      c.darken(1)
    }
  }
  return c.toHexString()
}

export const getOnColor = (color: string) => {
  // priority to white text if it is readable
  if (tinycolor.isReadable(color, '#FFFFFF', { level: 'AA', size: 'small' })) return '#FFFFFF'
  return tinycolor.mostReadable(color, ['#000000', '#FFFFFF']).toHexString()
}

export const fillTheme = (theme: Theme, defaultTheme: Theme) => {
  const fullTheme = clone(theme)
  if (fullTheme.assistedMode && fullTheme.assistedModeColors) {
    if (!defaultTheme.darkColors) throw new Error('darkColors is missing in default theme')
    if (!defaultTheme.hcColors) throw new Error('hcColors is missing in default theme')
    if (!defaultTheme.hcDarkColors) throw new Error('hcDarkColors is missing in default theme')
    fullTheme.assistedModeColors.primary = fullTheme.assistedModeColors.primary ?? fullTheme.colors.primary
    fullTheme.assistedModeColors.secondary = fullTheme.assistedModeColors.secondary ?? fullTheme.colors.secondary
    fullTheme.assistedModeColors.accent = fullTheme.assistedModeColors.accent ?? fullTheme.colors.accent
    fullTheme.colors = clone(defaultTheme.colors)
    fullTheme.darkColors = clone(defaultTheme.darkColors)
    fullTheme.hcColors = clone(defaultTheme.hcColors)
    fullTheme.hcDarkColors = clone(defaultTheme.hcDarkColors)
    const customColors = {
      primary: fullTheme.assistedModeColors.primary,
      secondary: fullTheme.assistedModeColors.secondary,
      accent: fullTheme.assistedModeColors.accent,
      'on-primary': getOnColor(fullTheme.assistedModeColors.primary),
      'on-secondary': getOnColor(fullTheme.assistedModeColors.secondary),
      'on-accent': getOnColor(fullTheme.assistedModeColors.accent)
    }

    Object.assign(fullTheme.colors, customColors)
    Object.assign(fullTheme.darkColors, customColors)
    Object.assign(fullTheme.hcColors, customColors)
    Object.assign(fullTheme.hcDarkColors, customColors)
    fullTheme.colors['text-primary'] = getReadableColor(fullTheme.colors.primary, [fullTheme.colors.background, fullTheme.colors.surface], false, 'AA')
    fullTheme.colors['text-secondary'] = getReadableColor(fullTheme.colors.secondary, [fullTheme.colors.background, fullTheme.colors.surface], false, 'AA')
    fullTheme.colors['text-accent'] = getReadableColor(fullTheme.colors.accent, [fullTheme.colors.background, fullTheme.colors.surface], false, 'AA')
    fullTheme.darkColors['text-primary'] = getReadableColor(fullTheme.colors.primary, [fullTheme.darkColors.background, fullTheme.darkColors.surface], true, 'AA')
    fullTheme.darkColors['text-secondary'] = getReadableColor(fullTheme.colors.secondary, [fullTheme.darkColors.background, fullTheme.darkColors.surface], true, 'AA')
    fullTheme.darkColors['text-accent'] = getReadableColor(fullTheme.colors.accent, [fullTheme.darkColors.background, fullTheme.darkColors.surface], true, 'AA')
    fullTheme.hcColors['text-primary'] = getReadableColor(fullTheme.colors.primary, [fullTheme.hcColors.background, fullTheme.hcColors.surface], false, 'AAA')
    fullTheme.hcColors['text-secondary'] = getReadableColor(fullTheme.colors.secondary, [fullTheme.hcColors.background, fullTheme.hcColors.surface], false, 'AAA')
    fullTheme.hcColors['text-accent'] = getReadableColor(fullTheme.colors.accent, [fullTheme.hcColors.background, fullTheme.hcColors.surface], false, 'AAA')
    fullTheme.hcDarkColors['text-primary'] = getReadableColor(fullTheme.colors.primary, [fullTheme.hcDarkColors.background, fullTheme.hcDarkColors.surface], true, 'AAA')
    fullTheme.hcDarkColors['text-secondary'] = getReadableColor(fullTheme.colors.secondary, [fullTheme.hcDarkColors.background, fullTheme.hcDarkColors.surface], true, 'AAA')
    fullTheme.hcDarkColors['text-accent'] = getReadableColor(fullTheme.colors.accent, [fullTheme.hcDarkColors.background, fullTheme.hcDarkColors.surface], true, 'AAA')
  } else {
    fullTheme.assistedModeColors = {
      primary: fullTheme.colors.primary,
      secondary: fullTheme.colors.secondary,
      accent: fullTheme.colors.accent,
    }
  }
  // vuetify is sensitive to undefined keys, better to delete them
  for (const key of Object.keys(fullTheme.colors) as (keyof Colors)[]) {
    if (fullTheme.colors[key] === undefined) delete fullTheme.colors[key]
  }
  if (fullTheme.darkColors) {
    for (const key of Object.keys(fullTheme.darkColors) as (keyof Colors)[]) {
      if (fullTheme.darkColors[key] === undefined) delete fullTheme.darkColors[key]
    }
  }
  if (fullTheme.hcColors) {
    for (const key of Object.keys(fullTheme.hcColors) as (keyof Colors)[]) {
      if (fullTheme.hcColors[key] === undefined) delete fullTheme.hcColors[key]
    }
  }
  if (fullTheme.hcDarkColors) {
    for (const key of Object.keys(fullTheme.hcDarkColors) as (keyof Colors)[]) {
      if (fullTheme.hcDarkColors[key] === undefined) delete fullTheme.hcDarkColors[key]
    }
  }
  return fullTheme as Required<Pick<Theme, 'darkColors' | 'hcColors' | 'hcDarkColors'>> & Theme
}

const messages: Record<string, Record<string, string>> = {
  fr: {
    'theme.default': 'par défaut',
    'theme.dark': 'sombre',
    'theme.hc': 'à contraste élevé',
    'theme.hcDark': 'sombre à contraste élevé',
    readableWarning: 'la couleur {colorName} ({colorCode}) du thème {themeName} n\'est pas suffisamment lisible par dessus la couleur {bgColorName} ({bgColorCode})',
    authProvider: 'du fournisseur d\'identité {title}',
    white: 'blanche',
    text: 'de texte',
    background: 'd\'arrière plan',
    surface: 'de surface',
    primary: 'primaire',
    'text-primary': 'texte primaire',
    secondary: 'secondaire',
    'text-secondary': 'texte secondaire',
    accent: 'accentuée',
    'text-accent': 'texte accentué',
    error: 'd\'erreur',
    'text-error': 'texte d\'erreur',
    warning: 'd\'avertissement',
    'text-warning': 'texte d\'avertissement',
    success: 'de succès',
    'text-success': 'texte de succès',
    info: 'd\'information',
    'text-info': 'texte d\'information',
    admin: 'd\'administration',
    'text-admin': 'texte d\'administration',
  },
  en: {
    'theme.default': 'default',
    'theme.dark': 'dark',
    'theme.hc': 'high contrast',
    'theme.hcDark': 'high contrast dark',
    readableWarning: 'the {colorName} color ({colorCode}) of {themeName} theme is not sufficiently readable over the {bgColorName} color ({bgColorCode})',
    authProvider: 'auth provider {title}',
    white: 'white',
    text: 'text',
    background: 'background',
    surface: 'surface',
    primary: 'primary',
    'text-primary': 'primary text',
    secondary: 'secondary',
    'text-secondary': 'secondary text',
    accent: 'accent',
    'text-accent': 'accent text',
    error: 'error',
    'text-error': 'error text',
    warning: 'warning',
    'text-warning': 'warning text',
    success: 'success',
    'text-success': 'success text',
    info: 'info',
    'text-info': 'info text',
    admin: 'admin',
    'text-admin': 'admin text'
  }
}

const getMessage = (locale: 'en' | 'fr', messageKey: string, params: Record<string, string> = {}) => {
  return microTemplate(messages[locale][messageKey] as string, params)
}

function readableWarning (readableOptions: tinycolor.WCAG2Options, locale: 'en' | 'fr', colorCode: string | undefined, colorName: string, bgColorCode: string | undefined, bgColorName: string, themeName: string) {
  if (!colorCode || !bgColorCode) return
  if (!tinycolor.isReadable(colorCode, bgColorCode, readableOptions)) {
    return getMessage(locale, 'readableWarning', { colorCode, colorName: getMessage(locale, `${colorName}`), bgColorCode, bgColorName: getMessage(locale, `${bgColorName}`), themeName: getMessage(locale, `theme.${themeName}`) })
  }
}

export function getColorsWarnings (locale: 'en' | 'fr', colors: Colors, themeName: string, readableOptions: tinycolor.WCAG2Options): string[] {
  if (locale !== 'fr' && locale !== 'en') locale = 'en'
  const warnings: (string | undefined)[] = []
  for (const color of ['primary', 'secondary', 'accent', 'info', 'success', 'error', 'warning', 'admin']) {
    const textColor = colors[`text-${color}` as keyof Colors] ?? colors[color as keyof Colors]
    warnings.push(readableWarning(readableOptions, locale, textColor, `text-${color}`, colors.background, 'background', themeName))
    warnings.push(readableWarning(readableOptions, locale, textColor, `text-${color}`, colors.surface, 'surface', themeName))
  }
  for (const color of ['background', 'surface', 'primary', 'secondary', 'accent', 'info', 'success', 'error', 'warning', 'admin']) {
    warnings.push(readableWarning(readableOptions, locale, colors[`on-${color}` as keyof Colors], 'text', colors[color as keyof Colors], color, themeName))
  }
  return warnings.filter(w => w !== undefined)
}

export const readableOptions: tinycolor.WCAG2Options = { level: 'AA', size: 'small' }
export const hcReadableOptions: tinycolor.WCAG2Options = { level: 'AAA', size: 'small' }

export function getSiteColorsWarnings (locale: 'en' | 'fr', theme: Theme, authProviders?: { title?: string, color?: string }[]): string[] {
  if (locale !== 'fr' && locale !== 'en') locale = 'en'
  let warnings: (string | undefined)[] = getColorsWarnings(locale, theme.colors, 'default', readableOptions)
  if (theme.dark && theme.darkColors) warnings = warnings.concat(getColorsWarnings(locale, theme.darkColors, 'dark', readableOptions))
  if (theme.hc && theme.hcColors) warnings = warnings.concat(getColorsWarnings(locale, theme.hcColors, 'hc', hcReadableOptions))
  if (theme.hcDark && theme.hcDarkColors) warnings = warnings.concat(getColorsWarnings(locale, theme.hcDarkColors, 'hcDark', hcReadableOptions))
  if (authProviders) {
    for (const p of authProviders) {
      if (p.color && p.title) {
        if (!tinycolor.isReadable('#FFFFFF', p.color, readableOptions)) {
          warnings.push(getMessage(locale, 'readableWarning', { colorCode: '#FFFFFF', colorName: getMessage(locale, 'colors.white'), bgColorCode: p.color, bgColorName: getMessage(locale, 'colors.authProvider', { title: p.title }) }))
        }
      }
    }
  }
  return warnings.filter(w => w !== undefined)
}
