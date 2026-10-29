import neostandard from 'neostandard'

export default [
  { ignores: ['types/*', '**/.type/', '**/*.vue.js', '**/*.d.ts', 'packages/**/*.js', 'skills/'] },
  ...neostandard({ ts: true, noJsx: true }),
  {
    rules: {
      'no-undef': 'off' // taken care of by typescript
    }
  },
  {
    // server side code logs through @data-fair/lib-node/log.js
    files: ['packages/node/**/*.ts', 'packages/express/**/*.ts'],
    ignores: ['**/*.test.ts', '**/test-fixtures/**'],
    rules: {
      'no-console': 'error'
    }
  }
]
