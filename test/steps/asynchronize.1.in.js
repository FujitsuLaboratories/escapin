function func() {
  asyncFunc();
  const data = errorFirstCallbackFunc(arg);
}
generalCallbackFunc(arg => {
  const data = asyncFunc(arg);
  doSomething();
});
generalFunc();
