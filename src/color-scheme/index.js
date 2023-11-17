import palette from 'google-palette'

// TODO: replace this with a vjsf component so that google-palette is loaded only once at config time
// and not at runtime by the app

/**
 * @param {import('./.type/index.js').PaletteDeCouleur} colorscheme
 * @param {string[]} nodes
 * @returns {Record<string, string>}
 */
export default (colorscheme, nodes) => {
  if (!colorscheme) return Object.assign({}, ...nodes.map(n => ({ [n]: '#DDDDDD' })))
  if (colorscheme.type === 'manual') return Object.assign({}, ...colorscheme.styles.map(s => ({ [s.value]: s.color })))
  const typeMax = {
    qualitative: 8,
    diverging: 11,
    sequential: 9
  }
  let offset = 0
  if (colorscheme.subset && colorscheme.subset !== 'all') offset = typeMax[colorscheme.type] - nodes.length
  let colors = palette('cb-' + colorscheme.name, Math.min(nodes.length + offset, typeMax[colorscheme.type]))
  if (colors) colors = colors.map(c => '#' + c)
  else colors = ['#999999']
  if (offset > 0) {
    if (colorscheme.subset === 'light') colors = colors.slice(0, colors.length - offset)
    if (colorscheme.subset === 'dark') colors = colors.slice(offset)
  }
  if (colorscheme.reverse) colors.reverse()
  return Object.assign({}, ...nodes.map((n, i) => ({ [n]: colors[i % colors.length] })))
}
