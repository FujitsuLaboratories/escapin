module.exports = {
  extends: ['eslint:recommended', 'plugin:prettier/recommended', 'plugin:node/recommended'],
  parserOptions: { ecmaVersion: 6, sourceType: 'module' },
  env: {
    es6: true,
  },
  rules: {
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'prefer-const': 'off',
    'node/no-missing-import': 'off',
    'node/no-missing-require': 'off',
    'node/no-unpublished-import': 'off',
    'node/no-unpublished-require': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-var-requires': 'off',
  },
};
