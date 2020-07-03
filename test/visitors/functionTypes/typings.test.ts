import { expect } from 'chai';
import { getTypings } from '../../../src/visitors/functionTypes/typings';

describe('getTypings()', function () {
  this.timeout(0);

  it('should return typing names', () => {
    expect(getTypings(['request', 'axios', '@babel/traverse'])).to.eql([
      '@types/request',
      '@types/babel__traverse',
    ]);
  });
});
