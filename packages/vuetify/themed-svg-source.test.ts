import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { themeSvgSource } from './themed-svg-source.js'

const light = { primary: '#1976D2', secondary: '#81D4FA', error: '#D50000', 'text-accent': '#283593', surface: '#FFFFFF', 'on-surface': '#424242' }
const dark = { ...light, 'text-accent': '#C5CAE9', surface: '#424242', 'on-surface': '#FFFFFF' }

describe('themeSvgSource', () => {
  it('replaces accents, inks and red with theme colors', () => {
    const svg = '<path fill="#68e1fd"/><path fill="#FFD200"/><path fill="#24285b"/><path fill="#FF5252"/>'
    assert.equal(themeSvgSource(svg, dark), '<path fill="#1976D2"/><path fill="#81D4FA"/><path fill="#C5CAE9"/><path fill="#D50000"/>')
  })

  it('keeps greys in the default light theme and lightens them on a dark surface', () => {
    assert.equal(themeSvgSource('fill="#e6e6e6"', light), 'fill="#e6e6e6"')
    assert.equal(themeSvgSource('fill="#e6e6e6"', dark), 'fill="#5b5b5b"')
    assert.equal(themeSvgSource('fill="#ccc"', dark), 'fill="#757575"')
  })

  it('never replaces a color that comes from the theme', () => {
    assert.equal(themeSvgSource('fill="#68E1FD"', { ...dark, primary: '#E6E6E6' }), 'fill="#E6E6E6"')
  })

  it('falls back to on-surface without text-accent, keeps unknown colors', () => {
    const { 'text-accent': _, ...colors } = dark
    assert.equal(themeSvgSource('fill="#2F2E41" fill="#F4A28C"', colors), 'fill="#FFFFFF" fill="#F4A28C"')
  })
})
