import neostandard from 'neostandard'

export default [
  { ignores: ['types/*', '**/.type/', '**/*.vue.js', '**/*.d.ts'] },
  ...neostandard({ ts: true, noJsx: true }),
  {
    rules: {
      'no-undef': 'off' // taken care of by typescript
    }
  }
]
