const a = 1,
  b = 2;
const c = 3;
if (a > 0) foo();
else bar();
if (a > 0) foo();
for (let i = 0; i < n; i++) foo(i);
for (const key in object) foo(object[key]);
for (const item of items) foo(item);
while (a > 0) console.log('test');
do foo('test');
while (a > 0);
const func = arg => foo(arg);
if (a > 0) {
  foo();
} else {
  bar();
}
if (a > 0) {
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
while (a > 0) {
  console.log('test');
}
do {
  foo('test');
} while (a > 0);
const func2 = arg => {
  return foo(arg);
};
