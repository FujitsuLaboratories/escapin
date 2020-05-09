module.exports = {
  exclude: ['src/cli.ts', 'src/error.ts'],
  extends: '@istanbuljs/nyc-config-typescript',
  include: ['src/**/*.ts'],
  reporter: ['lcov', 'text'],
};
