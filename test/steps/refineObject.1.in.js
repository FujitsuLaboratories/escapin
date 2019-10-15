export const store = {};
store[id] = {
  foo,
  bar,
};
const foo = store[id2];
delete store[id3];
for (const key of Object.keys(store)) {
  const bar = store[key];
}
