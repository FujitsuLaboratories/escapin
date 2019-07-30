import test from 'ava';
import * as c from '../../src/util';
import step from '../../src/steps/finalize';
import { BaseState } from '../../src/state';

test('test finalize', t => {
  const before = `
const foo = \`hello, $\{'world'}\`;
const bar = \`hello, $\{world}\`;
  `;

  const after = `
const foo = 'hello, world';
const bar = \`hello, $\{world}\`;
`;

  const astBefore = c.parse(before);

  const state = new BaseState();
  state.filename = 'test';
  state.code = before;
  state.ast = astBefore;

  step(state);

  const astAfter = c.parse(after);

  t.deepEqual(c.purify(astBefore), c.purify(astAfter));
});
