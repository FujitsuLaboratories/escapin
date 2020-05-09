import { expect } from 'chai';
import path from 'path';
import * as u from '../src/util';
import { BaseState } from '../src/state';
import { initialize } from './util';

describe('state', function () {
  const escapin = initialize();
  const state = escapin.states['dummy.js'];

  describe('getPathInfo()', () => {
    it('should return path info for valid path', () => {
      expect(state.getPathInfo('handle')).to.eql({
        name: 'test-test',
        path: '/handle',
        method: 'get',
        consumes: ['application/json'],
        produces: [],
        parameters: [],
      });
    });

    it('should return undefined for invalid path', () => {
      expect(state.getPathInfo('invalid')).to.be.undefined;
    });
  });

  describe('pushProgramBody()', () => {
    it('should push the given statement into the program body', () => {
      state.ast = u.parse('');
      state.pushProgramBody(u.parse('hoge();').program.body[0]);
      expect(u.purify(state.ast)).to.eql(u.purify(u.parse('hoge();')));

      state.pushProgramBody(u.parse('piyo(); fuga();').program.body);
      expect(u.purify(state.ast)).to.eql(
        u.purify(u.parse('hoge(); piyo(); fuga();')),
      );
    });
  });

  describe('unshiftProgramBody()', () => {
    it('should unshift the given statement into the program body', () => {
      state.ast = u.parse('');
      state.unshiftProgramBody(u.parse('hoge();').program.body[0]);
      expect(u.purify(state.ast)).to.eql(u.purify(u.parse('hoge();')));

      state.unshiftProgramBody(u.parse('piyo(); fuga();').program.body);
      expect(u.purify(state.ast)).to.eql(
        u.purify(u.parse('piyo(); fuga(); hoge();')),
      );
    });
  });

  describe('resolvePath()', () => {
    it('should resolve relative path', () => {
      expect(state.resolvePath('src/index.ts')).to.equal(
        path.resolve('src/index.ts'),
      );
    });

    it('should resolve relative path not having extension', () => {
      expect(state.resolvePath('release.config')).to.equal(
        path.resolve('release.config.js'),
      );
    });

    it('should resolve relative path not having extension', () => {
      expect(state.resolvePath('invalid')).to.be.undefined;
    });
  });

  describe('hasDependency', () => {
    it('should return false for invalid module name', () => {
      expect(state.hasDependency('invalid')).to.be.false;
    });

    it('should return true for module in dependencies', () => {
      escapin.packageJson.dependencies['hoge'] = 'latest';
      expect(state.hasDependency('hoge')).to.be.true;
    });
    it('should return true for built-in module', () => {
      expect(state.hasDependency('fs')).to.be.true;
    });
  });
});
