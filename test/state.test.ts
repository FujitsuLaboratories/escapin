import test from 'ava';
import path from 'path';
import * as u from '../src/util';
import { BaseState } from '../src/state';
import { initializeState } from './util';

test('test getPathInfo', t => {
  t.is(new BaseState().getPathInfo('incomplete'), undefined);

  const state = initializeState();
  t.deepEqual(state.getPathInfo('csvGET'),  {
    name: 'test-test',
    path: '/csv',
    method: 'get',
    consumes: ['application/json'],
    produces: [],
    parameters: [],
  });

  t.is(state.getPathInfo('invalid'), undefined);
});

test('test pushProgramBody', t => {
  const state = initializeState();
  state.ast = u.parse('');
  state.pushProgramBody(u.parse('hoge();').program.body[0]);
  t.deepEqual(u.purify(state.ast), u.purify(u.parse("hoge();")));

  state.pushProgramBody(u.parse("piyo(); fuga();").program.body);
  t.deepEqual(u.purify(state.ast), u.purify(u.parse("hoge(); piyo(); fuga();")));
});

test('test unshiftProgramBody', t => {
  const state = initializeState();
  state.ast = u.parse('');
  state.unshiftProgramBody(u.parse('hoge();').program.body[0]);
  t.deepEqual(u.purify(state.ast), u.purify(u.parse("hoge();")));

  state.unshiftProgramBody(u.parse("piyo(); fuga();").program.body);
  t.deepEqual(u.purify(state.ast), u.purify(u.parse("piyo(); fuga(); hoge();")));
});

test('test resolvePath', t => {
  const state = initializeState();
  t.is(state.resolvePath('src/index.ts'), path.resolve('src/index.ts'));
  t.is(state.resolvePath('ava.config'), path.resolve('ava.config.js'));
  t.is(state.resolvePath('invalid'), undefined);
});

test('test hasDependency', t => {
  t.is(new BaseState().hasDependency('hoge'), false);

  const state = initializeState();
  state.escapin.packageJson.dependencies['hoge'] = 'latest';
  t.is(state.hasDependency('fs'), true);
  t.is(state.hasDependency('hoge'), true);
  t.is(state.hasDependency('piyo'), false);
});