module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:node/recommended',
  ],
  parserOptions: { ecmaVersion: 6, sourceType: 'module' },
  env: {
    es6: true,
  },
  rules: {
    'no-constant-condition': 'off',
    'no-undef': 'off',
    'no-unused-vars': 'off',
    'prefer-const': 'off',
    'node/no-extraneous-import': 'off',
    'node/no-missing-import': 'off',
    'node/no-unpublished-import': 'off',
    'node/no-unsupported-features/es-syntax': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/no-use-before-define': 'off',
  },
};
