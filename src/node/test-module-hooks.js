// @ts-nocheck

// cf https://nodejs.org/api/module.html#customization-hooks

const regexp = /\/\/ @test:spy\((.*)\)\n/g

export async function load (url, context, nextLoad) {
  const result = await nextLoad(url, context)
  if (result.format === 'module') {
    let source = result.source.toString()
    const matches = source.match(regexp)
    if (matches) {
      source = 'import { emit as __emitTestSpy } from "@data-fair/lib/node/test-spies.js"\n' + source
      source = source.replace(regexp, '__emitTestSpy($1)\n')
      result.source = source
    }
  }
  return result
}
