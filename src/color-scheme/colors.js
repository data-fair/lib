import chroma from 'chroma-js'

// TODO: replace this with a vjsf component so that chroma-js is loaded only once at config time and not at runtime by the app

/**
 * Generate a greyscale palette
 * @param {number} start - The starting value for the greyscale palette.
 * @param {number} end - The ending value for the greyscale palette.
 * @param {number} steps - The number of steps between the start and end values.
 * @returns {Array<string>} - An array of hex values representing the greyscale palette.
 */
function generateGreyscale (start, end, steps) {
  const greyscale = []
  for (let i = start; i <= end; i++) {
    const lightness = Math.round((i / steps) * 255)
    greyscale.push(chroma(`rgb(${lightness},${lightness},${lightness})`).hex())
  }
  return greyscale
}

/**
 * Generates a dynamic color palette based on the given base colors, palette type, and size.
 * @param {Array<string>} baseColors - The base colors to generate the palette from.
 * @param {string} paletteType - The type of palette to generate ('hues' or 'complementary').
 * @param {number} size - The desired size of the palette.
 * @returns {Array<string>} - The generated color palette.
 */
function generateDynamicPalette (baseColors, paletteType, size) {
  let /** @type {Array<string>} */ colors = []
  if (paletteType === 'hues') {
    const /** @type {Array<Array<string>>} */ hues = []
    const length = Math.floor(size / baseColors.length)
    baseColors.forEach(baseColor => {
      hues.push(generateHuesFromColor(baseColor, length + 1))
    })
    for (let i = 0; i < length + 1; i++) {
      hues.forEach(hue => {
        colors.push(hue[i])
      })
    }
  } else if (paletteType === 'complementary') {
    const/** @type {Array<Array<string>>} */ generatedColors = []
    const length = Math.floor(size / baseColors.length)
    baseColors.forEach(baseColor => {
      generatedColors.push(generatePaletteFromColor(baseColor, length + 1))
    })
    for (let i = 0; i < length + 1; i++) {
      generatedColors.forEach(color => {
        colors.push(color[i])
      })
    }
  }

  colors = [...new Set(colors)]
  if (colors.length > size) {
    colors = colors.slice(0, size)
  } else {
    const numGreyscaleColors = size - colors.length
    const start = 0
    const end = numGreyscaleColors - 1
    const steps = numGreyscaleColors
    const greyscaleColors = generateGreyscale(start, end, steps)
    colors = colors.concat(greyscaleColors)
  }

  return colors
}

/**
 * Generates a palette of colors based on the given colorscheme and data.
 * @param {Record<string, any>} colorscheme - The colorscheme to generate the palette from.
 * @param {Record<string, any>} data - The data used to generate the palette.
 * @param {number} numColors - The number of colors to generate in the palette. Default is 10.
 * @returns {Array<string>} - An array of color strings representing the generated palette.
 */
function generatePalette (colorscheme, data, numColors = 10) {
  if (colorscheme.type === 'manual') {
    return Object.assign({}, ...colorscheme.styles.map(s => ({ [s.value]: s.color })))
  }
  if (colorscheme.type !== 'custom') {
    let set = ''
    if (colorscheme.type === 'qualitative') {
      const paletteSets = ['Set1', 'Set2', 'Set3', 'Dark2', 'Paired', 'Accent', 'Pastel1', 'Pastel2']
      set = paletteSets.includes(colorscheme.qualitativeName) ? colorscheme.qualitativeName : 'Accent'
    } else if (colorscheme.type === 'diverging') {
      const paletteSets = ['Spectral', 'RdYlBu', 'RdYlGn', 'BrBG', 'PiYG', 'PRGn', 'PuOr', 'RdBu', 'RdGy']
      set = paletteSets.includes(colorscheme.divergingName) ? colorscheme.divergingName : 'RdYlGn'
    } else if (colorscheme.type === 'sequential') {
      const paletteSets = ['Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds', 'BuGn', 'BuPu', 'GnBu', 'OrRd', 'PuBuGn', 'PuBu', 'PuRd', 'RdPu', 'YlGnBu', 'YlGn', 'YlOrBr', 'YlOrRd']
      set = paletteSets.includes(colorscheme.sequentialName) ? colorscheme.sequentialName : 'YlOrRd'
    }
    return chroma.scale(set).mode('lch').colors(numColors)
  }
  const set = []
  if (data.aggs) {
    data.aggs.forEach(/** @type {Record<string, any>} */ value => {
      if (value.aggs) {
        value.aggs.forEach(/** @type {Record<string, any>} */ val2 => {
          set.push(colorscheme.colors.find(/** @type {Record<string, string>} */ c => c.value === val2.value.toString())?.color || colorscheme.defaultColor)
        })
      } else {
        set.push(colorscheme.defaultColor)
      }
    })
  } else {
    set.push(colorscheme.defaultColor)
  }
  return set
}

/**
 * Generates an array of hues based on the given color and number of colors.
 * @param {string} colorHex - The hexadecimal representation of the base color.
 * @param {number} numColors - The number of hues to generate. Default is 10.
 * @returns {Array<string>} - An array of hexadecimal color values representing the generated hues.
 */
function generateHuesFromColor (colorHex, numColors = 10) {
  const baseColor = chroma(colorHex)
  const colors = [baseColor.hex()]
  for (let i = 1; i < numColors; i++) {
    const color = baseColor.set('hsl.l', '*' + (1 + i / numColors)).saturate(1)
    colors.push(color.hex())
  }

  return colors
}

/**
 * Generates a palette of colors based on the given color and number of colors.
 * @param {string} colorHex - The hexadecimal representation of the base color.
 * @param {number} numColors - The number of colors to generate in the palette. Default is 10.
 * @returns {Array<string>} - An array of hexadecimal color values representing the generated palette.
 */
function generatePaletteFromColor (colorHex, numColors = 10) {
  const baseColor = chroma(colorHex)
  let colors = [baseColor.hex()]

  const complementaryColor = baseColor.set('hsl.h', '+180')
  colors.push(complementaryColor.hex())

  for (let i = 1; i <= Math.floor((numColors - 2) / 2); i++) {
    const analogousColor1 = baseColor.set('hsl.h', `+${i * 30}`)
    const analogousColor2 = baseColor.set('hsl.h', `-${i * 30}`)
    colors.push(analogousColor1.hex(), analogousColor2.hex())
  }

  if (colors.length < numColors) {
    const triadicColor1 = baseColor.set('hsl.h', '+120')
    const triadicColor2 = baseColor.set('hsl.h', '-120')
    colors.push(triadicColor1.hex(), triadicColor2.hex())
  }

  colors = colors.slice(0, numColors)

  return colors
}

/**
 * Generates an array of colors based on the given colorscheme, data, size, and optional vuetifyColors.
 * @param {Record<string, any>} colorscheme - The colorscheme object.
 * @param {Record<string, any>} data - The data object.
 * @param {number} size - The size of the color array to generate.
 * @param {Record<string, string> | null} vuetifyColors - Optional vuetifyColors object.
 * @returns {Array<string>} - The generated array of colors.
 */
function getColors (colorscheme, data, size, vuetifyColors = null) {
  if (colorscheme.type === 'vuetify-theme' && vuetifyColors) {
    const baseColors = [vuetifyColors.primary, vuetifyColors.secondary]

    if (colorscheme.generatePalette) {
      return generateDynamicPalette(baseColors, colorscheme.paletteType, size)
    } else {
      return baseColors.slice(0, size)
    }
  }

  const colors = generatePalette(colorscheme, data, size)
  if (colorscheme.reverse) colors.reverse()
  const greyscaleColors = generateGreyscale(0, size - colors.length - 1, size - colors.length)
  return colors.concat(greyscaleColors)
}

export { generateGreyscale, generateDynamicPalette, generateHuesFromColor, generatePaletteFromColor }
export default getColors
