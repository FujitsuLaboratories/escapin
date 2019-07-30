import test from 'ava';
import * as c from '../../src/util';
import step from '../../src/steps/asynchronize';
import { BaseState } from '../../src/state';
import { Escapin } from '../../src';
import { TypeDictionary } from '../../src/types';

test('test asynchronize', t => {
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
  func(arg, (err, p1, p2) => {
    if (err) {
      handleError(err);
      return;
    }
    doSomething(p1,p2);
  });
`;

  const astBefore = c.parse(before);

  const state = new BaseState();
  state.filename = 'test';
  state.code = before;
  state.ast = astBefore;
  state.escapin = new Escapin('test');
  state.escapin.types = new TypeDictionary();

  step(state);

  const astAfter = c.parse(after);

  t.deepEqual(c.purify(astBefore), c.purify(astAfter));
});
