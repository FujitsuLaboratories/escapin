import test from 'ava';
import step from '../../src/steps/uncallbackify';
import { compare } from '../util';

test('test uncallbackify', async t => {
  const before = `
func(arg, (err, p1, p2) => {
  if (err) {
    handleError(err);
    return;
  }
  doSomething(p1,p2);
});
`;

  const after = `
try {
  const { p1, p2 } = func(arg);
  doSomething(p1, p2);
} catch (err) {
  handleError(err);
}
`;

  await compare(t, before, after, step);
});
