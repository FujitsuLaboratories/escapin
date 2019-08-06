import test from 'ava';
import step from '../../src/steps/refineFunction';
import { compare } from '../util';

test('test function', async t => {
  const before = `
export const csvGET = (req) => {
  return 'hello';
}
  `;

  const after = `
export const csvGET = (req, context, callback) => {
  try {
    callback(null, 'hello');
    return;
  } catch (err) {
    callback(new Error(\`500: $\{err}\`));
  }
}
`;

  await compare(t, before, after, step);
});
