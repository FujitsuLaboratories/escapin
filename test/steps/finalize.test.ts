import test from 'ava';
import step from '../../src/steps/finalize';
import { compare } from '../util';

test('test finalize', async t => {
  const before = `
const foo = \`hello, $\{'world'}\`;
const bar = \`hello, $\{world}\`;
  `;

  const after = `
const foo = 'hello, world';
const bar = \`hello, $\{world}\`;
`;

  await compare(t, before, after, step);
});
