import test from 'ava';
import * as c from '../../src/util';
import step from '../../src/steps/normalize';
import { BaseState } from '../../src/state';

test('test normalize', t => {
  const before = `
const a = 1, b = 2;
const c = 3;
if (true) foo(); else bar();
if (true) foo();
for (let i = 0; i < n; i++)
  foo(i);
for (const key in object)
  foo(object[key]);
for (const item of items)
  foo(item);
while (true) console.log('test');
do foo('test'); while (true);
const func = arg => foo(arg);
if (true) {
  foo();
} else {
  bar();
}
if (true) {
  foo();
}
for (let i = 0; i < n; i++) {
  foo(i);
}
for (const key in object) {
  foo(object[key]);
}
for (const item of items) {
  foo(item);
}
while (true) {
  console.log('test');
}
do {
  foo('test');
} while (true);
const func2 = arg => { return foo(arg); }
`;

  const after = `
  const a = 1;
  const b = 2;
  const c = 3;
  if (true) {
    foo();
  } else {
    bar();
  }
  if (true) {
    foo();
  }
  for (let i = 0; i < n; i++) {
    foo(i);
  }
  for (const key in object) {
    foo(object[key]);
  }
  for (const item of items) {
    foo(item);
  }
  while (true) {
    console.log('test');
  }
  do {
    foo('test');
  } while (true);
  const func = arg => { return foo(arg); }
  if (true) {
    foo();
  } else {
    bar();
  }
  if (true) {
    foo();
  }
  for (let i = 0; i < n; i++) {
    foo(i);
  }
  for (const key in object) {
    foo(object[key]);
  }
  for (const item of items) {
    foo(item);
  }
  while (true) {
    console.log('test');
  }
  do {
    foo('test');
  } while (true);
  const func2 = arg => { return foo(arg); }
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
