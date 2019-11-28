module.exports = {
  extends: ['eslint:recommended', 'plugin:prettier/recommended', 'plugin:node/recommended'],
  parserOptions: { ecmaVersion: 6, sourceType: 'module' },
  env: {
    es6: true,
  },
  rules: {
    'no-constant-condition': 'off',
    'no-unused-vars': 'off',
    'no-undef': 'off',
    'node/no-extraneous-import': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
    'prettier/prettier': 'off',
  },
};
