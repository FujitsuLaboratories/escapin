import * as types from '../src/types';

test('test isX', () => {
  expect(types.isAsynchronous(types.asynchronous('test'))).toBeTruthy();
  expect(types.isErrorFirstCallback(types.errorFirstCallback('test'))).toBeTruthy();
  expect(types.isGeneralCallback(types.generalCallback('test'))).toBeTruthy();
  expect(types.isGeneral(types.general('test'))).toBeTruthy();
});
