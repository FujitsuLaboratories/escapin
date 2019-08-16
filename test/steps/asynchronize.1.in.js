function func() {
  asyncFunc(1);
  const unused = errorFirstCallbackFunc(2);
  const data = errorFirstCallbackFunc(3);
  generalFunc(4, data);
  for (const item of items) {
    asyncFunc(5, item);
    generalFunc(6);
  }
}
generalCallbackFunc(7, arg => {
  const data = asyncFunc(8, arg);
  generalFunc(9);
});
generalFunc(10);
