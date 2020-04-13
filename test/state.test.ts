import path from 'path';
import * as u from '../src/util';
import { BaseState } from '../src/state';
import { initialize } from './util';

test('test getPathInfo', () => {
  expect(new BaseState().getPathInfo('incomplete')).toBeUndefined();

  const escapin = initialize();
  const state = escapin.states['dummy.js'];
  expect(state.getPathInfo('handle')).toEqual({
    name: 'test-test',
    path: '/handle',
    method: 'get',
    consumes: ['application/json'],
    produces: [],
    parameters: [],
  });

  expect(state.getPathInfo('invalid')).toBeUndefined();
});

test('test pushProgramBody', () => {
  const escapin = initialize();
  const state = escapin.states['dummy.js'];
  state.ast = u.parse('');
  state.pushProgramBody(u.parse('hoge();').program.body[0]);
  expect(u.purify(state.ast)).toEqual(u.purify(u.parse('hoge();')));

  state.pushProgramBody(u.parse('piyo(); fuga();').program.body);
  expect(u.purify(state.ast)).toEqual(
    u.purify(u.parse('hoge(); piyo(); fuga();')),
  );
});

test('test unshiftProgramBody', () => {
  const escapin = initialize();
  const state = escapin.states['dummy.js'];
  state.ast = u.parse('');
  state.unshiftProgramBody(u.parse('hoge();').program.body[0]);
  expect(u.purify(state.ast)).toEqual(u.purify(u.parse('hoge();')));

  state.unshiftProgramBody(u.parse('piyo(); fuga();').program.body);
  expect(u.purify(state.ast)).toEqual(
    u.purify(u.parse('piyo(); fuga(); hoge();')),
  );
});

test('test resolvePath', () => {
  const escapin = initialize();
  const state = escapin.states['dummy.js'];
  expect(state.resolvePath('src/index.ts')).toBe(path.resolve('src/index.ts'));
  expect(state.resolvePath('jest.config')).toBe(path.resolve('jest.config.js'));
  expect(state.resolvePath('invalid')).toBeUndefined();
});

test('test hasDependency', () => {
  expect(new BaseState().hasDependency('hoge')).toBeFalsy();

  const escapin = initialize();
  const state = escapin.states['dummy.js'];
  escapin.packageJson.dependencies['hoge'] = 'latest';
  expect(state.hasDependency('fs')).toBeTruthy();
  expect(state.hasDependency('hoge')).toBeTruthy();
  expect(state.hasDependency('piyo')).toBeFalsy();
});
