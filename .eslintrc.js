module.exports = {
  extends: [
    'eslint:recommended',
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
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/naming-convention': [
      'error',
      {
        selector: 'default',
        format: ['camelCase', 'snake_case', 'UPPER_CASE'],
        leadingUnderscore: 'allow',
      },

      {
        selector: 'memberLike',
        format: ['camelCase', 'snake_case', 'PascalCase'],
        leadingUnderscore: 'allow',
      },

      {
        selector: 'typeLike',
        format: ['PascalCase'],
      },
    ],
    '@typescript-eslint/no-unused-vars': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
    'node/no-missing-import': 'error',
    'node/no-unsupported-features/es-syntax': 'off',
    'node/no-unpublished-import': 'off',
    'node/shebang': 'off',
  },
};
