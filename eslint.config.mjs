import neostandard from 'neostandard'
import jsdoc from 'eslint-plugin-jsdoc'

export default [
  { ignores: ['types/*', '**/.type/', 'eslint-plugin-vuetify/*'] },
  ...neostandard({ ts: true, noJsx: true }),
  jsdoc.configs['flat/recommended-typescript-flavor-error'],
  {
    rules: {
      'jsdoc/require-param-description': 0,
      'jsdoc/require-jsdoc': 0,
      'jsdoc/require-returns': 0,
      'jsdoc/require-returns-description': 0
    }
  }
]
