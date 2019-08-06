import test from 'ava';
import step1 from '../../src/steps/functionTypes';
import step2 from '../../src/steps/asynchronize';
import { compare } from '../util';

test.serial('test asynchronize', async t => {
  const before = `
function func() {
  asyncFunc();
  const data = errorFirstCallbackFunc(arg);
}
generalCallbackFunc(arg => {
  const data = asyncFunc(arg);
  doSomething();
});
generalFunc();
`;

  const after = `
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
`;

  await compare(t, before, after, step1, step2);
});
