module.exports = {
  overrides: [
    {
      files: ['*.js', '*.ts'],
      options: {
        singleQuote: true,
        semi: true,
        trailingComma: 'all',
        printWidth: 100,
      },
    },
    {
      files: '*.json',
      options: {
        parser: 'json',
      },
    },
  ],
};
