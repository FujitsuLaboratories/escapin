import deasync from 'deasync';
asyncFunc();

async function func() {
  await asyncFunc(1);
  await asyncFunc(1);
  await new Promise((resolve, reject) => {
    errorFirstCallbackFunc(err => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
  await new Promise((resolve, reject) => {
    errorFirstCallbackFunc(1, (err, unused) => {
      if (err) {
        reject(err);
      } else {
        resolve(unused);
      }
    });
  });

  const _data2 = await new Promise((resolve, reject) => {
    errorFirstCallbackFunc(2, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });

  await new Promise((resolve, reject) => {
    errorFirstCallbackFunc(3, (err, foo, bar) => {
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
  await new Promise((resolve, reject) => {
    errorFirstCallbackFunc(4, (err, head, ...rest) => {
      if (err) {
        reject(err);
      } else {
        resolve({
          head,
          ...rest,
        });
      }
    });
  });
  generalCallbackFunc(1, () => {
    let _temp;

    let _done = false;
    (async arg => {
      await asyncFunc(arg);
      generalFunc();
    })().then(_data5 => {
      _temp = _data5;
      _done = true;
    });
    deasync.loopWhile(_ => !_done);
    return _temp;
  });
  generalCallbackFunc(2, arg => {
    generalFunc();
  });
  generalCallbackFunc(3);
  const arr = [1, 2, 3];
  await Promise.all(arr.map(async i => await asyncFunc(i, 4)));
  arr.forEach(async i => await asyncFunc(i, 5));
  generalFunc(1, _data2);
  let _promise = [];

  for (const _item of items) {
    _promise.push(
      (async () => {
        await asyncFunc(_item);
        generalFunc(2);

        if (cond) {
          return;
        } else {
          return;
        }
      })(),
    );
  }

  await Promise.all(_promise);
  foo.generalFunc(3);
}

async function func2() {
  await func();
}

const func3 = async function () {
  await func();
};
