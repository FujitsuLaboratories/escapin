import test from 'ava';
import * as types from '../src/types';

test('test isX', t => {
  t.truthy(types.isAsynchronous(types.asynchronous('test')));
  t.truthy(types.isErrorFirstCallback(types.errorFirstCallback('test')));
  t.truthy(types.isGeneralCallback(types.generalCallback('test')));
  t.truthy(types.isGeneral(types.general('test')));
});
