import { describe, it } from 'node:test'
import { strict as assert } from 'assert'
import { Marked } from 'marked'
import { createMarkedVuetify, type MarkedVuetifyOptions } from '@data-fair/lib-utils/marked-vuetify.js'

const render = (markdown: string, options?: MarkedVuetifyOptions) =>
  new Marked(createMarkedVuetify(options)).parse(markdown, { async: false })

const table = `
| a | b |
| - | - |
| 1 | 2 |
`

describe('marked-vuetify tables', () => {
  it('should render the vuetify table markup', () => {
    const html = render(table)
    assert.match(html, /<div class="v-table[^"]*">\s*<div class="v-table__wrapper">\s*<table>/)
    assert.match(html, /<th>a<\/th>/)
    assert.match(html, /<td>2<\/td>/)
  })

  it('should ask for horizontal gridlines explicitly', () => {
    // since vuetify 4.1 the row separators live behind this modifier (VTable sets it
    // through its `gridlines` prop, which defaults to 'horizontal'), so handwritten
    // markup renders borderless without it
    assert.match(render(table), /class="[^"]*\bv-table--gridlines-horizontal\b/)
  })

  it('should mark the table for markdown specific styles', () => {
    assert.match(render(table), /class="[^"]*\bmarkdown-table\b/)
  })

  it('should apply the density', () => {
    assert.match(render(table), /\bv-table--density-comfortable\b/)
    assert.match(render(table, { density: 'compact' }), /\bv-table--density-compact\b/)
  })
})

describe('marked-vuetify headings', () => {
  it('should render headings one level down', () => {
    assert.match(render('# title'), /<h2 class="[^"]*">title<\/h2>/)
    assert.match(render('###### title'), /<h7 class="[^"]*">title<\/h7>/)
  })

  it('should only use typography classes that exist in vuetify 4', () => {
    // the legacy scale (text-h1..text-h6, text-subtitle-*, text-body-1/2) was dropped
    // when vuetify 4 moved to MD3 typography
    for (const density of ['default', 'comfortable', 'compact'] as const) {
      const html = render('# 1\n## 2\n### 3\n#### 4\n##### 5\n###### 6', { density })
      assert.doesNotMatch(html, /\btext-(h[1-6]|subtitle-[12]|body-[12])\b/, `density ${density}`)
      assert.match(html, /\btext-display-medium\b|\btext-headline-large\b/, `density ${density}`)
    }
  })

  it('should let the caller override heading classes', () => {
    const html = render('# title', { headingClasses: { 1: 'text-title-large' } })
    assert.match(html, /<h2 class="text-title-large">title<\/h2>/)
  })
})

describe('marked-vuetify divider', () => {
  it('should not pin the divider to the light theme', () => {
    const html = render('---')
    assert.match(html, /<hr class="v-divider"/)
    assert.doesNotMatch(html, /v-theme--/)
  })
})
