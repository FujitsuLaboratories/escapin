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
  generalCallbackFunc(7, () => {
    let _temp;

    let _done = false;
    (async arg => {
      const _data2 = await asyncFunc(8, arg);

      generalFunc(9);
    })().then(_data3 => {
      _temp = _data3;
      _done = true;
    });
    deasync.loopWhile(_ => !_done);
    return _temp;
  });
  generalFunc(10);
  await new Promise((resolve, reject) => {
    errorFirstCallbackFunc(11, (err, foo, bar) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          foo,
          bar,
        });
      }
    });
  });
  foo.generalFunc(12);
  const arr = [1, 2, 3];
  await Promise.all(arr.map(async i => await asyncFunc(i, 13)));
  arr.forEach(async i => await asyncFunc(i, 14));
  generalCallbackFunc(15, () => {
    let _temp2;

    let _done2 = false;
    (async arg => {
      await new Promise((resolve, reject) => {
        errorFirstCallbackFunc(16, (err, _data2) => {
          if (err) {
            reject(err);
          } else {
            resolve(_data2);
          }
        });
      });
    })().then(_data6 => {
      _temp2 = _data6;
      _done2 = true;
    });
    deasync.loopWhile(_ => !_done2);
    return _temp2;
  });
}
