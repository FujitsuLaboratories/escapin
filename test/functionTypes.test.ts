import * as t from '../src/types';

test('test isX', () => {
  expect(t.isAsynchronous(t.asynchronous('test'))).toBeTruthy();
  expect(t.isErrorFirstCallback(t.errorFirstCallback('test'))).toBeTruthy();
  expect(t.isGeneralCallback(t.generalCallback('test'))).toBeTruthy();
  expect(t.isGeneral(t.general('test'))).toBeTruthy();
});
