asyncFunc();

function func() {
  asyncFunc(1);
  asyncFunc(1);

  errorFirstCallbackFunc();
  const unused = errorFirstCallbackFunc(1);
  const data = errorFirstCallbackFunc(2);
  const { foo, bar } = errorFirstCallbackFunc(3);
  const { head, ...rest } = errorFirstCallbackFunc(4);

  generalCallbackFunc(1, arg => {
    asyncFunc(arg);
    generalFunc();
  });
  generalCallbackFunc(2, arg => {
    generalFunc();
  });
  generalCallbackFunc(3);
  const arr = [1, 2, 3];
  arr.map(i => asyncFunc(i, 4));
  arr.forEach(i => asyncFunc(i, 5));

  generalFunc(1, data);
  for (const item of items) {
    asyncFunc(item);
    generalFunc(2);
    if (cond) {
      continue;
    } else {
      break;
    }
  }
  foo.generalFunc(3);
}

function func2() {
  func();
}
const func3 = function () {
  func();
};
