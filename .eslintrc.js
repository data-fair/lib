module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    // project: './tsconfig.json'
    project: require('path').join(__dirname, "tsconfig.json")
  },
  extends: ['standard-with-typescript'],
  env: {
    node: true // Enable Node.js global variables
  }
}
