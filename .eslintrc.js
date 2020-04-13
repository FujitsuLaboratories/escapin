module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:prettier/recommended',
    'plugin:node/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier/@typescript-eslint',
  ],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
  },
  env: {
    node: true,
  },
  settings: {
    node: {
      tryExtensions: ['.ts', '.js', '.json', '.node'],
    },
  },
  rules: {
    'no-dupe-class-members': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'node/no-missing-import': 'error',
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-unpublished-import': 'off',
    'node/shebang': 'off',
  },
};
