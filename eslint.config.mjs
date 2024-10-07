import neostandard from 'neostandard'

export default [
  { ignores: ['types/*', '**/.type/', 'eslint-plugin-vuetify/*'] },
  ...neostandard({ ts: true, noJsx: true })
]
