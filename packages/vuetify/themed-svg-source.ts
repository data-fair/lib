// Recolor an undraw / manypixels illustration with the colors of a vuetify theme.
// These illustrations are drawn for a white background, so besides the accent colors
// their dark inks and greys must follow the theme too, or they vanish on a dark surface.

type Colors = Record<string, string | undefined>

// hair, clothes, outlines
const inks = ['24285B', '2F2E41', '3F3D56', '464353', '575A89', '473F47', '3E3E54', '231F20', '282328', '010101', '020202', '606060', '606161']
// floor, background shapes, objects
const greys = ['F2F2F2', 'ECEFF1', 'EAEAEA', 'E6E6E6', 'CCCCCC', 'CCC', 'C9C9C9', 'C1C1C1', 'AFAFAF', 'A8A8A8', 'A5A5A5', 'A3A3A3', '999999', '999', '878787', '848484']
// the on-surface of the default light theme, the greys keep their value on it
const lightOnSurface = 0x42

const rgb = (hex: string) => {
  let h = hex.replace('#', '')
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16))
}

// keep the distance of a grey to white, but measured from surface towards on-surface
const relativeGrey = (grey: string, surface: string, onSurface: string) => {
  const [g] = rgb(grey)
  const ratio = Math.min(1, (255 - g) / (255 - lightOnSurface))
  const s = rgb(surface)
  const o = rgb(onSurface)
  return '#' + s.map((v, i) => Math.round(v + (o[i] - v) * ratio).toString(16).padStart(2, '0')).join('')
}

export const themeSvgSource = (source: string, colors: Colors, color = 'primary') => {
  const surface = colors.surface ?? '#FFFFFF'
  const onSurface = colors['on-surface'] ?? '#424242'
  const replacements: Record<string, string | undefined> = {
    '6C63FF': colors[color], // default undraw color
    '68E1FD': colors[color], // default manypixels color
    FFD200: colors.secondary,
    FF5252: colors.error
  }
  for (const ink of inks) replacements[ink] = colors['text-accent'] ?? onSurface
  // single pass, so a color coming from the theme is never replaced again
  return source
    .replace(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi, (match, hex: string) => {
      hex = hex.toUpperCase()
      if (greys.includes(hex)) return relativeGrey(hex, surface, onSurface)
      return replacements[hex] ?? match
    })
    .replace(/style="isolation: isolate;"/gi, 'class="isolated-svg"')
}
