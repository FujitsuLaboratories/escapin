import deasync from 'deasync';

async function func() {
  await asyncFunc(1);
  await new Promise((resolve, reject) => {
    errorFirstCallbackFunc(2, (err, unused) => {
      if (err) {
        reject(err);
      } else {
        resolve(unused);
      }
    });
  });

  const _data2 = await new Promise((resolve, reject) => {
    errorFirstCallbackFunc(3, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  generalFunc(4, _data2);
  let _promise = [];

  for (const _item of items) {
    _promise.push(
      (async () => {
        await asyncFunc(5, _item);
        generalFunc(6);
      })(),
    );
  }

  await Promise.all(_promise);
}

generalCallbackFunc(7, arg => {
  const data = (() => {
    let _temp;

    let _done = false;
    asyncFunc(8, arg).then(_data3 => {
      _temp = _data3;
      _done = true;
    });
    deasync.loopWhile(_ => !_done);
    return _temp;
  })();

  generalFunc(9);
});
generalFunc(10);
