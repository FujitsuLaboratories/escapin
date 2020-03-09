// eslint-disable-next-line no-undef
module.exports = {
  '*.{ts,js,json}': ['prettier --write', 'eslint --fix --cache'],
  '*.{yaml,yml,md}': 'prettier --write',
};
