import deasync from 'deasync';

async function func() {
  await asyncFunc();
  await new Promise((resolve, reject) => {
    errorFirstCallbackFunc(arg, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
}
generalCallbackFunc(arg => {
  const data = (() => {
    let _temp;

    let _done = false;
    asyncFunc(arg).then(_data2 => {
      _temp = _data2;
      _done = true;
    });
    deasync.loopWhile(_ => !_done);
    return _temp;
  })();
  doSomething();
});
generalFunc();
