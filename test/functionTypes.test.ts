import { expect } from 'chai';
import * as t from '../src/types';

describe('isAsynchronous()', () => {
  it('should return true for asynchronous function', () => {
    expect(t.isAsynchronous(t.asynchronous('test'))).to.be.true;
  });
});

describe('isErrorFirstCallback()', () => {
  it('should return true for error-first-callback function', () => {
    expect(t.isErrorFirstCallback(t.errorFirstCallback('test'))).to.be.true;
  });
});

describe('isGeneralCallback()', () => {
  it('should return true for general-callback function', () => {
    expect(t.isGeneralCallback(t.generalCallback('test'))).to.be.true;
  });
});

describe('isGeneral()', () => {
  it('should return true for general function', () => {
    expect(t.isGeneral(t.general('test'))).to.be.true;
  });
});
