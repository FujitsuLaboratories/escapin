module.exports = {
  extends: ['eslint:recommended', 'plugin:prettier/recommended', 'plugin:node/recommended'],
  plugins: ['@typescript-eslint'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    project: './tsconfig.json',
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
    'node/no-missing-import': 'error',
    'node/no-unpublished-import': 'off',
    'node/shebang': 'off',
  },
};
