// import { transform } from '@babel/core';
// import fs from 'fs';
import test from 'ava';
import * as c from '../../src/util';
import step from '../../src/steps/uncallbackify';
import { BaseState } from '../../src/state';

test('test uncallbackify', t => {
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

  const astBefore = c.parse(before);

  const state = new BaseState();
  state.filename = 'test';
  state.code = before;
  state.ast = astBefore;

  step(state);

  const astAfter = c.parse(after);

  t.deepEqual(c.purify(astBefore), c.purify(astAfter));
});
