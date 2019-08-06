// eslint-disable-next-line no-undef
module.exports = {
  reporter: ['text', 'test-lcov'],
  'temp-directory': './coverage/.nyc_output',
  all: true,
  sourceMap: true,
  instrument: true,
  extension: ['.ts'],
  include: ['src/**/*.ts'],
  exclude: ['**/*.d.ts', 'src/{cli,error}.ts'],
};
