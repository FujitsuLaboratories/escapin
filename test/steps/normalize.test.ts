import test from 'ava';
import step from '../../src/steps/normalize';
import { compare } from '../util';

test('test normalize', async t => {
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

  await compare(t, before, after, step);
});
