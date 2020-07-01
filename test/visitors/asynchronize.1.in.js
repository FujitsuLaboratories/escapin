function func() {
  asyncFunc(1);
  const unused = errorFirstCallbackFunc(2);
  const data = errorFirstCallbackFunc(3);
  generalFunc(4, data);
  for (const item of items) {
    asyncFunc(5, item);
    generalFunc(6);
  }
  generalCallbackFunc(7, arg => {
    const data = asyncFunc(8, arg);
    generalFunc(9);
  });
  generalFunc(10);
  const { foo, bar } = errorFirstCallbackFunc(11);
  foo.generalFunc(12);
  const arr = [1, 2, 3];
  arr.map(i => asyncFunc(i, 13));
  arr.forEach(i => asyncFunc(i, 14));
  generalCallbackFunc(15, arg => {
    const data = errorFirstCallbackFunc(16);
  });
}
